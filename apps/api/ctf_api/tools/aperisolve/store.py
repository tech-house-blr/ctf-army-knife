"""Short-lived storage for generated files (bit-plane images, extracted archives).

Nothing is kept long-term: each analysis gets a random ID directory, and
directories older than the TTL, or beyond the newest MAX_ANALYSES, are deleted
whenever a new analysis starts. Files are only served by exact, validated name.
"""
from __future__ import annotations

import os
import re
import secrets
import shutil
import tempfile
import time
import zipfile
from pathlib import Path

from fastapi import HTTPException
from fastapi.responses import FileResponse

RESULTS_DIR = Path(os.getenv("APERISOLVE_RESULTS_DIR") or Path(tempfile.gettempdir()) / "aperisolve-results")
TTL_SECONDS = int(os.getenv("APERISOLVE_RESULT_TTL_SECONDS", "1800"))
MAX_ANALYSES = int(os.getenv("APERISOLVE_MAX_STORED_ANALYSES", "50"))
MAX_ARCHIVE_BYTES = int(os.getenv("APERISOLVE_MAX_ARCHIVE_BYTES", str(200 * 1024 * 1024)))
MAX_ARCHIVE_FILES = int(os.getenv("APERISOLVE_MAX_ARCHIVE_FILES", "2000"))

URL_PREFIX = "/api/aperisolve/results"
_ID_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")
_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")


class Analysis:
    """Output directory for one analysis run."""

    def __init__(self) -> None:
        self.id = secrets.token_urlsafe(18)
        self.dir = RESULTS_DIR / self.id
        self.dir.mkdir(parents=True, mode=0o700)

    def path(self, name: str) -> Path:
        if not _NAME_RE.match(name):
            raise ValueError(f"Unsafe result file name: {name!r}")
        return self.dir / name

    def url(self, name: str) -> str:
        return f"{URL_PREFIX}/{self.id}/{name}"

    def archive(self, source: Path, name: str) -> tuple[str | None, int]:
        """Zip regular files under `source` into <name>.zip. Returns (url, file count).

        Symlinks and special files are skipped, never followed: an extracted
        filesystem image can contain links to server files like /etc/passwd.
        """
        files: list[tuple[Path, str]] = []
        total = 0
        for root, dirs, filenames in os.walk(source, followlinks=False):
            dirs[:] = [d for d in dirs if not (Path(root) / d).is_symlink()]
            for filename in filenames:
                file = Path(root) / filename
                if file.is_symlink() or not file.is_file():
                    continue
                total += file.stat().st_size
                if len(files) >= MAX_ARCHIVE_FILES or total > MAX_ARCHIVE_BYTES:
                    break
                files.append((file, file.relative_to(source).as_posix()))
        if not files:
            return None, 0
        archive_name = f"{name}.zip"
        with zipfile.ZipFile(self.path(archive_name), "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for file, arcname in files:
                archive.write(file, arcname)
        return self.url(archive_name), len(files)


def purge() -> None:
    """Delete expired analyses, then the oldest beyond MAX_ANALYSES."""
    if not RESULTS_DIR.exists():
        return
    entries = sorted((p for p in RESULTS_DIR.iterdir() if p.is_dir() and _ID_RE.match(p.name)),
                     key=lambda p: p.stat().st_mtime, reverse=True)
    now = time.time()
    for index, entry in enumerate(entries):
        if index >= MAX_ANALYSES or now - entry.stat().st_mtime > TTL_SECONDS:
            shutil.rmtree(entry, ignore_errors=True)


def serve(analysis_id: str, name: str) -> FileResponse:
    if not _ID_RE.match(analysis_id) or not _NAME_RE.match(name):
        raise HTTPException(status_code=404, detail="Not found.")
    path = RESULTS_DIR / analysis_id / name
    if path.is_symlink() or not path.is_file() or time.time() - path.stat().st_mtime > TTL_SECONDS:
        raise HTTPException(status_code=404, detail="Result expired or not found.")
    if name.endswith(".zip"):
        return FileResponse(path, media_type="application/zip", filename=name)
    return FileResponse(path, media_type="image/png", headers={"cache-control": "private, max-age=1800"})
