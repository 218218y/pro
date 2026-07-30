#!/usr/bin/env python3
"""Focused self-test for the offline Node 24 + Prettier toolchain."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

import bootstrap_offline_repair_core as core


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(command, cwd=core.ROOT, text=True, capture_output=True, check=False)
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"stdout:\n{completed.stdout}\nstderr:\n{completed.stderr}"
        )
    return completed


def main() -> int:
    manifest = core.load_manifest()
    key = core.platform_key()
    core.verify_vendor(manifest, key, node=True, ast=False, prettier=True)
    node = core.install_node(manifest, key)
    prettier = core.install_prettier(manifest, node)

    version = run([str(node), str(prettier), "--version"]).stdout.strip()
    if version != str(manifest["prettier"]["version"]):
        raise RuntimeError(f"Unexpected Prettier version: {version}")

    artifacts = core.ROOT / ".artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    probe_dir = Path(tempfile.mkdtemp(prefix="offline-prettier-", dir=artifacts))
    try:
        probe = probe_dir / "probe.js"
        probe.write_text("const value={answer:42}\n", encoding="utf-8")
        run([str(node), str(prettier), "--write", str(probe.relative_to(core.ROOT))])
        formatted = probe.read_text(encoding="utf-8")
        if formatted != "const value = { answer: 42 };\n":
            raise RuntimeError(f"Unexpected formatted output: {formatted!r}")
        run([str(node), str(prettier), "--check", str(probe.relative_to(core.ROOT))])
    finally:
        shutil.rmtree(probe_dir, ignore_errors=True)

    print("Offline Prettier self-test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
