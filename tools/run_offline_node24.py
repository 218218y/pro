#!/usr/bin/env python3
"""Run a Node command with the repository-pinned offline Node 24 runtime."""

from __future__ import annotations

import argparse
import sys

import bootstrap_offline_repair_core as core
import offline_process_runner as process_runner


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, add_help=True)
    parser.add_argument(
        "--node-only",
        action="store_true",
        help="Prepare Node only; skip oxc-parser packages when the command does not use the AST adapter",
    )
    parser.add_argument(
        "--with-typescript",
        action="store_true",
        help="Also install and verify the repository-pinned TypeScript compiler",
    )
    parser.add_argument(
        "--with-prettier",
        action="store_true",
        help="Also install and verify the repository-pinned Prettier package",
    )
    parser.add_argument(
        "--with-esbuild",
        action="store_true",
        help="Also install and verify repository-pinned esbuild plus its native binary",
    )
    parser.add_argument(
        "--with-tsx",
        action="store_true",
        help="Also install and verify repository-pinned TSX and its esbuild runtime",
    )
    parser.add_argument(
        "--with-runtime",
        action="store_true",
        help="Also install the Linux x64 project runtime profile for tests importing production packages",
    )
    args, node_args = parser.parse_known_args(argv)
    if node_args[:1] == ["--"]:
        node_args = node_args[1:]
    if not node_args:
        node_args = ["--version"]

    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(
            manifest,
            key,
            node=True,
            ast=not args.node_only,
            esbuild=args.with_esbuild,
            tsx=args.with_tsx,
            prettier=args.with_prettier,
            typescript=args.with_typescript,
            workspace_profile_name="tsx-tests" if args.with_runtime else None,
        )
        executable = core.install_node(manifest, key)
        if not args.node_only:
            core.install_ast(manifest, key, executable)
        if args.with_tsx:
            core.install_tsx(manifest, key, executable)
        elif args.with_esbuild:
            core.install_esbuild(manifest, key, executable)
        if args.with_typescript:
            core.install_typescript(manifest, key, executable)
        if args.with_prettier:
            core.install_prettier(manifest, executable)
        if args.with_runtime:
            core.install_workspace_profile(manifest, key, executable, "tsx-tests")
    except core.OfflineCoreError as exc:
        print(f"offline repair core error: {exc}", file=sys.stderr)
        return 2

    return process_runner.run_isolated(
        [str(executable), *node_args],
        cwd=core.ROOT,
    )


if __name__ == "__main__":
    raise SystemExit(main())
