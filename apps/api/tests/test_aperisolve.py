import io
import json
import struct
import zipfile
import zlib
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from ctf_api.core.sandbox import is_available, run_tool, workspace
from ctf_api.main import app
from ctf_api.tools.aperisolve import filetype, store
from ctf_api.tools.aperisolve.png_repair import PNG

client = TestClient(app)
FLAG = b"flag{aperisolve_works}"
needs = lambda binary: pytest.mark.skipif(not is_available(binary), reason=f"{binary} not installed")  # noqa: E731


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def lsb_png(message: bytes, size=(64, 64)) -> bytes:
    """Hide `message` in the RGB least-significant bits, row-major, MSB first (zsteg's b1,rgb,lsb,xy)."""
    pixels = np.random.default_rng(0).integers(0, 256, (size[1], size[0], 3), dtype=np.uint8)
    bits = np.unpackbits(np.frombuffer(message + b"\0", dtype=np.uint8))
    flat = pixels.reshape(-1)
    flat[: bits.size] = (flat[: bits.size] & 0xFE) | bits
    return png_bytes(Image.fromarray(pixels, "RGB"))


def analyze(data: bytes, filename: str, **form) -> tuple[dict, dict[str, dict], dict]:
    response = client.post("/api/aperisolve/analyze", files={"file": (filename, data)}, data=form)
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/x-ndjson")
    events = [json.loads(line) for line in response.text.splitlines()]
    start, done = events[0], events[-1]
    assert start["event"] == "start" and done["event"] == "done"
    results = {e["analyzer"]: e["result"] for e in events if e["event"] == "result"}
    assert set(results) == {a["name"] for a in start["analyzers"]}
    return start, results, done


def fetch(url: str) -> bytes:
    response = client.get(url)
    assert response.status_code == 200, url
    return response.content


# --- Full analysis over HTTP ------------------------------------------------------

def test_png_runs_image_analyzers_and_serves_bit_planes():
    start, results, _ = analyze(lsb_png(FLAG), "challenge.png")
    assert start["file"]["kind"] == "image" and "png" in start["file"]["tags"]
    names = {a["name"] for a in start["analyzers"]}
    assert {"decomposer", "color_remapping", "pcrt", "zsteg", "strings"} <= names
    assert "steghide" not in names  # steghide doesn't support PNG

    planes = results["decomposer"]["images"]
    assert set(planes) == {"Superimposed", "Red", "Green", "Blue"}
    assert all(len(urls) == 8 for urls in planes.values())
    red_lsb = Image.open(io.BytesIO(fetch(planes["Red"][0])))
    assert red_lsb.size == (64, 64) and red_lsb.mode == "L"
    assert len(results["color_remapping"]["images"]["Color remapping"]) == 8


def test_unknown_file_only_runs_generic_tools():
    start, results, _ = analyze(b"just some bytes " * 100, "notes.bin")
    assert start["file"]["kind"] == "other"
    assert {a["name"] for a in start["analyzers"]} <= {"file", "exiftool", "binwalk", "foremost", "strings"}


def test_tool_output_shows_original_name_not_server_paths():
    _, results, _ = analyze(lsb_png(FLAG), "challenge.png")
    dumped = json.dumps(results)
    assert "/.work/" not in dumped and str(store.RESULTS_DIR) not in dumped


@needs("zsteg")
def test_zsteg_finds_lsb_flag():
    _, results, _ = analyze(lsb_png(FLAG), "lsb.png")
    assert any(FLAG.decode() in line for line in results["zsteg"]["output"])


@needs("steghide")
def test_steghide_extracts_with_password(tmp_path: Path):
    cover = tmp_path / "cover.jpg"
    rng = np.random.default_rng(1)
    Image.fromarray(rng.integers(0, 256, (240, 320, 3), dtype=np.uint8), "RGB").save(cover, quality=90)
    (tmp_path / "secret.txt").write_bytes(FLAG)
    embed = run_tool(["steghide", "embed", "-cf", "cover.jpg", "-ef", "secret.txt", "-p", "hunter2", "-f", "-q"],
                     cwd=tmp_path)
    assert embed.ok, embed.stderr

    _, without, _ = analyze(cover.read_bytes(), "photo.jpg")
    assert without["steghide"]["status"] == "error"

    _, results, _ = analyze(cover.read_bytes(), "photo.jpg", password="hunter2")
    steghide = results["steghide"]
    assert steghide["status"] == "ok", steghide
    with zipfile.ZipFile(io.BytesIO(fetch(steghide["download"]))) as archive:
        assert archive.read("secret.txt") == FLAG


