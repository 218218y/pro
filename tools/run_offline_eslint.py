#!/usr/bin/env python3
"""Run the repository ESLint profile through offline Node on Linux x64 glibc."""

from __future__ import annotations

import sys

import bootstrap_offline_repair_core as core
import offline_process_runner as process_runner


ESLINT_PROFILE = "eslint-js-strict"


def main(argv: list[str] | None = None) -> int:
    lint_args = list(sys.argv[1:] if argv is None else argv)
    if not lint_args:
        lint_args = ["--profile", "js-only", "--strict"]

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
        node = core.install_node(manifest, key)
        core.install_workspace_profile(manifest, key, node, ESLINT_PROFILE)
    except core.OfflineCoreError as exc:
        print(f"offline ESLint error: {exc}", file=sys.stderr)
        return 2

    return process_runner.run_isolated(
        [str(node), str(core.ROOT / "tools" / "wp_lint.js"), *lint_args],
        cwd=core.ROOT,
        env=core.create_offline_environment(node),
    )


if __name__ == "__main__":
    raise SystemExit(main())
