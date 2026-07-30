#!/usr/bin/env python3
"""Install the repository-pinned Node 24 and Prettier packages without npm."""

from __future__ import annotations

import argparse
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Re-extract matching installs")
    args = parser.parse_args(argv)
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(manifest, key, node=True, ast=False, prettier=True)
        node = core.install_node(manifest, key, force=args.force)
        core.install_prettier(manifest, node, force=args.force)
        print(
            f"Offline formatter ready for {key}: Node {manifest['node']['version']}, "
            f"Prettier {manifest['prettier']['version']}"
        )
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline Prettier bootstrap error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
