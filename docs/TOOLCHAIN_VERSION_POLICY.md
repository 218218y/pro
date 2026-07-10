# Toolchain Version Policy

<!-- Tool-owned report target. Regenerate with: npm run toolchain:version-policy:report -->

TypeScript 7 cleanup is complete. Core toolchain packages are intentionally exact-pinned so future patch/minor upgrades happen in a dedicated dependency refresh, not as silent lockfile drift.

## Exact pinned packages

| Package           | package.json | package-lock root | resolved lock package | Role                                         | Future patch/minor policy                                                               |
| ----------------- | ------------ | ----------------- | --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `typescript`      | `7.0.2`      | `7.0.2`           | `7.0.2`               | Type correctness gate and TS7 compiler lane. | Keep exact at 7.0.2 until a dedicated TypeScript patch/minor refresh is approved.       |
| `eslint`          | `10.6.0`     | `10.6.0`          | `10.6.0`              | Strict JS/tools/tests/config lint gate.      | Keep exact; review patch/minor releases in a dedicated lint dependency refresh.         |
| `oxlint`          | `1.73.0`     | `1.73.0`          | `1.73.0`              | Blocking TS/TSX syntax lint gate.            | Keep exact while syntax diagnostics are 0; update only with parity report refresh.      |
| `oxlint-tsgolint` | `0.24.0`     | `0.24.0`          | `0.24.0`              | Audit-only type-aware lint lane.             | Keep exact; patch/minor updates belong to a later type-aware diagnostic burn-down pass. |
| `oxc-parser`      | `0.139.0`    | `0.139.0`         | `0.139.0`             | Internal AST adapter parser.                 | Keep exact; parser updates require `wp_ast_adapter` parity tests.                       |

## Removed packages that must stay absent

- TS ESLint parser package
- TS ESLint plugin package
- TypeScript 6 compatibility package

## Future update check

- Do not auto-upgrade TypeScript, Oxlint, oxlint-tsgolint, oxc-parser, or ESLint as part of feature work.
- For a future patch/minor refresh, run the normal quality gates, regenerate lint parity docs, and compare `lint:ts-modern:type-aware` diagnostics before/after.
- `lint:ts-modern:type-aware` remains audit-only; patch/minor updates should reduce or explain diagnostics before becoming blocking.

## Current status

Ready: all pinned toolchain versions are exact and removed TS ESLint packages are absent.
