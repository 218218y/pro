# WardrobePro (Pure ESM)

This repo is **Pure ESM** (no `window.App`, no `globalThis.THREE` inside `esm/`), **store‑driven** (SSOT), and **fail‑fast** (no silent legacy fallbacks).

The canonical architecture + rules live here:

- `docs/README.md` — compact docs index
- `docs/dev_guide.md` — engineering rules

## Quick start

```bash
npm install

# Open the production-like entry HTML (recommended)
npm run start:local

# Or run the Vite dev server
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
