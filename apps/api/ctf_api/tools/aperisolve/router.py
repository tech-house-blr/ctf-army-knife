"""AperiSolve HTTP API: upload a file, stream each analyzer's result as it finishes.

POST /api/aperisolve/analyze (multipart: file, password?, deep?) returns NDJSON:
    {"event": "start",  "id", "file": {name, size, mime, kind, tags}, "analyzers": [...]}
    {"event": "result", "analyzer": name, "result": {...}, "duration_ms"}   (one per analyzer)
    {"event": "done",   "duration_ms"}
GET /api/aperisolve/results/{id}/{name} serves generated images and archives.
GET /api/aperisolve/config returns limits the web UI should enforce up front.

Each analysis runs in its own task, decoupled from the HTTP response. If the
client disconnects, running tools are killed, but the concurrency slot is only
released once every analyzer thread has really finished.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import threading
import time
from collections.abc import AsyncIterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, StreamingResponse

from ctf_api.core.sandbox import remove_tree, save_upload
from ctf_api.tools.aperisolve import filetype, store
from ctf_api.tools.aperisolve.analyzers import ANALYZERS, Analyzer, Context

router = APIRouter(tags=["aperisolve"])

MAX_UPLOAD_BYTES = int(os.getenv("APERISOLVE_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))
# Each analysis runs ~13 tools at once; cap how many analyses run together.
MAX_CONCURRENT_ANALYSES = int(os.getenv("APERISOLVE_MAX_CONCURRENT_ANALYSES", "3"))
_slots = asyncio.Semaphore(MAX_CONCURRENT_ANALYSES)
# Analyzer threads get their own pool, sized so a full set of analyses never
# waits for a thread, and never starves the shared threadpool that serves
# result images and other sync endpoints.
_executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_ANALYSES * len(ANALYZERS),
                               thread_name_prefix="aperisolve")
_runners: set[asyncio.Task] = set()  # keep running analyses referenced until they finish
_SAFE_SUFFIX = re.compile(r"^\.[A-Za-z0-9]{1,5}$")


def _event(payload: dict) -> bytes:
    return (json.dumps(payload, separators=(",", ":")) + "\n").encode()


def _run(analyzer: Analyzer, ctx: Context) -> dict:
    """Run one analyzer in a worker thread. Never raises."""
    started = time.monotonic()
    if ctx.cancel.is_set():
        result = {"status": "error", "error": "Cancelled."}
    else:
        try:
            ctx.work.mkdir(mode=0o700)
            result = analyzer.execute(ctx)
        except OSError:
            result = {"status": "error", "error": "Could not create a workspace for this tool."}
    return {"event": "result", "analyzer": analyzer.name, "result": result,
            "duration_ms": int((time.monotonic() - started) * 1000)}


async def _run_analysis(contexts: list[tuple[Analyzer, Context]], work: Path, analysis: store.Analysis,
                        cancel: threading.Event, events: asyncio.Queue) -> None:
    """Run every analyzer, putting result events on `events`, then None."""
    try:
        async with _slots:
            if not cancel.is_set():
                loop = asyncio.get_running_loop()
                futures = [loop.run_in_executor(_executor, _run, analyzer, ctx) for analyzer, ctx in contexts]
                for finished in asyncio.as_completed(futures):
                    await events.put(await finished)
            # Scratch space goes now; published images/archives stay until the TTL.
            await run_in_threadpool(remove_tree, work)
    finally:
        analysis.finish()
        await events.put(None)


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
        analysis.finish()
        remove_tree(analysis.dir)
        raise

    selected = [analyzer for analyzer in ANALYZERS if analyzer.applies(detected.tags, deep)]
    cancel = threading.Event()
    contexts = [(analyzer, Context(input=upload, work=work / analyzer.name, analysis=analysis,
                                   original_name=original_name, password=password, cancel=cancel))
                for analyzer in selected]

    async def stream() -> AsyncIterator[bytes]:
        started = time.monotonic()
        events: asyncio.Queue = asyncio.Queue()
        runner = asyncio.create_task(_run_analysis(contexts, work, analysis, cancel, events))
        _runners.add(runner)
        runner.add_done_callback(_runners.discard)
        try:
            yield _event({
                "event": "start", "id": analysis.id,
                "file": {"name": original_name, "size": size, **detected.to_dict()},
                "analyzers": [{"name": a.name, "order": a.order, "available": a.available()} for a in selected],
            })
            while (event := await events.get()) is not None:
                yield _event(event)
            await runner  # surface an unexpected failure instead of claiming success
            yield _event({"event": "done", "duration_ms": int((time.monotonic() - started) * 1000)})
        finally:
            # Normal end: a no-op. Client gone: kill running tools. The runner
            # keeps the slot until its threads finish, then cleans up.
            cancel.set()

    return StreamingResponse(stream(), media_type="application/x-ndjson", headers={"cache-control": "no-store"})


@router.get("/api/aperisolve/config")
def config() -> dict:
    return {"max_upload_bytes": MAX_UPLOAD_BYTES}


@router.get("/api/aperisolve/results/{analysis_id}/{name}")
def result_file(analysis_id: str, name: str) -> FileResponse:
    return store.serve(analysis_id, name)
