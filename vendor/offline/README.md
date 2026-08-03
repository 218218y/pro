# Offline focused-tool archives

This directory stores manually downloaded archives used by focused repair tasks. The bootstrap never runs
`npm install`, never resolves packages, and never executes lifecycle scripts. Every file is validated against `vendor/offline/manifest.json`, `.node-version`, its pinned checksum, and `package-lock.json` where the offline slice is lock-coupled. The Oxc AST slice is a separately signed compatibility fallback: its version may lag the active parser while both remain inside the reviewed manifest window and pass the same adapter contract.

The native offline vendor is intentionally limited to Linux x64 with glibc. Windows, macOS, musl Linux, and
ARM hosts fail immediately with `Offline repair vendor supports Linux x64 glibc only`; the tools do not look
for an archive or offer a download URL on those platforms. Prettier and TSX remain platform-neutral packages,
but their offline launch path still depends on the vendored Linux x64 Node runtime (and esbuild for TSX).

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

## Optional TypeScript runtime-test set: TSX

Add one archive; it reuses the esbuild files listed above:

```text
vendor/offline/tsx/tsx-<LOCKFILE_VERSION>.tgz
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
by Git. The manifest defines only the Linux x64 Node, Oxc, esbuild, and TypeScript native archives that are
actually shipped in this directory. TSX itself is platform-neutral and uses the Linux x64 esbuild package.
