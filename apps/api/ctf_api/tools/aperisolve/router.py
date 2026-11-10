"""AperiSolve HTTP API: upload a file, stream each analyzer's result as it finishes.

POST /api/aperisolve/analyze (multipart: file, password?, deep?) returns NDJSON:
    {"event": "start",  "id", "file": {name, size, mime, kind, tags}, "analyzers": [...]}
    {"event": "result", "analyzer": name, "result": {...}, "duration_ms"}   (one per analyzer)
    {"event": "done",   "duration_ms"}
GET /api/aperisolve/results/{id}/{name} serves generated images and archives.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import shutil
import time
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse

from ctf_api.core.sandbox import save_upload
from ctf_api.tools.aperisolve import filetype, store
from ctf_api.tools.aperisolve.analyzers import ANALYZERS, Analyzer, Context

router = APIRouter(tags=["aperisolve"])

MAX_UPLOAD_BYTES = int(os.getenv("APERISOLVE_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
# Each analysis runs ~13 tools at once; cap how many analyses run together.
_slots = asyncio.Semaphore(int(os.getenv("APERISOLVE_MAX_CONCURRENT_ANALYSES", "3")))
_SAFE_SUFFIX = re.compile(r"^\.[A-Za-z0-9]{1,5}$")


def _event(payload: dict) -> bytes:
    return (json.dumps(payload, separators=(",", ":")) + "\n").encode()


def _run(analyzer: Analyzer, ctx: Context) -> dict:
    started = time.monotonic()
    ctx.work.mkdir(mode=0o700)
    result = analyzer.execute(ctx)
    return {"event": "result", "analyzer": analyzer.name, "result": result,
            "duration_ms": int((time.monotonic() - started) * 1000)}


@router.post("/api/aperisolve/analyze")
async def analyze(
    file: UploadFile,
    password: str = Form("", max_length=256),
    deep: bool = Form(False),
) -> StreamingResponse:
    await run_in_threadpool(store.purge)
    analysis = store.Analysis()
    work = analysis.dir / ".work"
    work.mkdir(mode=0o700)
    original_name = Path(file.filename or "upload").name[:200] or "upload"
    suffix = Path(original_name).suffix
    upload = work / f"input{suffix if _SAFE_SUFFIX.match(suffix) else ''}"
    try:
        size = await save_upload(file, upload, MAX_UPLOAD_BYTES)
        if size == 0:
            raise HTTPException(status_code=400, detail="The file is empty.")
        upload.chmod(0o400)
        detected = await run_in_threadpool(filetype.detect, upload, original_name)
    except BaseException:
        shutil.rmtree(analysis.dir, ignore_errors=True)
        raise

    selected = [analyzer for analyzer in ANALYZERS if analyzer.applies(detected.tags, deep)]

    async def stream() -> AsyncIterator[bytes]:
        started = time.monotonic()
        tasks: list[asyncio.Task] = []
        try:
            yield _event({
                "event": "start", "id": analysis.id,
                "file": {"name": original_name, "size": size, **detected.to_dict()},
                "analyzers": [{"name": a.name, "order": a.order, "available": a.available()} for a in selected],
            })
            async with _slots:
                tasks = [asyncio.create_task(run_in_threadpool(
                    _run, analyzer, Context(input=upload, work=work / analyzer.name, analysis=analysis,
                                            original_name=original_name, password=password)))
                         for analyzer in selected]
                for finished in asyncio.as_completed(tasks):
                    yield _event(await finished)
            yield _event({"event": "done", "duration_ms": int((time.monotonic() - started) * 1000)})
        finally:
            for task in tasks:
                task.cancel()
            # Scratch space goes now; published images/archives stay until the TTL.
            shutil.rmtree(work, ignore_errors=True)

    return StreamingResponse(stream(), media_type="application/x-ndjson", headers={"cache-control": "no-store"})


@router.get("/api/aperisolve/results/{analysis_id}/{name}")
def result_file(analysis_id: str, name: str) -> FileResponse:
    return store.serve(analysis_id, name)
