# Offline focused repair toolchain

## Purpose

The full project toolchain is intentionally large. Most focused architecture and source repairs need a much
smaller trusted set:

- repository-pinned Node `24.18.0`;
- `oxc-parser 0.141.0`;
- `@oxc-project/types 0.141.0`;
- one native Oxc parser binding for the current platform;
- optionally, lockfile-pinned Prettier `3.9.6`.

The bootstrap extracts only explicitly listed archives. It does not invoke npm, resolve dependencies, run
lifecycle scripts, install Playwright browsers, or install the complete lint/build/release toolchain.

## Required archives for Linux x64

### Node and AST core

```text
vendor/offline/node/node-v24.18.0-linux-x64.tar.xz
vendor/offline/ast/oxc-parser-0.141.0.tgz
vendor/offline/ast/types-0.141.0.tgz
vendor/offline/ast/binding-linux-x64-gnu-0.141.0.tgz
```

### Optional Prettier slice

```text
vendor/offline/prettier/prettier-3.9.6.tgz
```

The filenames match the download basenames. Do not extract or rename the archives.

## Verify and bootstrap Node/Oxc

```bash
python tools/verify_offline_repair_vendor.py
python tools/bootstrap_offline_repair_core.py
```

Windows convenience command:

```bat
tools\bootstrap_offline_repair_core.bat
```

Linux convenience command:

```bash
tools/bootstrap_offline_repair_core.sh
```

The core bootstrap verifies the Node version and SHA-256, all Oxc lockfile URLs and SHA-512 integrity values,
the extracted Node executable, and a real Oxc parse operation.

## Run focused Node commands

AST-dependent test:

```bash
python tools/run_offline_node24.py --test tests/wp_ast_adapter_runtime.test.js
```

Layer contract:

```bash
python tools/run_offline_node24.py tools/wp_layer_contract.js
```

Node-only command:

```bash
python tools/run_offline_node24.py --node-only --version
```

Core self-test:

```bash
python tools/selftest_offline_repair_core.py
```

## Verify and run Prettier independently

The formatter path does not require the Oxc archives. It reuses the pinned Node archive and installs only the
single Prettier package.

```bash
python tools/verify_offline_repair_vendor.py --prettier-only
python tools/bootstrap_offline_prettier.py
python tools/run_offline_prettier.py --check tools/wp_prettier_changed.mjs
python tools/run_offline_prettier.py --write path/to/changed-file.ts
python tools/selftest_offline_prettier.py
```

Equivalent package scripts are available when npm itself is already usable:

```bash
npm run setup:offline:prettier
npm run format:offline:check
npm run format:offline
```

## Scope boundary

This focused toolchain covers Node-native tests, AST-backed source contracts, layer checks, and formatting.
It does not provide TSX execution, TypeScript typechecking, ESLint/Oxlint, Vite, release bundling, obfuscation,
Playwright, or browser binaries.

The next most useful offline slice for this repository is `tsx + esbuild`, because a large part of the runtime
test portfolio is TypeScript. It should be added as its own verified slice rather than smuggled in as an
unvalidated partial install.
