#!/usr/bin/env python3
"""Verify offline Node/AST archives without installing them."""

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
    args = parser.parse_args(argv)
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.validate_manifest_against_project(manifest)
        core.selected_entries(manifest, key)
        if not args.manifest_only:
            core.verify_vendor(manifest, key)
        print(
            f"Offline repair vendor definition is valid for {key} "
            f"(Node {manifest['node']['version']}, Oxc {manifest['ast']['version']})."
        )
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline vendor verification error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
