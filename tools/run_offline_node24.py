#!/usr/bin/env python3
"""Run a Node command with the repository-pinned offline Node 24 runtime."""

from __future__ import annotations

import argparse
import subprocess
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, add_help=True)
    parser.add_argument(
        "--node-only",
        action="store_true",
        help="Prepare Node only; skip oxc-parser packages when the command does not use the AST adapter",
    )
    args, node_args = parser.parse_known_args(argv)
    if node_args[:1] == ["--"]:
        node_args = node_args[1:]
    if not node_args:
        node_args = ["--version"]

    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(manifest, key, node=True, ast=not args.node_only)
        executable = core.install_node(manifest, key)
        if not args.node_only:
            core.install_ast(manifest, key, executable)
    except core.OfflineCoreError as exc:
        print(f"offline repair core error: {exc}", file=sys.stderr)
        return 2

    completed = subprocess.run([str(executable), *node_args], cwd=core.ROOT, check=False)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
