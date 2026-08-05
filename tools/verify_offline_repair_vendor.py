#!/usr/bin/env python3
"""Verify the Linux x64 glibc offline repair archives without installing them."""

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
        "--with-esbuild",
        action="store_true",
        help="Also require and verify esbuild plus the Linux x64 native package",
    )
    parser.add_argument(
        "--with-tsx",
        action="store_true",
        help="Also require and verify TSX plus its esbuild runtime",
    )
    parser.add_argument(
        "--with-prettier",
        action="store_true",
        help="Also require and verify the offline Prettier archive",
    )
    parser.add_argument(
        "--with-typescript",
        action="store_true",
        help="Also require and verify TypeScript plus the Linux x64 native package",
    )
    parser.add_argument(
        "--with-oxlint",
        action="store_true",
        help="Also require and verify Oxlint plus the Linux type-aware backend",
    )
    parser.add_argument(
        "--with-vite",
        action="store_true",
        help="Also require and verify the Vite build and project runtime profiles",
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--esbuild-only",
        action="store_true",
        help="Require and verify only Node plus esbuild and its native platform package",
    )
    group.add_argument(
        "--tsx-only",
        action="store_true",
        help="Require Node, TSX, esbuild, and the Linux TSX-test runtime profile",
    )
    group.add_argument(
        "--tsx-engine-only",
        action="store_true",
        help="Require only Node plus TSX and esbuild, without project runtime packages",
    )
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
    group.add_argument(
        "--oxlint-only",
        action="store_true",
        help="Require and verify only Node plus Oxlint and its Linux type-aware backend",
    )
    group.add_argument(
        "--vite-only",
        action="store_true",
        help="Require only Node plus the Linux Vite build and project runtime profiles",
    )
    args = parser.parse_args(argv)
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.validate_manifest_against_project(manifest)
        core.selected_entries(manifest, key)
        core.esbuild_entries(manifest, key)
        core.tsx_entry(manifest)
        core.typescript_entries(manifest, key)
        core.oxlint_entries(manifest, key)
        core.workspace_profile(manifest, key, "vite-build")
        if not args.manifest_only:
            workspace_profiles = []
            if args.tsx_only:
                workspace_profiles.append("tsx-tests")
            if args.with_vite or args.vite_only:
                workspace_profiles.extend(["tsx-tests", "vite-build"])
            core.verify_vendor(
                manifest,
                key,
                node=True,
                ast=not (
                    args.esbuild_only
                    or args.tsx_only
                    or args.tsx_engine_only
                    or args.prettier_only
                    or args.typescript_only
                    or args.oxlint_only
                    or args.vite_only
                ),
                esbuild=args.with_esbuild or args.esbuild_only,
                tsx=args.with_tsx or args.tsx_only or args.tsx_engine_only,
                prettier=args.with_prettier or args.prettier_only,
                typescript=args.with_typescript or args.typescript_only,
                oxlint=args.with_oxlint or args.oxlint_only,
                workspace_profile_names=tuple(workspace_profiles),
            )
        components = [f"Node {manifest['node']['version']}"]
        if not (
            args.esbuild_only
            or args.tsx_only
            or args.tsx_engine_only
            or args.prettier_only
            or args.typescript_only
            or args.oxlint_only
            or args.vite_only
        ):
            components.append(f"Oxc {manifest['ast']['version']}")
        if (
            args.with_esbuild
            or args.esbuild_only
            or args.with_tsx
            or args.tsx_only
            or args.tsx_engine_only
        ):
            components.append(f"esbuild {manifest['esbuild']['version']}")
        if args.with_tsx or args.tsx_only or args.tsx_engine_only:
            components.append(f"TSX {manifest['tsx']['version']}")
        if args.tsx_only:
            count = manifest["workspace"]["profiles"]["tsx-tests"]["packageCount"]
            components.append(f"TSX-test runtime {count} packages")
        if args.with_prettier or args.prettier_only:
            components.append(f"Prettier {manifest['prettier']['version']}")
        if args.with_typescript or args.typescript_only:
            components.append(f"TypeScript {manifest['typescript']['version']}")
        if args.with_oxlint or args.oxlint_only:
            components.append(
                f"Oxlint {manifest['oxlint']['version']} + "
                f"oxlint-tsgolint {manifest['oxlint']['typeAware']['version']}"
            )
        if args.with_vite or args.vite_only:
            vite_profile = manifest["workspace"]["profiles"]["vite-build"]
            vite_entry = core.workspace_package_entry(manifest, key, "vite-build", "vite")
            react_entry = core.workspace_package_entry(
                manifest,
                key,
                "vite-build",
                "@vitejs/plugin-react",
            )
            components.append(
                f"Vite {vite_entry['version']} + @vitejs/plugin-react {react_entry['version']} "
                f"({vite_profile['packageCount']} build packages)"
            )
        print(f"Offline vendor definition is valid for {key} ({', '.join(components)}).")
        return 0
    except core.OfflineCoreError as exc:
        print(f"offline vendor verification error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
