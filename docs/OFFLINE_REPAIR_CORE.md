# Offline Node 24 and AST repair core

## Purpose

The full project toolchain is intentionally large. A focused architecture or contract repair often needs only:

- the repository-pinned primary runtime, Node `24.18.0`;
- `oxc-parser 0.141.0`;
- `@oxc-project/types 0.141.0`;
- one native Oxc parser binding matching the current operating system and CPU.

The offline repair core installs only those components. It does not invoke npm, resolve dependencies,
run lifecycle scripts, install Playwright browsers, or install the complete lint/build/release toolchain.

## Prepare the project

Download the archives shown in `vendor/offline/manifest.json` and save them at the exact `file` paths.
For the normal Linux x64 ChatGPT environment, the required paths are:

```text
vendor/offline/node/node-v24.18.0-linux-x64.tar.xz
vendor/offline/ast/oxc-parser-0.141.0.tgz
vendor/offline/ast/oxc-project-types-0.141.0.tgz
vendor/offline/ast/oxc-parser-binding-linux-x64-gnu-0.141.0.tgz
```

Do not extract or rename the archives manually.

## Verify and bootstrap

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

The bootstrap verifies:

1. the Node version against `.node-version`;
2. the Node archive against its official SHA-256;
3. Oxc URLs, versions and integrity values against `package-lock.json`;
4. every Oxc archive against SHA-512;
5. the extracted Node executable by running `node --version`;
6. the extracted Oxc packages by parsing a JavaScript module.

## Run focused commands

AST-dependent test:

```bash
python tools/run_offline_node24.py --test tests/wp_ast_adapter_runtime.test.js
```

Layer contract:

```bash
python tools/run_offline_node24.py tools/wp_layer_contract.js
```

Node-only command that does not need Oxc:

```bash
python tools/run_offline_node24.py --node-only --version
```

Focused end-to-end check of the offline core:

```bash
python tools/selftest_offline_repair_core.py
```

## Scope boundary

This core is suitable for Node-native tests, AST-backed source contracts, layer checks and many focused
architecture repairs. It does not make TypeScript, TSX, Vite, ESLint, Oxlint, Prettier, esbuild,
obfuscation, Playwright, browser binaries or the complete release toolchain available offline.
Install or vendor those tools only when the requested task genuinely needs them.
