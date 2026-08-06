#!/usr/bin/env python3
"""Install repository-pinned ESLint and its strict-JS dependency closure offline."""

from __future__ import annotations

import argparse
import sys

import bootstrap_offline_repair_core as core


ESLINT_PROFILE = "eslint-js-strict"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Re-extract matching installs")
    args = parser.parse_args(argv)
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(
            manifest,
            key,
            node=True,
            ast=False,
            workspace_profile_names=(ESLINT_PROFILE,),
        )
        node = core.install_node(manifest, key, force=args.force)
        core.install_workspace_profile(
            manifest,
            key,
            node,
            ESLINT_PROFILE,
            force=args.force,
        )
        eslint = core.workspace_package_entry(manifest, key, ESLINT_PROFILE, "eslint")
        print(
            f"Offline ESLint ready for {key}: Node {manifest['node']['version']}, "
            f"ESLint {eslint['version']} ({core.workspace_profile(manifest, key, ESLINT_PROFILE)['packageCount']} packages)"
        )
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline ESLint bootstrap error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
