# Lint Parity Report

<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->

Stage 5 keeps the legacy ESLint gate intact and promotes Oxlint syntax to a blocking modern lint lane after reaching 0 diagnostics. The report explains what is already covered, what is duplicated, and what still needs a durable owner before TS/TSX can be removed from `@typescript-eslint/parser`.

## Gate comparison

| Gate              | Command                                               | Blocking? | Role                                                                                        | Stage 5 status                                                  |
| ----------------- | ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| lint legacy       | `npm run lint:legacy`                                 | yes       | Current canonical ESLint migrate profile, including `@typescript-eslint/parser` for TS/TSX. | kept as source of truth in Stage 5                              |
| oxlint syntax     | `npm run lint:ts-modern:syntax`                       | yes       | Fast modern parser/config/file-discovery lane for `esm` and `types`.                        | blocking; current syntax diagnostics are 0                      |
| oxlint type-aware | `npm run lint:ts-modern:type-aware`                   | no        | Future TypeScript semantic lint lane through `oxlint-tsgolint`.                             | audit-only; TS7/tsgolint path is not a blocker yet              |
| typecheck         | `npm run typecheck:runtime && npm run typecheck:dist` | yes       | TypeScript compiler contracts and TS/JS check lanes.                                        | already canonical for type correctness                          |
| custom contracts  | `npm run lint:contracts`                              | yes       | Project-owned quality rules that should survive parser/linter swaps.                        | matrix/parity docs and lint architecture contracts are blocking |

## Rule parity

| Rule                                | Legacy lint | Oxlint syntax | Oxlint type-aware  | Typecheck | Custom contracts | Classification          | Rationale                                                                                                    |
| ----------------------------------- | ----------- | ------------- | ------------------ | --------- | ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@typescript-eslint/no-unused-vars` | covered     | candidate     | not required today | partial   | not owner        | covered by modern gate  | Oxlint syntax now covers the TS unused-vars migration lane with legacy underscore ignore parity.             |
| `eqeqeq`                            | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured with the same smart equality policy used by legacy ESLint.                       |
| `no-const-assign`                   | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and JavaScript semantics cover const reassignment.                                        |
| `no-dupe-keys`                      | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and `wp_check_syntax` both cover duplicate object keys.                                   |
| `no-redeclare`                      | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint reports redeclarations, but globals/profile parity remains under review.                              |
| `no-restricted-globals`             | covered     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts`; current debt is baselined so the gate blocks new regressions.  |
| `no-restricted-imports`             | covered     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` and existing layer contracts; current debt is baselined.        |
| `no-restricted-syntax`              | covered     | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` through the AST adapter, without depending on ESLint selectors. |
| `no-undef`                          | covered     | not owner     | not required today | partial   | not owner        | blocked by tool support | TS/TSX should rely on TypeScript; JS/tools still need ESLint globals policy.                                 |
| `no-unreachable`                    | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and TypeScript syntax/typecheck catch unreachable syntax classes.                         |
| `no-unused-vars`                    | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured to match legacy underscore ignore behavior for variables and catch bindings.     |

## Architecture contract baseline

The custom lint architecture contract currently has 0 baselined legacy exception(s). They are not ignored forever: the contract blocks new regressions while existing services/io and UI globalThis debt can be retired in a dedicated follow-up.

## Stage 5 decision

- Do not remove `@typescript-eslint` yet.
- Do not update to TypeScript 7 yet.
- Do not swap `wp_ast_adapter` away from TypeScript yet.
- Keep `lint:legacy` as a blocking compatibility gate; `lint:ts-modern:syntax` is also blocking at 0 diagnostics.
- `lint:ts-modern:type-aware` remains audit-only; parser removal is still blocked until the type-aware/TS7 lane is intentionally handled.
