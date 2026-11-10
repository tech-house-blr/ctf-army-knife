import asyncio
import io
import os
import time
from pathlib import Path

import pytest
from fastapi import HTTPException, UploadFile
from fastapi.testclient import TestClient

from ctf_api.core import sandbox
from ctf_api.core.sandbox import run_tool, save_upload, workspace
from ctf_api.main import app


def test_runs_tool_and_captures_output():
    with workspace() as cwd:
        result = run_tool(["echo", "flag{x}"], cwd=cwd)
    assert result.ok and result.stdout == "flag{x}\n"


def test_arguments_are_not_shell_interpreted(tmp_path):
    with workspace() as cwd:
        result = run_tool(["echo", f"; touch {tmp_path}/pwned"], cwd=cwd)
    assert result.ok
    assert not (tmp_path / "pwned").exists()


def test_missing_binary_is_reported_not_raised():
    with workspace() as cwd:
        result = run_tool(["definitely-not-installed-tool"], cwd=cwd)
    assert result.available is False and result.ok is False


def test_nonzero_exit_is_reported():
    with workspace() as cwd:
        result = run_tool(["sh", "-c", "echo oops >&2; exit 3"], cwd=cwd)
    assert result.exit_code == 3 and result.stderr == "oops\n" and not result.ok


def test_timeout_kills_tool_and_its_children():
    with workspace() as cwd:
        started = time.monotonic()
        # The child sleep would outlive a plain kill of the parent shell.
        result = run_tool(["sh", "-c", "sleep 30 & echo $! > child.pid; wait"], cwd=cwd, timeout=0.5)
        assert time.monotonic() - started < 5
        child = int((cwd / "child.pid").read_text())
    assert result.timed_out and result.exit_code is None
    time.sleep(0.2)
    with pytest.raises(ProcessLookupError):
        os.kill(child, 0)


def test_output_is_truncated():
    with workspace() as cwd:
        result = run_tool(["sh", "-c", "head -c 100000 /dev/zero | tr '\\0' A"], cwd=cwd, max_output=1000)
    assert result.truncated and len(result.stdout) == 1000


@pytest.mark.skipif(sandbox._PRLIMIT is None, reason="prlimit not installed")
def test_single_file_size_is_limited():
    with workspace() as cwd:
        run_tool(["sh", "-c", "head -c 5000000 /dev/zero > big.bin"], cwd=cwd, max_file_bytes=1_000_000)
        assert (cwd / "big.bin").stat().st_size <= 1_000_000


def test_environment_does_not_leak_secrets(monkeypatch):
    monkeypatch.setenv("SECRET_TOKEN", "hunter2")
    with workspace() as cwd:
        result = run_tool(["env"], cwd=cwd)
    assert "hunter2" not in result.stdout


def test_workspace_is_private_and_always_removed():
    with pytest.raises(RuntimeError):
        with workspace() as cwd:
            (cwd / "extracted").mkdir()
            (cwd / "extracted" / "payload.bin").write_bytes(b"x")
            assert cwd.stat().st_mode & 0o777 == 0o700
            raise RuntimeError("tool crashed")
    assert not cwd.exists()


def test_save_upload_enforces_size_limit(tmp_path: Path):
    destination = tmp_path / "upload.png"
    small = UploadFile(io.BytesIO(b"a" * 100), filename="small.png")
    assert asyncio.run(save_upload(small, destination, max_bytes=1000)) == 100

    big = UploadFile(io.BytesIO(b"a" * 5000), filename="big.png")
    with pytest.raises(HTTPException) as error:
        asyncio.run(save_upload(big, destination, max_bytes=1000))
    assert error.value.status_code == 413
    assert not destination.exists()


def test_capabilities_endpoint_lists_external_tools():
    tools = TestClient(app).get("/api/capabilities").json()["tools"]
    assert {"binwalk", "steghide", "zsteg", "exiftool"} <= tools.keys()
    assert all(isinstance(value, bool) for value in tools.values())
