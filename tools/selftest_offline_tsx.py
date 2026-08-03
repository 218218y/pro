#!/usr/bin/env python3
"""Prove the complete browserless Linux runtime through pinned offline TSX."""

from __future__ import annotations

import sys

import bootstrap_offline_repair_core as core
import offline_process_runner as process_runner


RUNTIME_SMOKE_TEST = "tests/offline_tsx_runtime_smoke.test.tsx"


def main() -> int:
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(
            manifest,
            key,
            node=True,
            ast=True,
            tsx=True,
            workspace_profile_name="tsx-tests",
        )
        node = core.install_node(manifest, key)
        core.install_ast(manifest, key, node)
        core.install_tsx(manifest, key, node)
        core.install_workspace_profile(manifest, key, node, "tsx-tests")

        # TSX/esbuild may leave a native service alive after the Node test leader exits.
        # The shared isolated runner closes that process group deterministically.
        returncode = process_runner.run_isolated(
            [str(node), "--import", "tsx", "--test", RUNTIME_SMOKE_TEST],
            cwd=core.ROOT,
        )
        if returncode != 0:
            raise RuntimeError(f"Offline TSX runtime smoke failed ({returncode})")
    except (core.OfflineCoreError, RuntimeError) as exc:
        print(f"offline TSX self-test error: {exc}", file=sys.stderr)
        return 2

    print(
        "Offline TSX self-test passed: the complete browserless Linux runtime profile "
        "loaded in one TSX process."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
