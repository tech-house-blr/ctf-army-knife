"""External CLI tools the API can use, and whether this deployment has them.

The Docker image installs all of them. Local development works without them:
tools report themselves as unavailable instead of failing.
"""
from __future__ import annotations

from fastapi import APIRouter

from ctf_api.core.sandbox import is_available

# name -> executable. Add new tools here when a feature starts using them.
EXTERNAL_TOOLS: dict[str, str] = {
    "binwalk": "binwalk",
    "exiftool": "exiftool",
    "file": "file",
    "foremost": "foremost",
    "identify": "identify",
    "outguess": "outguess",
    "pngcheck": "pngcheck",
    "steghide": "steghide",
    "strings": "strings",
    "zsteg": "zsteg",
}

router = APIRouter(tags=["meta"])


def availability() -> dict[str, bool]:
    return {name: is_available(binary) for name, binary in EXTERNAL_TOOLS.items()}


@router.get("/api/capabilities")
def capabilities() -> dict[str, dict[str, bool]]:
    """Which external tools are installed, so the UI can mark missing ones."""
    return {"tools": availability()}
