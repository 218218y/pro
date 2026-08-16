#!/usr/bin/env python3
"""Run repository-pinned Vite through offline Node on Linux x64 glibc."""

from __future__ import annotations

import sys

import bootstrap_offline_repair_core as core
import offline_process_runner as process_runner


VITE_PROFILE = "vite-build"
RUNTIME_PROFILE = "tsx-tests"


def main(argv: list[str] | None = None) -> int:
    vite_args = list(sys.argv[1:] if argv is None else argv)
    if not vite_args:
        vite_args = ["--version"]

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
        node = core.install_node(manifest, key)
        core.install_workspace_profile(manifest, key, node, RUNTIME_PROFILE)
        core.install_workspace_profile(manifest, key, node, VITE_PROFILE)
        launcher = core.workspace_package_executable(
            manifest,
            key,
            VITE_PROFILE,
            "vite",
            "vite",
        )
    except core.OfflineCoreError as exc:
        print(f"offline Vite error: {exc}", file=sys.stderr)
        return 2

    return process_runner.run_isolated(
        [str(node), str(launcher), *vite_args],
        cwd=core.ROOT,
        env=core.create_offline_environment(node),
    )


if __name__ == "__main__":
    raise SystemExit(main())
