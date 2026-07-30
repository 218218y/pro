# Offline repair-core archives

This directory intentionally contains **no downloaded binaries** in the source patch.
Place the exact archives listed in `manifest.json` at the paths below, without renaming them.

Minimum set for the usual ChatGPT/Linux x64 environment:

```text
vendor/offline/node/node-v24.18.0-linux-x64.tar.xz
vendor/offline/ast/oxc-parser-0.141.0.tgz
vendor/offline/ast/oxc-project-types-0.141.0.tgz
vendor/offline/ast/oxc-parser-binding-linux-x64-gnu-0.141.0.tgz
```

The manifest also supports Linux ARM64 and Windows x64. Only the platform-specific Node archive and
binding for the current machine are required; the two common Oxc archives are always required.

Verify downloads without installing:

```bash
python tools/verify_offline_repair_vendor.py
```

Install the minimal runtime and AST packages without npm or network access:

```bash
python tools/bootstrap_offline_repair_core.py
```

Generated directories are `.tools/node24` and the three focused package paths under `node_modules`.
They are intentionally ignored by Git.
