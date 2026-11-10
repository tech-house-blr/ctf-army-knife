"""Detect what an upload is, to decide which analyzers apply.

Adapted from AperiSolve's aperisolve/filetype.py (see NOTICE). Detection is
best-effort and never raises: libmagic via `file`, then Pillow, then the file
extension, then application/octet-stream.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, UnidentifiedImageError

from ctf_api.core.sandbox import run_tool

IMAGE_FORMATS = frozenset({"png", "jpeg", "gif", "bmp", "webp", "tiff"})
AUDIO_FORMATS = frozenset({"wav", "mp3", "flac", "ogg", "m4a", "au"})

_MIME_TAGS = {
    "image/png": "png", "image/jpeg": "jpeg", "image/gif": "gif", "image/bmp": "bmp",
    "image/x-bmp": "bmp", "image/x-ms-bmp": "bmp", "image/webp": "webp", "image/tiff": "tiff",
    "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav", "audio/vnd.wave": "wav",
    "audio/basic": "au", "audio/mpeg": "mp3", "audio/flac": "flac", "audio/x-flac": "flac",
    "audio/ogg": "ogg", "application/ogg": "ogg", "audio/mp4": "m4a", "audio/x-m4a": "m4a",
    "application/pdf": "pdf",
}
_EXTENSION_MIMES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".bmp": "image/bmp", ".webp": "image/webp", ".tif": "image/tiff", ".tiff": "image/tiff",
    ".wav": "audio/wav", ".au": "audio/basic", ".mp3": "audio/mpeg", ".flac": "audio/flac",
    ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".pdf": "application/pdf",
}
_PILLOW_MIMES = {"PNG": "image/png", "JPEG": "image/jpeg", "GIF": "image/gif", "BMP": "image/bmp",
                 "WEBP": "image/webp", "TIFF": "image/tiff"}
_UNINFORMATIVE = {"", "application/octet-stream", "text/plain", "inode/x-empty", "application/x-empty"}


@dataclass(frozen=True)
class FileType:
    mime: str
    kind: str  # image | audio | pdf | other
    tags: frozenset[str]  # format tag plus kind tag, e.g. {"png", "image"}

    def to_dict(self) -> dict:
        return {"mime": self.mime, "kind": self.kind, "tags": sorted(self.tags)}


def _from_file_command(path: Path) -> str:
    result = run_tool(["file", "--mime-type", "-b", path], cwd=path.parent, timeout=5)
    return result.stdout.strip().lower() if result.ok else ""


def _from_pillow(path: Path) -> str:
    try:
        with Image.open(path) as image:
            return _PILLOW_MIMES.get(image.format or "", "")
    except (UnidentifiedImageError, OSError, ValueError):
        return ""


def classify(mime: str) -> FileType:
    fmt = _MIME_TAGS.get(mime, "")
    if mime.startswith("image/") or fmt in IMAGE_FORMATS:
        kind = "image"
    elif mime.startswith("audio/") or fmt in AUDIO_FORMATS:
        kind = "audio"
    elif fmt == "pdf":
        kind = "pdf"
    else:
        kind = "other"
    tags = {fmt} if fmt else set()
    if kind != "other":
        tags.add(kind)
    return FileType(mime=mime or "application/octet-stream", kind=kind, tags=frozenset(tags))


def detect(path: Path, original_name: str = "") -> FileType:
    for probe in (lambda: _from_file_command(path), lambda: _from_pillow(path)):
        mime = probe()
        if mime not in _UNINFORMATIVE:
            return classify(mime)
    return classify(_EXTENSION_MIMES.get(Path(original_name).suffix.lower(), "application/octet-stream"))
