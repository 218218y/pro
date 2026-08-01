# WardrobePro (Pure ESM)

This repo is **Pure ESM** (no `window.App`, no `globalThis.THREE` inside `esm/`), **store‑driven** (SSOT), and **fail‑fast** (no silent legacy fallbacks).

The canonical architecture + rules live here:

- `docs/README.md` — compact docs index
- `docs/dev_guide.md` — engineering rules

## Runtime

Node 24 remains the primary development, CI, and deployment runtime through the exact
version in `.node-version`. Node 22 is also supported from the exact compatibility floor in
`.node-version-compat`; `engines`, `devEngines`, runtime contracts, and a dedicated CI lane
accept both supported lines. `@types/node` is intentionally pinned to Node 22, the lowest
supported runtime, so typechecking cannot silently introduce Node 24-only APIs.

## Quick start

```bash
npm install

# Main development site (fixed Cloud Sync origin: localhost:5173)
npm run start:local

# Customer/site2 development site (fixed Cloud Sync origin: localhost:5174)
npm run start:site2

# Run both development sites together
npm run start:pair

# Or run the generic Vite dev server
npm run vite:dev
```

### Entry points (important)

- `esm/entry_pro.ts` (source) / `dist/esm/entry_pro.js` (built) — **Browser adapter** (allowed to touch `window`/`document`).
- `esm/main.ts` (source) / `dist/esm/main.js` (built) — **Pure core** (no globals, no side-effects on import).

## Before you push

```bash
# Format only files touched in your current Git worktree/index.
npm run format:changed

# Optional: install the fast pre-commit hook.
# It formats only staged files before each commit.
npm run hooks:install

# Optional and heavier: also install full verify before push.
# This is not the default because GitHub Desktop/Windows can be fragile around pre-push stdin.
npm run hooks:install:full

# Fast, CI-friendly pre-merge gate (skips bundle/release output)
npm run gate

# Full local pre-release suite (includes bundle/release output)
npm run gate:full
```

## Filtered networks / offline

`libs/` contains local copies of essential dependencies (including THREE). In filtered networks, CDNs may be blocked — local libs are the anchor.

For focused source and architecture repairs, the repository includes a narrow offline bootstrap for the
primary Node runtime, AST adapter dependencies, the esbuild-backed TypeScript runtime loader, and optional
standalone TSX, Prettier, and TypeScript packages. This vendored repair path supports Linux x64 with glibc
only; it rejects Windows, macOS, musl, and ARM before archive lookup. Download the pinned archives into
`vendor/offline`, then run:

```bash
python tools/verify_offline_repair_vendor.py
python tools/bootstrap_offline_repair_core.py
python tools/run_offline_node24.py --test tests/wp_ast_adapter_runtime.test.js

# Optional formatter slice
python tools/verify_offline_repair_vendor.py --prettier-only
python tools/bootstrap_offline_prettier.py
python tools/run_offline_prettier.py --check tools/wp_prettier_changed.mjs

# Optional esbuild slice used by TS runtime loaders and declaration snapshot tests
python tools/verify_offline_repair_vendor.py --esbuild-only
python tools/bootstrap_offline_esbuild.py
python tools/selftest_offline_esbuild.py

# Optional TSX runtime-test slice (reuses the offline esbuild packages)
python tools/verify_offline_repair_vendor.py --tsx-only
python tools/bootstrap_offline_tsx.py
python tools/run_offline_tsx_tests.py tests/wave_c1_dimension_consolidation_runtime.test.ts

# Optional exact TypeScript 7 compiler slice
python tools/verify_offline_repair_vendor.py --typescript-only
python tools/bootstrap_offline_typescript.py
python tools/run_offline_typescript.py --version
```

See `docs/OFFLINE_REPAIR_CORE.md`. These paths intentionally avoid installing the full toolchain and refuse
to substitute a different system TypeScript version for the lockfile-pinned compiler.
