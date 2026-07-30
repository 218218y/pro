#!/usr/bin/env python3
"""Verify offline Node/AST/Prettier/TypeScript archives without installing them."""

from __future__ import annotations

import argparse
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--manifest-only",
        action="store_true",
        help="Validate manifest, .node-version and package-lock alignment without requiring archives",
    )
    parser.add_argument(
        "--with-prettier",
        action="store_true",
        help="Also require and verify the offline Prettier archive",
    )
    parser.add_argument(
        "--with-typescript",
        action="store_true",
        help="Also require and verify TypeScript plus the current platform native package",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--prettier-only",
        action="store_true",
        help="Require and verify only Node plus the offline Prettier archive",
    )
    group.add_argument(
        "--typescript-only",
        action="store_true",
        help="Require and verify only Node plus offline TypeScript and its native platform package",
    )
    args = parser.parse_args(argv)
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.validate_manifest_against_project(manifest)
        core.selected_entries(manifest, key)
        core.typescript_entries(manifest, key)
        if not args.manifest_only:
            core.verify_vendor(
                manifest,
                key,
                node=True,
                ast=not args.prettier_only and not args.typescript_only,
                prettier=args.with_prettier or args.prettier_only,
                typescript=args.with_typescript or args.typescript_only,
            )
        components = [f"Node {manifest['node']['version']}"]
        if not args.prettier_only and not args.typescript_only:
            components.append(f"Oxc {manifest['ast']['version']}")
        if args.with_prettier or args.prettier_only:
            components.append(f"Prettier {manifest['prettier']['version']}")
        if args.with_typescript or args.typescript_only:
            components.append(f"TypeScript {manifest['typescript']['version']}")
        print(f"Offline vendor definition is valid for {key} ({', '.join(components)}).")
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline vendor verification error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
