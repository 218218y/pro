# Offline focused repair toolchain

## Purpose

The full project toolchain is intentionally large. Most focused architecture and source repairs need a much
smaller trusted set:

- repository-pinned Node `24.18.0`;
- active project parser `oxc-parser 0.142.x` from `package-lock.json`;
- signed offline Oxc bundle whose exact version is declared in `vendor/offline/manifest.json`;
- matching offline `@oxc-project/types`;
- the matching Linux x64 glibc native Oxc parser binding;
- optionally, lockfile-pinned esbuild plus its Linux x64 native package;
- optionally, lockfile-pinned TSX, reusing the compatible esbuild slice;
- a generated `tsx-tests` profile containing every production runtime dependency and transitive package
  needed by `.ts`/`.tsx` tests on Linux x64 glibc;
- a generated `vite-build` profile containing Vite, `@vitejs/plugin-react`, their transitive packages, and
  only the GNU/Linux x64 Rolldown and Lightning CSS bindings;
- optionally, lockfile-pinned Prettier;
- optionally, lockfile-pinned TypeScript 7 plus its Linux x64 native package;
- optionally, lockfile-pinned Oxlint plus its GNU/Linux x64 binding and the matching `oxlint-tsgolint`
  type-aware backend.

The bootstrap extracts only explicitly listed archives. The workspace profile is resolved ahead of time from
`package-lock.json`; installation itself does not invoke npm, resolve packages, run lifecycle scripts, install
Playwright browsers, or install the complete lint/build/release toolchain. The
offline vendor supports Linux x64 with glibc only. Windows, macOS, musl Linux, and ARM fail before archive
lookup with `Offline repair vendor supports Linux x64 glibc only`.

## Required archives for Linux x64

### Node and AST core

```text
vendor/offline/node/node-v24.18.0-linux-x64.tar.xz
vendor/offline/ast/oxc-parser-<AST_VERSION>.tgz
vendor/offline/ast/types-<AST_VERSION>.tgz
vendor/offline/ast/binding-linux-x64-gnu-<AST_VERSION>.tgz
```

### Optional Prettier slice

```text
vendor/offline/prettier/prettier-<LOCKFILE_VERSION>.tgz
```

### Optional esbuild runtime slice

```text
vendor/offline/esbuild/esbuild-<LOCKFILE_VERSION>.tgz
vendor/offline/esbuild/linux-x64-<LOCKFILE_VERSION>.tgz
```

Both archives are required. The common package provides the JavaScript API imported by
`tests/_ts_runtime_module_loader.mjs`; the platform package provides the native executable.

### Optional TSX runtime-test slice

```text
vendor/offline/tsx/tsx-<LOCKFILE_VERSION>.tgz
```

TSX is a platform-neutral JavaScript package and reuses the exact esbuild dependency range recorded in
`package-lock.json`. The synchronizer rejects an incompatible vendored esbuild version. The macOS-only
`fsevents` dependency is optional and is not part of this Linux-only slice.

The TSX archive is only the transformer/loader. Tests importing project UI or services additionally need the
generated workspace closure under:

```text
vendor/offline/runtime/*.tgz
```

That list is derived from every production dependency, including transitive and required peer dependencies.
TSX and esbuild remain separate focused toolchain slices. Platform filtering keeps only Linux x64 glibc packages such as
`@napi-rs/canvas-linux-x64-gnu`; Windows, macOS, ARM, and musl variants never enter the profile.

### Optional Vite 8 build slice

The Vite plan is generated from the exact lockfile entries for `vite 8.2.0` and
`@vitejs/plugin-react 6.0.5`. Their complete required dependency closure is stored under:

```text
vendor/offline/vite/*.tgz
```

The profile includes native GNU/Linux x64 packages for Rolldown and Lightning CSS. It excludes macOS,
Windows, ARM, musl, `fsevents`, and Rolldown's WASI fallback. Production dependencies remain owned by the
existing `tsx-tests` profile; the offline Vite runner installs both profiles before invoking the Vite CLI.

### Optional TypeScript 7 slice

```text
vendor/offline/typescript/typescript-<LOCKFILE_VERSION>.tgz
vendor/offline/typescript/typescript-linux-x64-<LOCKFILE_VERSION>.tgz
```

TypeScript 7 is native. The common `typescript` package contains the `tsc` launcher and platform resolver;
the `@typescript/typescript-linux-x64` package contains the native compiler executable and standard libraries.
Both archives at the same exact version are required. The filenames match the download basenames. Do not
extract or rename them.

### Optional Oxlint slice

```text
vendor/offline/oxlint/oxlint-<LOCKFILE_VERSION>.tgz
vendor/offline/oxlint/binding-linux-x64-gnu-<LOCKFILE_VERSION>.tgz
vendor/offline/oxlint/oxlint-tsgolint-<LOCKFILE_VERSION>.tgz
vendor/offline/oxlint/linux-x64-<LOCKFILE_VERSION>.tgz
```

