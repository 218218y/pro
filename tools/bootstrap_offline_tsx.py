#!/usr/bin/env python3
"""Install repository-pinned Node, TSX, esbuild, and TSX-test runtime packages."""

from __future__ import annotations

import argparse
import sys

import bootstrap_offline_repair_core as core


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Re-extract matching installs")
    parser.add_argument(
        "--engine-only",
        action="store_true",
        help="Install only Node, esbuild, and TSX without project runtime dependencies",
    )
    args = parser.parse_args(argv)
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(
            manifest,
            key,
            node=True,
            ast=False,
            tsx=True,
            workspace_profile_name=None if args.engine_only else "tsx-tests",
        )
        node = core.install_node(manifest, key, force=args.force)
        core.install_tsx(manifest, key, node, force=args.force)
        if not args.engine_only:
            core.install_workspace_profile(
                manifest,
                key,
                node,
                "tsx-tests",
                force=args.force,
            )
        package_count = manifest["workspace"]["profiles"]["tsx-tests"]["packageCount"]
        print(
            f"Offline TSX ready for {key}: Node {manifest['node']['version']}, "
            f"esbuild {manifest['esbuild']['version']}, TSX {manifest['tsx']['version']}"
            + ("" if args.engine_only else f", runtime profile {package_count} packages")
        )
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline TSX bootstrap error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
