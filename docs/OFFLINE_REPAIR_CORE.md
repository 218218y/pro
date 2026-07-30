# Offline focused repair toolchain

## Purpose

The full project toolchain is intentionally large. Most focused architecture and source repairs need a much
smaller trusted set:

- repository-pinned Node `24.18.0`;
- `oxc-parser 0.141.0`;
- `@oxc-project/types 0.141.0`;
- one native Oxc parser binding for the current platform;
- optionally, lockfile-pinned esbuild `0.28.1` plus its native platform package;
- optionally, lockfile-pinned Prettier `3.9.6`;
- optionally, lockfile-pinned TypeScript `7.0.2` plus its native platform package.

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

### Optional esbuild runtime slice

```text
vendor/offline/esbuild/esbuild-0.28.1.tgz
vendor/offline/esbuild/linux-x64-0.28.1.tgz
```

Both archives are required. The common package provides the JavaScript API imported by
`tests/_ts_runtime_module_loader.mjs`; the platform package provides the native executable.

### Optional TypeScript 7 slice

```text
vendor/offline/typescript/typescript-7.0.2.tgz
vendor/offline/typescript/typescript-linux-x64-7.0.2.tgz
```

TypeScript 7 is native. The common `typescript` package contains the `tsc` launcher and platform resolver;
the `@typescript/typescript-linux-x64` package contains the native compiler executable and standard libraries.
Both archives at the same exact version are required. The filenames match the download basenames. Do not
extract or rename them.

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

## Verify and run esbuild independently

The esbuild path does not require Oxc or Prettier. It validates both archives against the lockfile, verifies
the native executable SHA-256 embedded by the matching common package, and performs a real TypeScript
transform before returning success.

```bash
python tools/verify_offline_repair_vendor.py --esbuild-only
python tools/bootstrap_offline_esbuild.py
python tools/selftest_offline_esbuild.py
```

The self-test imports the repository's real `tests/_ts_runtime_module_loader.mjs` and performs a TypeScript
transform through it. The declaration-snapshot contract additionally needs the Oxc and TypeScript slices:

```bash
npm run test:offline:declaration-snapshot
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

## Verify and run TypeScript 7 independently

The TypeScript path does not require Oxc or Prettier. It validates the common package and the current
platform-native package against `package-lock.json`, replaces any stale local compiler, and proves the native
compiler reports the exact pinned version.

```bash
python tools/verify_offline_repair_vendor.py --typescript-only
python tools/bootstrap_offline_typescript.py
python tools/run_offline_typescript.py --version
python tools/selftest_offline_typescript.py
```

Canonical project checks through offline Node 24 and TypeScript 7:

```bash
npm run typecheck:offline
npm run typecheck:offline:dist
npm run typecheck:offline:all
npm run test:offline:declaration-snapshot
```

Direct compiler usage:

```bash
python tools/run_offline_typescript.py -p tsconfig.dist.json --noEmit
```

Do not set `WP_ALLOW_SYSTEM_TSC=1` for these checks. A system compiler such as TypeScript 5.8.3 is not a valid
replacement for the repository-pinned TypeScript 7.0.2 compiler, and declaration snapshots must not be
regenerated to hide that mismatch.

## Scope boundary

This focused toolchain covers Node-native tests, AST-backed source contracts, layer checks, formatting,
TypeScript typechecking, declaration emission, and the esbuild-backed TypeScript runtime loader. It does not
provide general TSX execution, ESLint/Oxlint, Vite, release bundling, obfuscation, Playwright, or browser
binaries.

The next optional expansion is `tsx` itself, because a large part of the runtime test portfolio is TypeScript.
It should be added as its own verified slice; esbuild is now already available as the required native base.
