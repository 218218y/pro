#!/usr/bin/env python3
"""Install repository-pinned Oxlint and its Linux type-aware backend without npm."""

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
        core.verify_vendor(manifest, key, node=True, ast=False, oxlint=True)
        node = core.install_node(manifest, key, force=args.force)
        core.install_oxlint(manifest, key, node, force=args.force)
        print(
            f"Offline Oxlint ready for {key}: Node {manifest['node']['version']}, "
            f"Oxlint {manifest['oxlint']['version']}, "
            f"oxlint-tsgolint {manifest['oxlint']['typeAware']['version']}"
        )
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline Oxlint bootstrap error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
