#!/usr/bin/env python3
"""Focused self-test for the offline Node 24 + AST repair core."""

from __future__ import annotations

import json
from pathlib import Path
import subprocess
import sys

import bootstrap_offline_repair_core as core


def run(command: list[str]) -> None:
    completed = subprocess.run(command, cwd=core.ROOT, text=True, capture_output=True, check=False)
    if completed.returncode != 0:
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n"
            f"stdout:\n{completed.stdout}\nstderr:\n{completed.stderr}"
        )


def main() -> int:
    manifest = core.load_manifest()
    key = core.platform_key()
    core.validate_manifest_against_project(manifest)
    core.verify_vendor(manifest, key)
    run([sys.executable, str(core.ROOT / "tools" / "bootstrap_offline_repair_core.py")])

    node_entry, _ = core.selected_entries(manifest, key)
    node_path = core._root_path(manifest["node"]["installDirectory"], "Node install directory")
    node_path = node_path.joinpath(*Path(node_entry["installedExecutable"]).parts)
    version = subprocess.check_output([str(node_path), "--version"], cwd=core.ROOT, text=True).strip()
    if version != f"v{manifest['node']['version']}":
        raise RuntimeError(f"Unexpected Node version: {version}")

    ast_probe = subprocess.check_output(
        [
            str(node_path),
            "--input-type=module",
            "--eval",
            "import {parseSync} from 'oxc-parser'; const r=parseSync('x.ts','const x:number=1;'); console.log(r.program.type);",
        ],
        cwd=core.ROOT,
        text=True,
    ).strip()
    if ast_probe != "Program":
        raise RuntimeError(f"Unexpected AST probe result: {ast_probe}")

    package = json.loads((core.ROOT / "node_modules" / "oxc-parser" / "package.json").read_text(encoding="utf-8"))
    if package.get("version") != manifest["ast"]["version"]:
        raise RuntimeError("Installed oxc-parser version does not match manifest")

    run([str(node_path), "--test", "tests/wp_ast_adapter_runtime.test.js"])
    print("Offline repair core self-test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
