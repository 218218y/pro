# Lint Strategy Matrix

<!-- Tool-owned report target. Regenerate with: npm run lint:rule-matrix -->

Generated from: `eslint.config.js (runtime + migrate profiles)`.

Stage 5 purpose: keep the existing ESLint gate intact while introducing a modern TypeScript lint lane in audit mode. This is not a TypeScript 7 upgrade, does not remove `@typescript-eslint`, and does not replace the AST adapter parser.

## Rule matrix

| Rule                                | Current source     | Applies to         | Profiles         | Levels           | Type-aware | Future target              | Notes / risk                                                                                                                           |
| ----------------------------------- | ------------------ | ------------------ | ---------------- | ---------------- | ---------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars` | @typescript-eslint | TS, TSX            | migrate, runtime | warn             | no         | replace-by-oxlint          | Only TS-aware in the AST/parser sense; not parserOptions.project type-aware. Oxlint syntax now owns the underscore-ignore parity lane. |
| `eqeqeq`                            | ESLint             | JS, TS, TSX, tools | migrate, runtime | warn             | no         | replace-by-oxlint          | Oxlint syntax is configured with the same smart equality policy before becoming a blocking gate.                                       |
| `no-const-assign`                   | ESLint             | JS, TS, TSX        | migrate, runtime | error            | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                        |
| `no-dupe-keys`                      | ESLint             | JS, TS, TSX, tools | migrate, runtime | error            | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                        |
| `no-redeclare`                      | ESLint             | JS, TS, TSX, tools | migrate, runtime | error            | no         | replace-by-oxlint          | Oxlint can cover the syntax class, but globals/profile differences need parity review before removing ESLint.                          |
| `no-restricted-globals`             | ESLint             | JS, TS, TSX        | migrate, runtime | error, off       | no         | replace-by-custom-contract | Architecture policy around browser globals is now mirrored by wp_lint_architecture_contracts with a baseline for existing debt.        |
| `no-restricted-imports`             | custom             | JS, TS, TSX        | migrate, runtime | error            | no         | replace-by-custom-contract | Project layer/browser-env boundaries are now mirrored by wp_lint_architecture_contracts plus existing layer contracts.                 |
| `no-restricted-syntax`              | custom             | JS, TS, TSX        | migrate, runtime | error            | no         | replace-by-custom-contract | Project-specific App.* bag ban is now mirrored by wp_lint_architecture_contracts through the AST adapter.                              |
| `no-undef`                          | ESLint             | JS, TS, TSX, tools | migrate, runtime | error, off, warn | no         | keep-eslint                | Keep ESLint for JS/tools globals while TS/TSX remains covered by TypeScript typecheck instead of no-undef.                             |
| `no-unreachable`                    | ESLint             | JS, TS, TSX, tools | migrate, runtime | error            | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                        |
| `no-unused-vars`                    | ESLint             | JS, TS, TSX, tools | migrate, runtime | off, warn        | no         | replace-by-oxlint          | Oxlint syntax is configured with legacy underscore ignore behavior for args, vars, and catch bindings.                                 |

## Migration policy

- `lint:legacy` remains the canonical ESLint gate until parity is proven.
- `lint:ts-modern:syntax` is now a blocking Oxlint syntax gate; it must stay at 0 diagnostics before later parser-removal work.
- `lint:ts-modern:type-aware` is audit-only because `oxlint-tsgolint` targets the TypeScript 7/type-aware path and the project is intentionally still on the current TypeScript lane.
- `lint:contracts` owns project-specific rules that should not depend on `@typescript-eslint/parser` long term, including the lint architecture contracts.
- Removing `@typescript-eslint` from TS/TSX is blocked until every row marked `replace-*` is classified as covered in `docs/LINT_PARITY_REPORT.md`.
