#!/usr/bin/env python3
"""Run TypeScript tests through pinned offline Node, Oxc, TSX, and runtime packages."""

from __future__ import annotations

import subprocess
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    test_args = list(sys.argv[1:] if argv is None else argv)
    if not test_args:
        print(
            "Usage: python tools/run_offline_tsx_tests.py <test-file> [more-tests...] "
            "[-- extra node --test args]",
            file=sys.stderr,
        )
        return 2

    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(
            manifest,
            key,
            node=True,
            ast=True,
            tsx=True,
            workspace_profile_name="tsx-tests",
        )
        node = core.install_node(manifest, key)
        core.install_ast(manifest, key, node)
        core.install_tsx(manifest, key, node)
        core.install_workspace_profile(manifest, key, node, "tsx-tests")
    except core.OfflineCoreError as exc:
        print(f"offline TSX test runner error: {exc}", file=sys.stderr)
        return 2

    completed = subprocess.run(
        [str(node), "tools/wp_run_tsx_tests.mjs", *test_args],
        cwd=core.ROOT,
        check=False,
    )
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
