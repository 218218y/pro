# Offline focused-tool archives

This directory stores manually downloaded archives used by focused repair tasks. The bootstrap never runs
`npm install`, never resolves packages, and never executes lifecycle scripts. Every file is validated against `vendor/offline/manifest.json`, `.node-version`, its pinned checksum, and `package-lock.json` where the offline slice is lock-coupled. The Oxc AST slice is a separately signed compatibility fallback: its version may lag the active parser while both remain inside the reviewed manifest window and pass the same adapter contract.

The native offline vendor is intentionally limited to Linux x64 with glibc. Windows, macOS, musl Linux, and
ARM hosts fail immediately with `Offline repair vendor supports Linux x64 glibc only`; the tools do not look
for an archive or offer a download URL on those platforms. Prettier and TSX remain platform-neutral packages,
but their offline launch path still depends on the vendored Linux x64 Node runtime (and esbuild for TSX). A
separate lockfile-derived `tsx-tests` workspace profile supplies project runtime dependencies required by
React, Three.js, PDF, Supabase, and other `.ts`/`.tsx` tests.

## Core set: Node 24 + Oxc AST compatibility fallback

Minimum set for the usual ChatGPT/Linux x64 glibc environment:

```text
vendor/offline/node/node-v24.18.0-linux-x64.tar.xz
vendor/offline/ast/oxc-parser-<AST_VERSION>.tgz
vendor/offline/ast/types-<AST_VERSION>.tgz
vendor/offline/ast/binding-linux-x64-gnu-<AST_VERSION>.tgz
```

The names above intentionally match the filenames emitted by the official download URLs. Do not prepend package scopes or rename them. The project may use a newer active `oxc-parser` from `package-lock.json`; the offline bundle remains valid only inside `ast.compatibleProjectRange` and is exercised by the same AST adapter runtime contract. To synchronize it to the active lockfile version automatically, run `npm run vendor:offline:oxc:refresh`. When the three official tarballs were downloaded manually, run `npm run vendor:offline:oxc:adopt` instead. Then validate the local archives with `npm run vendor:offline:oxc:check`.

Verify and install:

```bash
python tools/verify_offline_repair_vendor.py
python tools/bootstrap_offline_repair_core.py
```

## Keep npm-backed slices synchronized

`package-lock.json` is the single source of truth for esbuild, TSX, Prettier, and TypeScript. Do not edit their
manifest versions or download URLs by hand.

```bash
npm run vendor:offline:packages:downloads
npm run vendor:offline:packages:refresh
npm run vendor:offline:packages:check
```

`downloads` prints exact official URLs and destination paths. `refresh` adopts valid files already present and
downloads only missing targets. For a completely manual/no-network flow, place the files first and run
`npm run vendor:offline:packages:adopt`. All archives are checked against lockfile integrity and embedded npm
metadata before the manifest is replaced; old `.tgz` files are cleaned only after success.

## Optional formatter set: Prettier

Add one additional archive:

```text
vendor/offline/prettier/prettier-<LOCKFILE_VERSION>.tgz
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
vendor/offline/esbuild/esbuild-<LOCKFILE_VERSION>.tgz
vendor/offline/esbuild/linux-x64-<LOCKFILE_VERSION>.tgz
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

## Optional TypeScript runtime-test set: TSX + project runtime profile

The TSX engine adds one archive and reuses the esbuild files listed above:

```text
vendor/offline/tsx/tsx-<LOCKFILE_VERSION>.tgz
```

TSX itself can transform dependency-free tests, but UI and service tests also import production packages. The
complete Linux-only dependency closure is generated into `manifest.workspace.profiles.tsx-tests` from
`package-lock.json` and stored under `vendor/offline/runtime/`.

Prepare the plan and print only missing archives:

```bash
npm run vendor:offline:tsx-tests:plan
npm run vendor:offline:tsx-tests:downloads
```

Download automatically, or place every printed archive manually and adopt it:

```bash
npm run vendor:offline:tsx-tests:refresh
# or: npm run vendor:offline:tsx-tests:adopt
npm run vendor:offline:tsx-tests:check
```

Verify, install, and run complete TypeScript tests:

```bash
python tools/verify_offline_repair_vendor.py --tsx-only
python tools/bootstrap_offline_tsx.py
python tools/run_offline_tsx_tests.py tests/design_tab_sections_runtime.test.tsx
python tools/selftest_offline_tsx.py
```

To validate only the TSX/esbuild engine before downloading the project runtime closure:

```bash
python tools/verify_offline_repair_vendor.py --tsx-engine-only
python tools/bootstrap_offline_tsx.py --engine-only
```

Plain JavaScript tests that import production packages can use the same profile through
`python tools/run_offline_node24.py --with-runtime ...`.

Generated report checks use Prettier as an imported library, not only as a CLI. Run them in a clean offline
workspace with:

```bash
npm run check:generated-reports:offline
npm run report:generated:offline
```

These commands install the pinned Prettier archive and the offline AST packages before spawning report tools.

## Optional compiler set: TypeScript 7

TypeScript 7 requires both the common launcher package and one matching native platform package. For Linux
x64 add:

```text
vendor/offline/typescript/typescript-<LOCKFILE_VERSION>.tgz
vendor/offline/typescript/typescript-linux-x64-<LOCKFILE_VERSION>.tgz
```

Verify, install, and run it independently of Oxc and Prettier:

```bash
python tools/verify_offline_repair_vendor.py --typescript-only
python tools/bootstrap_offline_typescript.py
python tools/run_offline_typescript.py --version
python tools/selftest_offline_typescript.py
```

Generated directories are `.tools/node24` and focused package paths under `node_modules`. They are ignored
by Git. The manifest defines only Linux x64 glibc native archives for the offline path. TSX itself is
platform-neutral, uses the Linux x64 esbuild package, and installs its project runtime profile without npm or
lifecycle scripts.
