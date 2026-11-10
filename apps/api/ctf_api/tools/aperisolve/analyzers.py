"""AperiSolve analyzers, adapted from AperiSolve's aperisolve/analyzers/ (see NOTICE).

Each analyzer declares which uploads it applies to and returns a JSON-able
result. CLI tools run through ctf_api.core.sandbox; the image analyzers
(decomposer, colour remapping, PNG repair) are pure Python.

Result shape (rendered by apps/web/app/aperisolve):
    {"status": "ok" | "error" | "unavailable",
     "output":   str | list[str] | dict[str, str],   # optional
     "images":   {group: [url, ...]},                 # optional
     "download": url,                                 # optional, extracted files
     "note":     str,                                 # optional
     "error":    str}                                 # when status == "error"
"""
from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, ClassVar

import numpy as np
from PIL import Image, UnidentifiedImageError

from ctf_api.core.sandbox import ToolResult, is_available, run_tool
from ctf_api.tools.aperisolve.png_repair import PNG
from ctf_api.tools.aperisolve.store import Analysis

log = logging.getLogger(__name__)

TOOL_TIMEOUT = float(os.getenv("APERISOLVE_TOOL_TIMEOUT_SECONDS", "45"))
# Decoded-size ceiling, checked from the header before decoding: a small PNG can
# decode to hundreds of MB, and the decomposer writes dozens of full-size planes.
MAX_IMAGE_PIXELS = int(os.getenv("APERISOLVE_MAX_IMAGE_PIXELS", str(25_000_000)))
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS * 2

_ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
_EMBEDDED = re.compile(r'embedded file "([^"]+)"')
_WROTE = re.compile(r'wrote extracted data to "([^"]+)"')
Result = dict[str, Any]


@dataclass(frozen=True)
class Context:
    input: Path           # the uploaded file (read-only)
    work: Path            # private scratch directory for this analyzer
    analysis: Analysis    # where generated images/archives are published
    original_name: str
    password: str

    def clean(self, text: str) -> str:
        """Show the user's file name instead of server paths, and drop colour codes."""
        text = text.replace(str(self.input), self.original_name)
        text = text.replace(f"{self.work}/", "").replace(str(self.work), ".")
        text = text.replace(f"{self.analysis.dir}/", "")
        return _ANSI.sub("", text)


def ok(output: Any = None, **extra: Any) -> Result:
    result: Result = {"status": "ok"}
    if output is not None:
        result["output"] = output
    return result | {key: value for key, value in extra.items() if value}


def error(message: str) -> Result:
    return {"status": "error", "error": message.strip() or "The tool failed without output."}


def lines(text: str) -> list[str]:
    return [line for line in text.splitlines() if line.strip()]


class Analyzer:
    name: ClassVar[str]
    order: ClassVar[int]
    binary: ClassVar[str | None] = None
    accepts: ClassVar[frozenset[str]] = frozenset()  # empty = any file
    deep_only: ClassVar[bool] = False
    uses_password: ClassVar[bool] = False

    def applies(self, tags: frozenset[str], deep: bool) -> bool:
        return (deep or not self.deep_only) and (not self.accepts or bool(self.accepts & tags))

    def available(self) -> bool:
        return self.binary is None or is_available(self.binary)

    def execute(self, ctx: Context) -> Result:
        """Run the analyzer; never raises, so one broken tool can't sink the rest."""
        if not self.available():
            return {"status": "unavailable", "error": f"{self.binary} is not installed on this server."}
        try:
            return self.run(ctx)
        except Exception:  # noqa: BLE001 - report, don't crash the analysis
            log.exception("AperiSolve analyzer %s crashed", self.name)
            return error("The analyzer crashed on this file.")

    def run(self, ctx: Context) -> Result:
        raise NotImplementedError

    def tool(self, ctx: Context, *args: str | Path) -> ToolResult:
        result = run_tool([*args], cwd=ctx.work, timeout=TOOL_TIMEOUT)
        result.stdout, result.stderr = ctx.clean(result.stdout), ctx.clean(result.stderr)
        return result

    @staticmethod
    def timed_out(result: ToolResult) -> Result | None:
        if result.timed_out:
            return error(f"{result.tool} timed out after {TOOL_TIMEOUT:g}s.")
        return None


