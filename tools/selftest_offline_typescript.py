#!/usr/bin/env python3
"""Focused self-test for offline Node 24 + TypeScript 7 and declaration emit."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import bootstrap_offline_repair_core as core


def run(command: list[str], *, cwd: Path = core.ROOT) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"stdout:\n{completed.stdout}\nstderr:\n{completed.stderr}"
        )
    return completed


def main() -> int:
    manifest = core.load_manifest()
    key = core.platform_key()
    core.verify_vendor(manifest, key, node=True, ast=False, typescript=True)
    node = core.install_node(manifest, key)
    launcher = core.install_typescript(manifest, key, node)

    expected = str(manifest["typescript"]["version"])
    version = run([str(node), str(launcher), "--version"]).stdout.strip()
    if version != f"Version {expected}":
        raise RuntimeError(f"Unexpected TypeScript version: {version}")

    package = json.loads(
        (core.ROOT / "node_modules" / "typescript" / "package.json").read_text(encoding="utf-8")
    )
    if package.get("version") != expected:
        raise RuntimeError("Installed TypeScript package version does not match manifest")

    artifacts = core.ROOT / ".artifacts"
    artifacts.mkdir(parents=True, exist_ok=True)
    probe_dir = Path(tempfile.mkdtemp(prefix="offline-typescript-", dir=artifacts))
    try:
        source = probe_dir / "index.ts"
        config = probe_dir / "tsconfig.json"
        output = probe_dir / "types"
        source.write_text("export const answer: number = 42;\n", encoding="utf-8")
        config.write_text(
            json.dumps(
                {
                    "compilerOptions": {
                        "declaration": True,
                        "emitDeclarationOnly": True,
                        "outDir": str(output),
                    },
                    "files": [str(source)],
                }
            )
            + "\n",
            encoding="utf-8",
        )
        run([str(node), str(launcher), "-p", str(config), "--pretty", "false"])
        declaration = output / "index.d.ts"
        if declaration.read_text(encoding="utf-8") != "export declare const answer: number;\n":
            raise RuntimeError("Unexpected TypeScript declaration output")
    finally:
        shutil.rmtree(probe_dir, ignore_errors=True)

    print("Offline TypeScript self-test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