@needs("binwalk")
def test_binwalk_extracts_appended_zip():
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w") as archive:
        archive.writestr("hidden/flag.txt", FLAG)
    data = png_bytes(Image.new("RGB", (32, 32), "white")) + payload.getvalue()
    _, results, _ = analyze(data, "appended.png")
    binwalk = results["binwalk"]
    assert binwalk["status"] == "ok" and binwalk.get("download"), binwalk
    with zipfile.ZipFile(io.BytesIO(fetch(binwalk["download"]))) as archive:
        assert any(archive.read(name) == FLAG for name in archive.namelist() if name.endswith("flag.txt"))


def test_rejects_oversized_and_empty_uploads(monkeypatch):
    from ctf_api.tools.aperisolve import router
    monkeypatch.setattr(router, "MAX_UPLOAD_BYTES", 1000)
    response = client.post("/api/aperisolve/analyze", files={"file": ("big.png", b"x" * 5000)})
    assert response.status_code == 413
    assert client.post("/api/aperisolve/analyze", files={"file": ("empty.png", b"")}).status_code == 400


# --- PNG repair (PCRT) --------------------------------------------------------------

def corrupt_height(data: bytes, height: int) -> bytes:
    """Change IHDR height without fixing the CRC, like a typical CTF challenge."""
    pos = data.find(b"IHDR")
    return data[: pos + 8] + struct.pack(">I", height) + data[pos + 12:]


def test_png_repair_recovers_real_dimensions_and_trailing_data():
    original = png_bytes(Image.new("RGB", (40, 30), "red"))
    broken = corrupt_height(original, 10) + b"SECRET-AFTER-IEND"
    png = PNG(broken)
    fixed, extra = png.repair()
    assert fixed and extra == b"SECRET-AFTER-IEND"
    assert any("40x30" in line for line in png.logs)
    assert Image.open(io.BytesIO(bytes(png.repaired_data))).size == (40, 30)


def test_valid_png_is_not_reported_as_repaired():
    # Upstream flagged every PNG as repaired; check_chunks must only report real fixes.
    fixed, extra = PNG(png_bytes(Image.new("RGB", (8, 8)))).repair()
    assert not fixed and not extra


def test_pcrt_over_http_publishes_repaired_image_and_extra_data():
    broken = corrupt_height(png_bytes(Image.new("RGB", (40, 30), "blue")), 10) + b"tail"
    _, results, _ = analyze(broken, "broken.png")
    pcrt = results["pcrt"]
    assert pcrt["status"] == "ok"
    assert Image.open(io.BytesIO(fetch(pcrt["images"]["Repaired"][0]))).size == (40, 30)
    with zipfile.ZipFile(io.BytesIO(fetch(pcrt["download"]))) as archive:
        assert archive.read("extra_data.bin") == b"tail"


# --- Result store safety -------------------------------------------------------------

def test_archives_skip_symlinks(tmp_path: Path):
    (tmp_path / "real.txt").write_text("ok")
    (tmp_path / "passwd").symlink_to("/etc/passwd")
    (tmp_path / "linkdir").symlink_to("/etc", target_is_directory=True)
    analysis = store.Analysis()
    url, count = analysis.archive(tmp_path, "test")
    with zipfile.ZipFile(io.BytesIO(fetch(url))) as archive:
        assert archive.namelist() == ["real.txt"] and count == 1


@pytest.mark.parametrize("path", [
    "/api/aperisolve/results/..%2F..%2Fetc/passwd",
    "/api/aperisolve/results/shortid/x.png",
    "/api/aperisolve/results/AAAAAAAAAAAAAAAAAAAAAAAA/..%2Fsecret",
    "/api/aperisolve/results/AAAAAAAAAAAAAAAAAAAAAAAA/.work",
])
def test_result_files_reject_unsafe_paths(path):
    assert client.get(path).status_code == 404


def test_expired_results_are_purged(monkeypatch):
    analysis = store.Analysis()
    monkeypatch.setattr(store, "TTL_SECONDS", -1)
    store.purge()
    assert not analysis.dir.exists()


# --- File type detection ---------------------------------------------------------------

def test_detects_png_and_jpeg_by_content_not_extension():
    with workspace() as cwd:
        png = cwd / "looks-like.jpg"
        png.write_bytes(png_bytes(Image.new("RGB", (4, 4))))
        jpeg = cwd / "looks-like.png"
        Image.new("RGB", (4, 4)).save(jpeg, format="JPEG")
        assert filetype.detect(png, png.name).tags == {"png", "image"}
        assert filetype.detect(jpeg, jpeg.name).tags == {"jpeg", "image"}
