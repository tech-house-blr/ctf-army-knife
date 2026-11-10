"""Run external CLI tools (steghide, binwalk, ...) on untrusted input, safely.

Every tool that shells out goes through this module so the safety rules live in
one place:

- no shell: arguments are passed as a list, never interpolated into a string
- a private temporary workspace per request, always deleted afterwards
- a wall-clock timeout that kills the tool *and* any children it spawned
- resource limits (CPU, memory, size of any single file written) via prlimit
- captured output is truncated, and total workspace size can be checked after
- a minimal environment, so the tool cannot see server secrets
"""
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import stat
import tempfile
import threading
import time
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from dataclasses import asdict, dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile

MiB = 1024 * 1024

# Defaults are overridable per deployment; individual calls can be stricter.
MAX_UPLOAD_BYTES = int(os.getenv("TOOL_MAX_UPLOAD_BYTES", str(25 * MiB)))
DEFAULT_TIMEOUT = float(os.getenv("TOOL_TIMEOUT_SECONDS", "30"))
DEFAULT_MAX_OUTPUT = int(os.getenv("TOOL_MAX_OUTPUT_BYTES", str(1 * MiB)))
DEFAULT_MAX_FILE = int(os.getenv("TOOL_MAX_FILE_BYTES", str(100 * MiB)))
DEFAULT_MAX_MEMORY = int(os.getenv("TOOL_MAX_MEMORY_BYTES", str(1024 * MiB)))
WORKSPACE_ROOT = os.getenv("TOOL_WORKSPACE_ROOT") or None  # None -> system temp dir

_PRLIMIT = shutil.which("prlimit")


@dataclass
class ToolResult:
    tool: str
    available: bool
    exit_code: int | None = None
    stdout: str = ""
    stderr: str = ""
    timed_out: bool = False
    cancelled: bool = False
    truncated: bool = False
    duration_ms: int = 0

    @property
    def ok(self) -> bool:
        return self.available and not self.timed_out and self.exit_code == 0

    def to_dict(self) -> dict:
        return {**asdict(self), "ok": self.ok}


def is_available(binary: str) -> bool:
    return shutil.which(binary) is not None


@contextmanager
def workspace(prefix: str = "ctf-tool-") -> Iterator[Path]:
    """A private temporary directory that is removed even if the tool fails."""
    path = Path(tempfile.mkdtemp(prefix=prefix, dir=WORKSPACE_ROOT))
    try:
        os.chmod(path, 0o700)
        yield path
    finally:
        remove_tree(path)


def make_accessible(path: Path) -> None:
    """Give the owner read/write/search access to everything under `path`.

    Extracted archives keep their stored modes, so a mode-000 file or a
    read-only directory would otherwise break zipping and cleanup.
    """
    def fix(item: Path, bits: int) -> None:
        try:
            mode = item.lstat().st_mode
            if not stat.S_ISLNK(mode) and stat.S_IMODE(mode) & bits != bits:
                item.chmod(stat.S_IMODE(mode) | bits)
        except OSError:
            pass

    if path.is_symlink() or not path.is_dir():
        return
    fix(path, stat.S_IRWXU)
    for root, dirs, files in os.walk(path, followlinks=False):
        for name in dirs:
            fix(Path(root) / name, stat.S_IRWXU)
        for name in files:
            fix(Path(root) / name, stat.S_IRUSR | stat.S_IWUSR)


def remove_tree(path: Path) -> None:
    """Delete a directory tree, including entries whose modes would block rmtree."""
    if not path.exists() and not path.is_symlink():
        return
    make_accessible(path)
    shutil.rmtree(path, ignore_errors=True)


async def save_upload(upload: UploadFile, destination: Path, max_bytes: int = MAX_UPLOAD_BYTES) -> int:
    """Stream an upload to disk, rejecting it with 413 once it exceeds max_bytes."""
    written = 0
    with destination.open("wb") as handle:
        while chunk := await upload.read(1 * MiB):
            written += len(chunk)
            if written > max_bytes:
                handle.close()
                destination.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"File is larger than {max_bytes // MiB} MiB.")
            handle.write(chunk)
    return written


def directory_size(path: Path) -> int:
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file() and not item.is_symlink())


def _read_capped(path: Path, limit: int) -> tuple[str, bool]:
    with path.open("rb") as handle:
        data = handle.read(limit + 1)
    return data[:limit].decode("utf-8", errors="replace"), len(data) > limit


def run_tool(
    args: Sequence[str | os.PathLike[str]],
    *,
    cwd: Path,
    timeout: float = DEFAULT_TIMEOUT,
    max_output: int = DEFAULT_MAX_OUTPUT,
    max_file_bytes: int = DEFAULT_MAX_FILE,
    max_memory_bytes: int = DEFAULT_MAX_MEMORY,
    stdin: bytes | None = None,
    cancel: threading.Event | None = None,
) -> ToolResult:
    """Run one external tool inside `cwd` (normally a `workspace()`).

    Never raises for tool failures: a missing binary, non-zero exit or timeout
    are all reported in the returned ToolResult so callers can show partial
    results from the tools that did work. Setting `cancel` kills the tool (and
    its children) within a fraction of a second, e.g. when the client has gone.
    """
    command = [os.fspath(arg) for arg in args]
    name = Path(command[0]).name
    if not is_available(command[0]):
        return ToolResult(tool=name, available=False)
    if cancel is not None and cancel.is_set():
        return ToolResult(tool=name, available=True, cancelled=True)

    if _PRLIMIT:
        cpu_seconds = max(1, int(timeout) + 1)
        command = [_PRLIMIT, f"--cpu={cpu_seconds}", f"--as={max_memory_bytes}",
                   f"--fsize={max_file_bytes}", "--core=0", "--", *command]

    env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": str(cwd), "LANG": "C.UTF-8", "TMPDIR": str(cwd)}
    # Output goes to files rather than pipes so a chatty tool cannot exhaust
    # server memory; we only read back the first max_output bytes.
    out_path, err_path = cwd / ".stdout", cwd / ".stderr"
    started = time.monotonic()
    timed_out = cancelled = False
    deadline = started + timeout
    with out_path.open("wb") as out, err_path.open("wb") as err:
        process = subprocess.Popen(
            command, cwd=cwd, env=env, stdout=out, stderr=err,
            stdin=subprocess.PIPE if stdin is not None else subprocess.DEVNULL,
            start_new_session=True,  # own process group, so we can kill its children too
        )
        # Wait in short steps so a cancel request is noticed quickly. Retrying
        # communicate() after TimeoutExpired is supported and loses no input.
        pending_input = stdin
        while True:
            try:
                process.communicate(input=pending_input, timeout=min(0.2, max(0.0, deadline - time.monotonic())))
                break
            except subprocess.TimeoutExpired:
                pending_input = None
                timed_out = time.monotonic() >= deadline
                cancelled = cancel is not None and cancel.is_set()
                if timed_out or cancelled:
                    try:
                        os.killpg(process.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
                    process.wait()
                    break

    stdout, out_truncated = _read_capped(out_path, max_output)
    stderr, err_truncated = _read_capped(err_path, max_output)
    out_path.unlink(missing_ok=True)
    err_path.unlink(missing_ok=True)
    return ToolResult(
        tool=name, available=True,
        exit_code=None if timed_out or cancelled else process.returncode,
        stdout=stdout, stderr=stderr, timed_out=timed_out, cancelled=cancelled,
        truncated=out_truncated or err_truncated,
        duration_ms=int((time.monotonic() - started) * 1000),
    )
