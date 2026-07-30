#!/usr/bin/env python3
"""Prove the offline TSX slice on a Wave C runtime identity test and declaration snapshot."""

from __future__ import annotations

import subprocess
import sys

import bootstrap_offline_repair_core as core


WAVE_C_RUNTIME_TEST = "tests/wave_c1_dimension_consolidation_runtime.test.ts"
DECLARATION_SNAPSHOT_TEST = "tests/wardrobe_dimension_public_surface_semantic_contract.test.js"


def run(command: list[str]) -> None:
    completed = subprocess.run(command, cwd=core.ROOT, check=False)
    if completed.returncode != 0:
        raise RuntimeError(f"Command failed ({completed.returncode}): {' '.join(command)}")


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
            typescript=True,
        )
        node = core.install_node(manifest, key)
        core.install_ast(manifest, key, node)
        core.install_tsx(manifest, key, node, force=True)
        core.install_typescript(manifest, key, node)

        run([str(node), "tools/wp_run_tsx_tests.mjs", WAVE_C_RUNTIME_TEST])
        run([str(node), "--test", DECLARATION_SNAPSHOT_TEST])
    except (core.OfflineCoreError, RuntimeError) as exc:
        print(f"offline TSX self-test error: {exc}", file=sys.stderr)
        return 2

    print("Offline TSX self-test passed: Wave C runtime identity and declaration snapshot.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