# --- Image views (pure Python) ---------------------------------------------------

_CHANNEL_NAMES = {"L": ["Gray"], "LA": ["Gray", "Alpha"], "RGB": ["Red", "Green", "Blue"],
                  "RGBA": ["Red", "Green", "Blue", "Alpha"]}


def load_image(path: Path) -> tuple[np.ndarray, str, str | None] | Result:
    """Decode an image to (array, mode, note), or return an error result."""
    try:
        with Image.open(path) as image:
            if image.width * image.height > MAX_IMAGE_PIXELS:
                return error(f"Image is {image.width}x{image.height}; the limit is "
                             f"{MAX_IMAGE_PIXELS // 1_000_000} megapixels.")
            note = None
            if image.mode not in _CHANNEL_NAMES:
                has_alpha = image.mode in ("PA", "La", "RGBa") or "transparency" in image.info
                target = "RGBA" if has_alpha else "RGB"
                note = f"{image.mode} image was converted to {target} for processing."
                image = image.convert(target)
            return np.array(image), image.mode, note
    except Image.DecompressionBombError:
        return error("Image rejected: its decoded size would be a decompression bomb.")
    except (UnidentifiedImageError, OSError, ValueError):
        return error("This file can't be decoded as an image.")


def channels(array: np.ndarray) -> list[np.ndarray]:
    return [array] if array.ndim == 2 else [array[..., index] for index in range(array.shape[2])]


class Decomposer(Analyzer):
    """Every bit plane of every channel, plus RGB planes superimposed."""

    name, order, accepts = "decomposer", 10, frozenset({"image"})

    def run(self, ctx: Context) -> Result:
        loaded = load_image(ctx.input)
        if isinstance(loaded, dict):
            return loaded
        array, mode, note = loaded
        planes = channels(array.astype(np.uint16))
        images: dict[str, list[str]] = {}

        def save(pixels: np.ndarray, image_mode: str, name: str) -> str:
            Image.fromarray(pixels.astype(np.uint8), mode=image_mode).save(ctx.analysis.path(name))
            return ctx.analysis.url(name)

        if mode in ("RGB", "RGBA"):
            images["Superimposed"] = [
                save(np.stack([((planes[c] >> bit) & 1) * 255 for c in range(3)], axis=-1), "RGB",
                     f"decomposer_superimposed_bit_{bit}.png")
                for bit in range(8)
            ]
        for label, plane in zip(_CHANNEL_NAMES[mode], planes, strict=True):
            images[label] = [save(((plane >> bit) & 1) * 255, "L", f"decomposer_{label.lower()}_bit_{bit}.png")
                             for bit in range(8)]
        return ok(images=images, note=note)


class ColorRemapping(Analyzer):
    """Random palettes that make near-identical colours stand apart."""

    name, order, accepts = "color_remapping", 20, frozenset({"image"})
    count: ClassVar[int] = 8

    def run(self, ctx: Context) -> Result:
        loaded = load_image(ctx.input)
        if isinstance(loaded, dict):
            return loaded
        array, mode, note = loaded
        if array.ndim == 2:
            array = np.repeat(array[..., None], 3, axis=2)
            mode = "RGB"
        elif mode == "LA":
            array = np.concatenate([np.repeat(array[..., :1], 3, axis=2), array[..., 1:]], axis=2)
            mode = "RGBA"
        rng = np.random.default_rng()
        urls = []
        for index in range(self.count):
            color_map = rng.integers(0, 256, size=256, dtype=np.uint8)
            remapped = array.copy()
            remapped[..., :3] = color_map[array[..., :3]]
            name = f"color_remapping_{index:02d}.png"
            Image.fromarray(remapped.astype(np.uint8), mode=mode).save(ctx.analysis.path(name))
            urls.append(ctx.analysis.url(name))
        return ok(images={"Color remapping": urls}, note=note)


