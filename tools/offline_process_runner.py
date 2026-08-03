#!/usr/bin/env python3
"""Run one-shot offline Node commands without leaking native-service descendants."""

from __future__ import annotations

import ctypes
import os
from pathlib import Path
import signal
import subprocess
import time
from collections.abc import Sequence


_PR_SET_CHILD_SUBREAPER = 36


def enable_child_subreaper() -> None:
    """Adopt orphaned grandchildren so the runner can reap native services on Linux."""

    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(_PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) != 0:
        error_number = ctypes.get_errno()
        raise OSError(error_number, os.strerror(error_number))


def terminate_process_group(process_group_id: int) -> None:
    """Close descendants that outlive their process-group leader."""

    try:
        os.killpg(process_group_id, signal.SIGTERM)
    except ProcessLookupError:
        return

    time.sleep(0.2)
    try:
        os.killpg(process_group_id, signal.SIGKILL)
    except ProcessLookupError:
        pass


def reap_descendants(*, timeout_seconds: float = 1.0) -> None:
    """Reap adopted descendants after their process group has been terminated."""

    deadline = time.monotonic() + timeout_seconds
    while True:
        try:
            child_pid, _status = os.waitpid(-1, os.WNOHANG)
        except ChildProcessError:
            return

        if child_pid > 0:
            continue
        if time.monotonic() >= deadline:
            return
        time.sleep(0.02)


def run_isolated(command: Sequence[str], *, cwd: Path) -> int:
    """Run a command in a new session and clean its complete process tree afterward."""

    enable_child_subreaper()
    process = subprocess.Popen(
        list(command),
        cwd=cwd,
        start_new_session=True,
    )
    try:
        return process.wait()
    finally:
        terminate_process_group(process.pid)
        reap_descendants()
