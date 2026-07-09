# Lint Parity Report

<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->

Stage 7 completes TS/TSX parser removal: JS/tools/tests/config stay on strict ESLint, TS/TSX syntax stays on Oxlint, architecture rules stay on custom contracts, type correctness stays on TypeScript, and `wp_ast_adapter` remains on `oxc-parser`. The modern gate is now the primary lint path.

## Gate comparison

| Gate                           | Command                                               | Blocking? | Role                                                                                                | Stage 7 status                                                                                               |
| ------------------------------ | ----------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| lint modern                    | `npm run lint:modern`                                 | yes       | Primary lint gate combining strict JS ESLint, Oxlint syntax, and custom contracts.                  | blocking primary gate                                                                                        |
| lint legacy                    | `npm run lint:legacy`                                 | no        | Retired compatibility alias; it no longer owns TS/TSX linting.                                      | retired/no-op; kept temporarily so older automation fails gracefully                                         |
| lint JS/parser-removal dry-run | `npm run lint:js:strict`                              | yes       | ESLint profile that excludes TS/TSX and keeps JS/tools/tests/config coverage, including `no-undef`. | strict blocking JS gate with 0 warnings; TS/TSX stays outside ESLint and remains covered by the modern lanes |
| oxlint syntax                  | `npm run lint:ts-modern:syntax`                       | yes       | Fast modern parser/config/file-discovery lane for `esm` and `types`.                                | blocking; current syntax diagnostics are 0                                                                   |
| oxlint type-aware              | `npm run lint:ts-modern:type-aware`                   | no        | Future TypeScript semantic lint lane through `oxlint-tsgolint`.                                     | audit-only; TS7/tsgolint path is not a blocker yet                                                           |
| typecheck                      | `npm run typecheck:runtime && npm run typecheck:dist` | yes       | TypeScript compiler contracts and TS/JS check lanes.                                                | already canonical for type correctness                                                                       |
| custom contracts               | `npm run lint:contracts`                              | yes       | Project-owned quality rules that should survive parser/linter swaps.                                | matrix/parity docs, parser-removal readiness, and lint architecture contracts are blocking                   |

## Rule parity

| Rule                    | Legacy lint | Oxlint syntax | Oxlint type-aware  | Typecheck | Custom contracts | Classification          | Rationale                                                                                                              |
| ----------------------- | ----------- | ------------- | ------------------ | --------- | ---------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `eqeqeq`                | retired     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured with the same smart equality policy used by legacy ESLint.                                 |
| `no-const-assign`       | retired     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and JavaScript semantics cover const reassignment.                                                  |
| `no-dupe-keys`          | retired     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and `wp_check_syntax` both cover duplicate object keys.                                             |
| `no-redeclare`          | retired     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint reports redeclarations; legacy ESLint stays as a temporary compatibility gate until the parser-removal dry-run. |
| `no-restricted-globals` | retired     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts`; architecture baseline is 0, so every new violation fails.                |
| `no-restricted-imports` | retired     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` and existing layer contracts; architecture baseline is 0.                 |
| `no-restricted-syntax`  | retired     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` through the AST adapter, without depending on ESLint selectors.           |
| `no-undef`              | retired     | not owner     | not required today | partial   | not owner        | blocked by tool support | TS/TSX should rely on TypeScript; JS/tools still need ESLint globals policy.                                           |
| `no-unreachable`        | retired     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and TypeScript syntax/typecheck catch unreachable syntax classes.                                   |
| `no-unused-vars`        | retired     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured to match legacy underscore ignore behavior for variables and catch bindings.               |

## Parser removal readiness

| Rule                    | Future owner                           | Blocking command                                                                         | Ready? | Notes                                                                                                            |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `eqeqeq`                | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                          | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-const-assign`       | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                          | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-dupe-keys`          | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                          | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-redeclare`          | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                          | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-restricted-globals` | custom lint contracts                  | `npm run lint:contracts`                                                                 | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                           |
| `no-restricted-imports` | custom lint contracts                  | `npm run lint:contracts`                                                                 | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                           |
| `no-restricted-syntax`  | custom lint contracts                  | `npm run lint:contracts`                                                                 | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                           |
| `no-undef`              | ESLint JS/tools + TypeScript typecheck | `npm run lint:js:strict; TS/TSX via npm run typecheck:runtime && npm run typecheck:dist` | yes    | Not a TS/TSX parser-removal blocker: ESLint keeps JS/tools globals, while TS/TSX relies on TypeScript typecheck. |
| `no-unreachable`        | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                          | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-unused-vars`        | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                          | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |

## Architecture contract baseline

The custom lint architecture contract baseline is 0. Every new architecture violation fails, and stale baseline entries fail as well.

## Stage 7 decision

- Do not update to TypeScript 7 yet.
- The previous TS-specific ESLint parser/plugin packages are removed from package metadata and config.
- `lint:modern` is the primary lint gate: `lint:js:strict`, `lint:ts-modern:syntax`, and `lint:contracts`.
- `quality:ts-modern` is the primary TypeScript quality bundle and intentionally excludes the retired legacy alias.
- `lint:ts-modern:type-aware` remains audit-only with known diagnostics; it is not a Stage 7 blocker.