class PngRepair(Analyzer):
    """PCRT: fixes broken PNG headers, CRCs, IHDR dimensions and finds data after IEND."""

    name, order, accepts = "pcrt", 90, frozenset({"png"})

    def run(self, ctx: Context) -> Result:
        png = PNG(ctx.input.read_bytes())
        fixed, extra = png.repair()
        if png.errors:
            return {**error("\n".join(png.errors)), **({"output": png.logs} if png.logs else {})}
        notes, images, download = [], None, None
        if fixed and png.repaired_data:
            ctx.analysis.path("pcrt_repaired.png").write_bytes(bytes(png.repaired_data))
            images = {"Repaired": [ctx.analysis.url("pcrt_repaired.png")]}
            notes.append("PNG was repaired")
        if extra:
            extra_dir = ctx.work / "extra"
            extra_dir.mkdir()
            (extra_dir / "extra_data.bin").write_bytes(extra)
            download, _ = ctx.analysis.archive(extra_dir, "pcrt")
            notes.append(f"{len(extra)} bytes found after IEND")
        return ok(png.logs or ["PNG appears valid, no repairs needed"],
                  images=images, download=download, note=" · ".join(notes))


# --- CLI tools ---------------------------------------------------------------------

class FileCommand(Analyzer):
    name, order, binary = "file", 30, "file"

    def run(self, ctx: Context) -> Result:
        result = self.tool(ctx, "file", "-b", ctx.input)
        return self.timed_out(result) or (ok(result.stdout.strip()) if result.ok else error(result.stderr))


class Exiftool(Analyzer):
    name, order, binary = "exiftool", 40, "exiftool"
    # These describe our temporary copy of the upload, not the file itself.
    _HIDDEN = {"Directory", "File Name", "File Permissions", "File Access Date/Time",
               "File Inode Change Date/Time", "File Modification Date/Time", "ExifTool Version Number"}

    def run(self, ctx: Context) -> Result:
        result = self.tool(ctx, "exiftool", "-a", "-u", "-g1", ctx.input)
        if failure := self.timed_out(result):
            return failure
        metadata = {}
        for line in result.stdout.splitlines():
            if ":" in line and not line.startswith("----"):
                key, value = (part.strip() for part in line.split(":", 1))
                if key not in self._HIDDEN:
                    metadata[key] = value
        return ok(metadata) if metadata else error(result.stderr or "No metadata found.")


class Binwalk(Analyzer):
    name, order, binary = "binwalk", 50, "binwalk"

    def run(self, ctx: Context) -> Result:
        extracted = ctx.work / "extracted"
        # Bounded extraction: recursion depth, result count and per-file size.
        result = self.tool(ctx, "binwalk", "--matryoshka", "--depth=2", "--count=100", "--size=10485760",
                           "-e", "-C", extracted, ctx.input)
        if failure := self.timed_out(result):
            return failure
        download, count = ctx.analysis.archive(extracted, "binwalk") if extracted.exists() else (None, 0)
        if result.stderr.strip() and not download:
            return error(result.stderr)
        return ok(lines(result.stdout), download=download, note=f"{count} files extracted" if count else None)


class Foremost(Analyzer):
    name, order, binary = "foremost", 60, "foremost"

    def run(self, ctx: Context) -> Result:
        out = ctx.work / "carved"
        result = self.tool(ctx, "foremost", "-o", out, "-i", ctx.input)
        if failure := self.timed_out(result):
            return failure
        if len(result.stderr) > 60 and "Processing" not in result.stderr:
            return error(result.stderr)
        carved = [p for p in out.rglob("*") if p.is_file() and p.name != "audit.txt"] if out.exists() else []
        download, count = ctx.analysis.archive(out, "foremost") if carved else (None, 0)
        audit = out / "audit.txt"
        summary = ctx.clean(audit.read_text(errors="replace")) if audit.exists() else ""
        files_section = summary.split("File: ", 1)[-1] if summary else ""
        return ok(lines(files_section) or ["No files carved."], download=download,
                  note=f"{len(carved)} files carved" if carved else None)


