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

## Optional TypeScript runtime-loader set: esbuild

Add the common package and the matching platform package. For Linux x64:

```text
vendor/offline/esbuild/esbuild-0.28.1.tgz
vendor/offline/esbuild/linux-x64-0.28.1.tgz
```

Verify and install:

```bash
python tools/verify_offline_repair_vendor.py --esbuild-only
python tools/bootstrap_offline_esbuild.py
python tools/selftest_offline_esbuild.py
```

This slice is required by `tests/_ts_runtime_module_loader.mjs` and therefore by the offline declaration
snapshot contract. The two packages must have the same exact version. The declaration snapshot additionally
uses the Oxc and TypeScript slices.

## Optional TypeScript runtime-test set: TSX

Add one archive; it reuses the esbuild files listed above:

```text
vendor/offline/tsx/tsx-4.23.1.tgz
```

Verify, install, and run focused TypeScript tests:

```bash
python tools/verify_offline_repair_vendor.py --tsx-only
python tools/bootstrap_offline_tsx.py
python tools/run_offline_tsx_tests.py tests/wave_c1_dimension_consolidation_runtime.test.ts
python tools/selftest_offline_tsx.py
```

## Optional compiler set: TypeScript 7

TypeScript 7 requires both the common launcher package and one matching native platform package. For Linux
x64 add:

```text
vendor/offline/typescript/typescript-7.0.2.tgz
vendor/offline/typescript/typescript-linux-x64-7.0.2.tgz
```

Verify, install, and run it independently of Oxc and Prettier:

```bash
python tools/verify_offline_repair_vendor.py --typescript-only
python tools/bootstrap_offline_typescript.py
python tools/run_offline_typescript.py --version
python tools/selftest_offline_typescript.py
```

Generated directories are `.tools/node24` and focused package paths under `node_modules`. They are ignored
by Git. The manifest also defines Linux ARM64 and Windows x64 variants; only the current platform's Node,
Oxc, esbuild, and TypeScript native archives are required. TSX itself is platform-neutral and uses the
matching esbuild platform package.
