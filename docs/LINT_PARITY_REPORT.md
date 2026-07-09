# Lint Parity Report

<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->

Stage 5 keeps the legacy ESLint compatibility gate intact while promoting the JS-only ESLint dry-run, Oxlint syntax, and custom lint contracts to blocking parser-removal readiness gates. The report explains what is covered, which command owns each rule, and why TS/TSX is not removed from `@typescript-eslint/parser` until the next dry-run.

## Gate comparison

| Gate                           | Command                                               | Blocking? | Role                                                                                                | Stage 5 status                                                                                |
| ------------------------------ | ----------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| lint legacy                    | `npm run lint:legacy`                                 | yes       | Current compatibility ESLint migrate profile, including `@typescript-eslint/parser` for TS/TSX.     | temporary compatibility gate only; not the final Stage 5 target split                         |
| lint JS/parser-removal dry-run | `npm run lint:parser-removal-dry-run`                 | yes       | ESLint profile that excludes TS/TSX and keeps JS/tools/tests/config coverage, including `no-undef`. | blocking dry-run; proves TS/TSX can leave `@typescript-eslint/parser` while JS remains linted |
| oxlint syntax                  | `npm run lint:ts-modern:syntax`                       | yes       | Fast modern parser/config/file-discovery lane for `esm` and `types`.                                | blocking; current syntax diagnostics are 0                                                    |
| oxlint type-aware              | `npm run lint:ts-modern:type-aware`                   | no        | Future TypeScript semantic lint lane through `oxlint-tsgolint`.                                     | audit-only; TS7/tsgolint path is not a blocker yet                                            |
| typecheck                      | `npm run typecheck:runtime && npm run typecheck:dist` | yes       | TypeScript compiler contracts and TS/JS check lanes.                                                | already canonical for type correctness                                                        |
| custom contracts               | `npm run lint:contracts`                              | yes       | Project-owned quality rules that should survive parser/linter swaps.                                | matrix/parity docs, parser-removal readiness, and lint architecture contracts are blocking    |

## Rule parity

| Rule                                | Legacy lint | Oxlint syntax | Oxlint type-aware  | Typecheck | Custom contracts | Classification          | Rationale                                                                                                              |
| ----------------------------------- | ----------- | ------------- | ------------------ | --------- | ---------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars` | covered     | candidate     | not required today | partial   | not owner        | covered by modern gate  | Oxlint syntax now covers the TS unused-vars migration lane with legacy underscore ignore parity.                       |
| `eqeqeq`                            | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured with the same smart equality policy used by legacy ESLint.                                 |
| `no-const-assign`                   | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and JavaScript semantics cover const reassignment.                                                  |
| `no-dupe-keys`                      | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and `wp_check_syntax` both cover duplicate object keys.                                             |
| `no-redeclare`                      | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint reports redeclarations; legacy ESLint stays as a temporary compatibility gate until the parser-removal dry-run. |
| `no-restricted-globals`             | covered     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts`; architecture baseline is 0, so every new violation fails.                |
| `no-restricted-imports`             | covered     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` and existing layer contracts; architecture baseline is 0.                 |
| `no-restricted-syntax`              | covered     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` through the AST adapter, without depending on ESLint selectors.           |
| `no-undef`                          | covered     | not owner     | not required today | partial   | not owner        | blocked by tool support | TS/TSX should rely on TypeScript; JS/tools still need ESLint globals policy.                                           |
| `no-unreachable`                    | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and TypeScript syntax/typecheck catch unreachable syntax classes.                                   |
| `no-unused-vars`                    | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured to match legacy underscore ignore behavior for variables and catch bindings.               |

## Parser removal readiness

| Rule                                | Future owner                           | Blocking command                                                                  | Ready? | Notes                                                                                                            |
| ----------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars` | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `eqeqeq`                            | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-const-assign`                   | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-dupe-keys`                      | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-redeclare`                      | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-restricted-globals`             | custom lint contracts                  | `npm run lint:contracts`                                                          | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                           |
| `no-restricted-imports`             | custom lint contracts                  | `npm run lint:contracts`                                                          | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                           |
| `no-restricted-syntax`              | custom lint contracts                  | `npm run lint:contracts`                                                          | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                           |
| `no-undef`                          | ESLint JS/tools + TypeScript typecheck | `npm run lint:js; TS/TSX via npm run typecheck:runtime && npm run typecheck:dist` | yes    | Not a TS/TSX parser-removal blocker: ESLint keeps JS/tools globals, while TS/TSX relies on TypeScript typecheck. |
| `no-unreachable`                    | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |
| `no-unused-vars`                    | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                                                   | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                                       |

## Architecture contract baseline

The custom lint architecture contract baseline is 0. Every new architecture violation fails, and stale baseline entries fail as well.

## Stage 5 decision

- Do not remove `@typescript-eslint` yet.
- Do not update to TypeScript 7 yet.
- Do not swap `wp_ast_adapter` away from TypeScript yet.
- Keep `lint:legacy` as a temporary blocking compatibility gate; the final split is `lint:js` / `lint:parser-removal-dry-run`, `lint:ts-modern:syntax`, `lint:contracts`, and `typecheck:*`.
- `quality:ts-modern` is the dry-run gate bundle for that final split; it intentionally excludes `lint:legacy`.
- `lint:ts-modern:type-aware` remains audit-only with known diagnostics; it is not a Stage 5 blocker.
