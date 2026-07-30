# Offline focused-tool archives

This directory stores manually downloaded archives used by focused repair tasks. The bootstrap never runs
`npm install`, never resolves packages, and never executes lifecycle scripts. Every file is validated against
`vendor/offline/manifest.json`, `.node-version`, and `package-lock.json` before extraction.

## Core set: Node 24 + Oxc AST adapter

Minimum set for the usual ChatGPT/Linux x64 glibc environment:

```text
vendor/offline/node/node-v24.18.0-linux-x64.tar.xz
vendor/offline/ast/oxc-parser-0.141.0.tgz
vendor/offline/ast/types-0.141.0.tgz
vendor/offline/ast/binding-linux-x64-gnu-0.141.0.tgz
```

The names above intentionally match the filenames emitted by the official download URLs. Do not prepend
package scopes or rename them.

Verify and install:

```bash
python tools/verify_offline_repair_vendor.py
python tools/bootstrap_offline_repair_core.py
```

## Optional formatter set: Prettier

Add one additional archive:

```text
vendor/offline/prettier/prettier-3.9.6.tgz
```

Verify, install, and run it independently of Oxc:

```bash
python tools/verify_offline_repair_vendor.py --prettier-only
python tools/bootstrap_offline_prettier.py
python tools/run_offline_prettier.py --check <paths...>
python tools/run_offline_prettier.py --write <paths...>
```

Generated directories are `.tools/node24` and focused package paths under `node_modules`. They are ignored
by Git. The manifest also defines Linux ARM64 and Windows x64 variants; only the current platform's Node
archive and Oxc binding are required.