The common `oxlint` package supplies the CLI launcher and loads the GNU/Linux x64 binding. The project's
blocking type-aware command additionally requires `oxlint-tsgolint` and its Linux x64 native package. All four
entries are resolved from `package-lock.json`; the synchronizer rejects a mismatched binding, a non-Linux
platform package, or a type-aware version outside Oxlint's peer range.

## Verify and bootstrap Node/Oxc

```bash
python tools/verify_offline_repair_vendor.py
python tools/bootstrap_offline_repair_core.py
```

Linux convenience command:

```bash
tools/bootstrap_offline_repair_core.sh
```

The core bootstrap verifies the Node version and SHA-256, the signed offline Oxc archive URLs and SHA-512 integrity values, the reviewed compatibility window against the active lockfile parser, the extracted Node executable, and a real Oxc parse operation. The offline fallback is intentionally independent from the active npm resolution so a reviewed online patch update does not invalidate emergency repair tooling.

## Update the active Oxc parser

Use the repository command rather than editing the version and generated policy files separately:

```bash
npm run deps:update:oxc
```

The active parser is bounded to `>=0.142.0 <0.143.0`, so reviewed `0.142.x` patches may advance while `0.143.0` remains blocked pending a new AST compatibility review. The signed offline bundle may lag inside the reviewed manifest window, but it can be synchronized to the exact active lockfile version with:

```bash
npm run vendor:offline:oxc:refresh
npm run vendor:offline:oxc:check
```

The refresh command downloads only the official npm tarballs recorded in `package-lock.json`, verifies their SHA-512 integrity and embedded package name/version, updates `vendor/offline/manifest.json`, and removes superseded Oxc archives only after the new bundle is complete.

### Direct 0.142.0 archive URLs

For manual download of the current Linux x64 glibc bundle:

```text
https://registry.npmjs.org/oxc-parser/-/oxc-parser-0.142.0.tgz
https://registry.npmjs.org/@oxc-project/types/-/types-0.142.0.tgz
https://registry.npmjs.org/@oxc-parser/binding-linux-x64-gnu/-/binding-linux-x64-gnu-0.142.0.tgz
```

Place them under `vendor/offline/ast/` without renaming them, then run `npm run vendor:offline:oxc:adopt`. The command verifies the downloaded archives against `package-lock.json`, updates the manifest and removes the superseded files without downloading them again.

## Synchronize lockfile-backed offline packages

The npm-backed slices (`esbuild`, `tsx`, `prettier`, `typescript`, and `oxlint` with its type-aware
backend) are synchronized from `package-lock.json`; their versions are not maintained separately in tests or documentation. The refresh
command first adopts a correctly named archive that is already present, otherwise it downloads the official
npm tarball. It verifies SHA-512 integrity, embedded package name/version, native executable layout, and the
esbuild binary hash before atomically updating `vendor/offline/manifest.json`. Superseded archives are removed
only after the complete replacement set is verified.

```bash
npm run vendor:offline:packages:refresh
npm run vendor:offline:packages:check
```

The complete package refresh now includes the four Oxlint archives. To print or refresh only that slice:

```bash
npm run vendor:offline:oxlint:downloads
npm run vendor:offline:oxlint:refresh
npm run vendor:offline:oxlint:check
```

For manual downloads, place the untouched files at the paths printed by `downloads` and run
`npm run vendor:offline:oxlint:adopt`.

For a TSX-only update:

```bash
npm run vendor:offline:tsx:downloads
npm run vendor:offline:tsx:refresh
npm run vendor:offline:tsx:check
```

When downloads are performed manually, run `npm run vendor:offline:tsx:downloads` to print the exact official
URL and destination path, place the untouched `.tgz` there, then run `npm run vendor:offline:tsx:adopt`.
`npm run deps:update:sync-generated` now runs the package synchronizer, so the normal dependency-update flows
refresh these offline slices automatically instead of leaving the manifest and contracts stale.

The TSX-test workspace profile has an independent plan/check flow. Plan operations do not require downloaded
archives and therefore catch stale dependency graphs immediately after a lockfile change:

```bash
npm run vendor:offline:tsx-tests:plan
npm run vendor:offline:tsx-tests:check-plan
npm run vendor:offline:tsx-tests:downloads
```

`downloads` prints only missing or invalid archives with their exact official npm URL and repository path.
For automatic download use `npm run vendor:offline:tsx-tests:refresh`. For manual downloads, place every file
at the printed path and run `npm run vendor:offline:tsx-tests:adopt`. Both paths verify SHA-512 integrity and
embedded package metadata, update the manifest atomically, and remove obsolete runtime archives only after a
complete successful replacement. The manifest stores a SHA-256 fingerprint of `package-lock.json`; any lockfile
change blocks a stale workspace plan until it is regenerated. `deps:update:sync-generated` refreshes this
profile as well.