class Outguess(Analyzer):
    name, order, binary = "outguess", 70, "outguess"
    accepts, deep_only, uses_password = frozenset({"jpeg"}), True, True

    def run(self, ctx: Context) -> Result:
        out_dir = ctx.work / "outguess"
        out_dir.mkdir()
        key = ["-k", ctx.password] if ctx.password else []
        result = self.tool(ctx, "outguess", *key, "-r", ctx.input, out_dir / "outguess.data")
        if failure := self.timed_out(result):
            return failure
        data = out_dir / "outguess.data"
        # outguess writes an empty file when extraction fails; only real data counts.
        if data.exists() and data.stat().st_size > 0:
            download, _ = ctx.analysis.archive(out_dir, "outguess")
            return ok(lines(result.stderr), download=download)
        return error(result.stderr)


class Pngcheck(Analyzer):
    name, order, binary, accepts = "pngcheck", 80, "pngcheck", frozenset({"png"})

    def run(self, ctx: Context) -> Result:
        result = self.tool(ctx, "pngcheck", "-v", ctx.input)
        if failure := self.timed_out(result):
            return failure
        if "neither a PNG or JNG image nor a MNG stream" in result.stdout:
            return error("Not a PNG/JNG/MNG file.")
        return ok(lines(result.stdout + result.stderr))


class Identify(Analyzer):
    name, order, binary, accepts = "identify", 100, "identify", frozenset({"image"})

    def run(self, ctx: Context) -> Result:
        result = self.tool(ctx, "identify", "-verbose", ctx.input)
        return self.timed_out(result) or (ok(lines(result.stdout)) if result.stdout.strip() else error(result.stderr))


class Steghide(Analyzer):
    name, order, binary = "steghide", 110, "steghide"
    accepts, uses_password = frozenset({"jpeg", "bmp", "wav", "au"}), True

    def run(self, ctx: Context) -> Result:
        info = self.tool(ctx, "steghide", "info", ctx.input, "-p", ctx.password)
        if failure := self.timed_out(info):
            return failure
        match = _EMBEDDED.search(info.stdout + info.stderr)
        if not match:
            message = info.stderr
            if "format of the file" in message and "not supported" in message:
                message = "File format not supported by steghide (JPEG, BMP, WAV, AU only)."
            elif "could not extract" in message:
                message = "No data found with this password (try one in the password box)."
            return error(message)
        out_dir = ctx.work / "steghide"
        out_dir.mkdir()
        target = out_dir / (Path(match.group(1)).name or "steghide.out")
        extract = self.tool(ctx, "steghide", "extract", "-sf", ctx.input, "-xf", target, "-p", ctx.password, "-f")
        if failure := self.timed_out(extract):
            return failure
        if not _WROTE.search(extract.stdout + extract.stderr):
            return error(extract.stderr)
        download, _ = ctx.analysis.archive(out_dir, "steghide")
        return ok([f'Extracted "{target.name}"', *lines(info.stdout)], download=download)


class Zsteg(Analyzer):
    name, order, binary = "zsteg", 150, "zsteg"
    accepts = frozenset({"png", "bmp"})

    def run(self, ctx: Context) -> Result:
        result = self.tool(ctx, "zsteg", ctx.input)
        if failure := self.timed_out(result):
            return failure
        if "PNG::NotSupported" in result.stdout[:100]:
            return error("File format not supported by zsteg (PNG and BMP only).")
        if result.stderr.strip() and not result.stdout.strip():
            return error(result.stderr)
        return ok(lines(result.stdout))


class Strings(Analyzer):
    name, order, binary = "strings", 160, "strings"

    def run(self, ctx: Context) -> Result:
        result = self.tool(ctx, "strings", "-n", "5", ctx.input)
        if failure := self.timed_out(result):
            return failure
        output = lines(result.stdout)
        return ok(output, note="Output truncated" if result.truncated else None)


ANALYZERS: list[Analyzer] = sorted(
    [Decomposer(), ColorRemapping(), FileCommand(), Exiftool(), Binwalk(), Foremost(), Outguess(),
     Pngcheck(), PngRepair(), Identify(), Steghide(), Zsteg(), Strings()],
    key=lambda analyzer: analyzer.order,
)
