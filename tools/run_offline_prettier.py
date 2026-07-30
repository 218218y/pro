#!/usr/bin/env python3
"""Run Prettier through the repository-pinned offline Node 24 toolchain."""

from __future__ import annotations

import subprocess
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    prettier_args = list(sys.argv[1:] if argv is None else argv)
    if not prettier_args:
        prettier_args = ["--check", "."]

    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(manifest, key, node=True, ast=False, prettier=True)
        node = core.install_node(manifest, key)
        prettier = core.install_prettier(manifest, node)
    except core.OfflineCoreError as exc:
        print(f"offline Prettier error: {exc}", file=sys.stderr)
        return 2

    completed = subprocess.run([str(node), str(prettier), *prettier_args], cwd=core.ROOT, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
