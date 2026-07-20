# Toolchain Version Policy

<!-- Tool-owned report target. Regenerate with: npm run toolchain:version-policy:report -->

TypeScript 7 cleanup is complete. Core toolchain packages are intentionally exact-pinned so future patch/minor upgrades happen in a dedicated dependency refresh, not as silent lockfile drift. `@types/node` is pinned to the same major as the canonical Node runtime in `.node-version`.

## Exact pinned packages

| Package           | package.json | package-lock root | resolved lock package | Role                                                                  | Future patch/minor policy                                                                    |
| ----------------- | ------------ | ----------------- | --------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `typescript`      | `7.0.2`      | `7.0.2`           | `7.0.2`               | Type correctness gate and TS7 compiler lane.                          | Keep exact at 7.0.2 until a dedicated TypeScript patch/minor refresh is approved.            |
| `@types/node`     | `24.13.3`    | `24.13.3`         | `24.13.3`             | Node tool/test type surface aligned to the pinned Node runtime major. | Keep exact and on the same major as `.node-version`; refresh with Node runtime updates.      |
| `eslint`          | `10.7.0`     | `10.7.0`          | `10.7.0`              | Strict JS/tools/tests/config lint gate.                               | Keep exact; review patch/minor releases in a dedicated lint dependency refresh.              |
| `oxlint`          | `1.74.0`     | `1.74.0`          | `1.74.0`              | Blocking TS/TSX syntax lint gate.                                     | Keep exact while syntax diagnostics are 0; update only with parity report refresh.           |
| `oxlint-tsgolint` | `0.25.0`     | `0.25.0`          | `0.25.0`              | Blocking type-aware lint lane.                                        | Keep exact while type-aware diagnostics are 0; updates require a zero-diagnostic parity run. |
| `oxc-parser`      | `0.140.0`    | `0.140.0`         | `0.140.0`             | Internal AST adapter parser.                                          | Keep exact; parser updates require `wp_ast_adapter` parity tests.                            |

## Removed packages that must stay absent

- TS ESLint parser package
- TS ESLint plugin package
- TypeScript 6 compatibility package

## Future update check

- Do not auto-upgrade TypeScript, Oxlint, oxlint-tsgolint, oxc-parser, or ESLint as part of feature work.
- For a future patch/minor refresh, run the normal quality gates, regenerate lint parity docs, and prove `lint:ts-modern:type-aware` remains at 0 diagnostics.
- `lint:ts-modern:type-aware` is blocking; patch/minor updates must preserve the global zero contract.

## Current status

Ready: all pinned toolchain versions are exact, `@types/node` matches the pinned Node major, and removed TS ESLint packages are absent.
