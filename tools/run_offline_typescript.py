#!/usr/bin/env python3
"""Run the repository-pinned TypeScript CLI through offline Node 24."""

from __future__ import annotations

import subprocess
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    tsc_args = list(sys.argv[1:] if argv is None else argv)
    if not tsc_args:
        tsc_args = ["--version"]

    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(manifest, key, node=True, ast=False, typescript=True)
        node = core.install_node(manifest, key)
        launcher = core.install_typescript(manifest, key, node)
    except core.OfflineCoreError as exc:
        print(f"offline TypeScript error: {exc}", file=sys.stderr)
        return 2

    completed = subprocess.run([str(node), str(launcher), *tsc_args], cwd=core.ROOT, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