The Vite build profile uses the same lockfile-fingerprint contract, but planning does not require any Vite
archive to be present:

```bash
npm run vendor:offline:vite-build:plan
npm run vendor:offline:vite-build:check-plan
npm run vendor:offline:vite-build:downloads
```

After manually placing every printed archive under `vendor/offline/vite/`, adopt and verify them with:

```bash
npm run vendor:offline:vite-build:adopt
npm run vendor:offline:vite-build:check
```

For an online refresh, use `npm run vendor:offline:vite-build:refresh`. The dependency update workflow runs
that refresh after the focused npm components and the TSX runtime profile, so Vite upgrades cannot leave the
offline plan stale.

Install and run the build tool without npm resolution or lifecycle scripts:

```bash
npm run verify:offline:vite
npm run setup:offline:vite
npm run run:offline:vite -- --version
npm run vite:build:offline
npm run vite:build:modules:offline
```

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

Node tests that import production packages can opt into the same Linux-only runtime profile without using
TSX:

```bash
python tools/run_offline_node24.py --with-runtime --test tests/interior_tab_sections_runtime.test.js
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

## Verify and run TSX tests with project runtime dependencies

The TSX path installs the lockfile-pinned TSX archive, reuses the existing esbuild common and platform
packages, and extracts the generated `tsx-tests` workspace profile. This closes the gap where TSX could
transform a test but then failed with `ERR_MODULE_NOT_FOUND` for `react`, `three`, `zustand`, PDF packages, or
Supabase. It never invokes `npx`, npm resolution, or lifecycle scripts during installation.

```bash
python tools/verify_offline_repair_vendor.py --tsx-only
python tools/bootstrap_offline_tsx.py
python tools/run_offline_tsx_tests.py tests/design_tab_sections_runtime.test.tsx
python tools/selftest_offline_tsx.py
```

The TSX self-test runs one composite `.tsx` smoke test that loads React/React DOM SSR, Three.js, Zustand,
PDF-Lib, PDF.js, Supabase, fontkit, and the browserless Order PDF classifier. It uses one isolated Node process
group and closes any native esbuild service that outlives the test leader, preventing intermittent Linux hangs
caused by retained stdout/stderr descriptors. Matching installs are reused; destructive replacement remains an
explicit bootstrap `--force` operation.

The compiler-heavy declaration snapshot remains an independent TypeScript proof under
`npm run test:offline:declaration-snapshot`; it is intentionally not mixed into the TSX runtime verifier. The
Order PDF classifier is separated from the Playwright E2E helper, so the runtime proof does not require
`@playwright/test`, `playwright`, browser packages, or downloaded browser binaries.

Before downloading the workspace closure, the engine can still be validated independently:

```bash
python tools/verify_offline_repair_vendor.py --tsx-engine-only
python tools/bootstrap_offline_tsx.py --engine-only
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

Generated-report verification also imports Prettier as a library. In a clean chat workspace, use the offline
Node runner so the formatter package is installed before report generators are spawned:

```bash
npm run check:generated-reports:offline
npm run report:generated:offline
```

The regular `check:generated-reports` and `report:generated` commands remain available for a normal
`npm install` workspace.

## Verify and run TypeScript 7 independently

The TypeScript path does not require Oxc or Prettier. It validates the common package and the Linux x64
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

## Verify and run Oxlint independently

The Oxlint path validates all four archives against `package-lock.json`, installs them directly under their
locked `node_modules` paths without npm or lifecycle scripts, and probes the exact CLI version. The runners
pin `OXLINT_TSGOLINT_PATH` to the extracted backend so the type-aware audit cannot silently use a global tool.

```bash
npm run verify:offline:oxlint
npm run setup:offline:oxlint
npm run run:offline:oxlint -- --version
npm run lint:ts-modern:syntax:offline
npm run lint:ts-modern:type-aware:offline
```

`npm run vendor:offline:packages:refresh` downloads this slice together with the other lockfile-backed tools.
When only Oxlint is missing, `npm run vendor:offline:oxlint:refresh` is the smaller equivalent.

## Scope boundary

This focused toolchain covers Node-native tests, AST-backed source contracts, layer checks, formatting,
TypeScript typechecking, declaration emission, the esbuild-backed TypeScript runtime loader, repository
`.ts`/`.tsx` runtime tests whose production dependencies are represented in the lock-derived workspace
profile, and Vite 8 builds using the project's React plugin. It provides Oxlint and Vite, but does not provide
ESLint, release-only minifiers and obfuscators, Playwright, or browser binaries. `package-lock.json` remains
cross-platform for normal installs;
only the checked-in `vendor/offline` repair path is Linux x64 glibc-only.
