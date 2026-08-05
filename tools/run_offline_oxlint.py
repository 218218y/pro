#!/usr/bin/env python3
"""Run repository-pinned Oxlint through offline Node 24 on Linux x64 glibc."""

from __future__ import annotations

import os
import sys

import bootstrap_offline_repair_core as core
import offline_process_runner as process_runner


def main(argv: list[str] | None = None) -> int:
    oxlint_args = list(sys.argv[1:] if argv is None else argv)
    if not oxlint_args:
        oxlint_args = ["--version"]

    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(manifest, key, node=True, ast=False, oxlint=True)
        node = core.install_node(manifest, key)
        launcher, type_aware_launcher = core.install_oxlint(manifest, key, node)
    except core.OfflineCoreError as exc:
        print(f"offline Oxlint error: {exc}", file=sys.stderr)
        return 2

    environment = os.environ.copy()
    environment[manifest["oxlint"]["typeAware"]["environmentVariable"]] = str(
        type_aware_launcher
    )
    return process_runner.run_isolated(
        [str(node), str(launcher), *oxlint_args],
        cwd=core.ROOT,
        env=environment,
    )


if __name__ == "__main__":
    raise SystemExit(main())
