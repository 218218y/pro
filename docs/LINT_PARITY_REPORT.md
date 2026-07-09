# Lint Parity Report

<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->

Stage 5 keeps the legacy ESLint gate intact and introduces modern linting as audit-only. The report explains what is already covered, what is duplicated, and what still needs a durable owner before TS/TSX can be removed from `@typescript-eslint/parser`.

## Gate comparison

| Gate              | Command                                               | Blocking? | Role                                                                                        | Stage 5 status                                                                 |
| ----------------- | ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| lint legacy       | `npm run lint:legacy`                                 | yes       | Current canonical ESLint migrate profile, including `@typescript-eslint/parser` for TS/TSX. | kept as source of truth in Stage 5                                             |
| oxlint syntax     | `npm run lint:ts-modern:syntax`                       | no        | Fast modern parser/config/file-discovery lane for `esm` and `types`.                        | audit-only; diagnostics do not block yet                                       |
| oxlint type-aware | `npm run lint:ts-modern:type-aware`                   | no        | Future TypeScript semantic lint lane through `oxlint-tsgolint`.                             | audit-only; TS7/tsgolint path is not a blocker yet                             |
| typecheck         | `npm run typecheck:runtime && npm run typecheck:dist` | yes       | TypeScript compiler contracts and TS/JS check lanes.                                        | already canonical for type correctness                                         |
| custom contracts  | `npm run lint:contracts`                              | yes       | Project-owned quality rules that should survive parser/linter swaps.                        | matrix/parity docs are checked; architecture contracts remain separate scripts |

## Rule parity

| Rule                                | Legacy lint | Oxlint syntax | Oxlint type-aware  | Typecheck | Custom contracts | Classification          | Rationale                                                                                                |
| ----------------------------------- | ----------- | ------------- | ------------------ | --------- | ---------------- | ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars` | covered     | candidate     | not required today | partial   | not owner        | false positive          | Candidate for Oxlint, but underscore and rest-sibling ignores need config parity first.                  |
| `eqeqeq`                            | covered     | candidate     | not required today | not owner | not owner        | needs custom contract   | Current ESLint uses `smart`; Oxlint option parity must be confirmed before blocking.                     |
| `no-const-assign`                   | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and JavaScript semantics cover const reassignment.                                    |
| `no-dupe-keys`                      | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and `wp_check_syntax` both cover duplicate object keys.                               |
| `no-redeclare`                      | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint reports redeclarations, but globals/profile parity remains under review.                          |
| `no-restricted-globals`             | covered     | not owner     | not required today | not owner | candidate owner  | needs custom contract   | Browser-global DI policy is architecture-specific and should not depend on TS parser selectors.          |
| `no-restricted-imports`             | covered     | not owner     | not required today | not owner | candidate owner  | needs custom contract   | Layer/import boundaries already overlap with custom contracts and should be fully owned there.           |
| `no-restricted-syntax`              | covered     | not owner     | not required today | not owner | candidate owner  | needs custom contract   | Legacy App.* bag ban is project-specific; move to a dedicated AST/custom contract before parser removal. |
| `no-undef`                          | covered     | not owner     | not required today | partial   | not owner        | blocked by tool support | TS/TSX should rely on TypeScript; JS/tools still need ESLint globals policy.                             |
| `no-unreachable`                    | covered     | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and TypeScript syntax/typecheck catch unreachable syntax classes.                     |
| `no-unused-vars`                    | covered     | candidate     | not required today | not owner | not owner        | false positive          | Oxlint currently reports underscore catch variables that legacy ESLint intentionally ignores.            |

## Stage 5 decision

- Do not remove `@typescript-eslint` yet.
- Do not update to TypeScript 7 yet.
- Do not swap `wp_ast_adapter` away from TypeScript yet.
- Keep `lint:legacy` as the blocking lint gate while `lint:ts-modern:*` runs in audit mode.
- Before a later parser-removal stage, every `needs custom contract`, `false positive`, `blocked by tool support`, or `manual-review` row must be resolved or intentionally accepted.
