#!/usr/bin/env python3
"""Prove the offline esbuild slice powers the repository TS runtime loader."""

from __future__ import annotations

import subprocess
import sys

import bootstrap_offline_repair_core as core


def main() -> int:
    try:
        manifest = core.load_manifest()
        key = core.platform_key()
        core.verify_vendor(manifest, key, node=True, ast=False, esbuild=True)
        node = core.install_node(manifest, key)
        core.install_esbuild(manifest, key, node, force=True)
    except core.OfflineCoreError as exc:
        print(f"offline esbuild self-test error: {exc}", file=sys.stderr)
        return 2

    probe = (
        "import { transformTsRuntimeModule } from './tests/_ts_runtime_module_loader.mjs';"
        "const output=transformTsRuntimeModule('export const answer: number = 42;', 'offline_probe.ts');"
        "if(!output.includes('const answer = 42')||output.includes(': number')) throw new Error(output);"
        "console.log('TS runtime loader transform passed');"
    )
    completed = subprocess.run(
        [str(node), "--input-type=module", "--eval", probe],
        cwd=core.ROOT,
        check=False,
    )
    if completed.returncode != 0:
        return completed.returncode
    print("Offline esbuild self-test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
