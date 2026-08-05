#!/usr/bin/env python3
"""Install repository-pinned Vite 8 and plugin-react with Linux build dependencies."""

from __future__ import annotations

import argparse
import sys

import bootstrap_offline_repair_core as core


VITE_PROFILE = "vite-build"
RUNTIME_PROFILE = "tsx-tests"


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
            workspace_profile_names=(RUNTIME_PROFILE, VITE_PROFILE),
        )
        node = core.install_node(manifest, key, force=args.force)
        core.install_workspace_profile(
            manifest,
            key,
            node,
            RUNTIME_PROFILE,
            force=args.force,
        )
        core.install_workspace_profile(
            manifest,
            key,
            node,
            VITE_PROFILE,
            force=args.force,
        )
        vite = core.workspace_package_entry(manifest, key, VITE_PROFILE, "vite")
        react = core.workspace_package_entry(
            manifest,
            key,
            VITE_PROFILE,
            "@vitejs/plugin-react",
        )
        print(
            f"Offline Vite ready for {key}: Node {manifest['node']['version']}, "
            f"Vite {vite['version']}, @vitejs/plugin-react {react['version']}"
        )
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline Vite bootstrap error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
