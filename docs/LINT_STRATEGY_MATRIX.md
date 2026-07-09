# Lint Strategy Matrix

<!-- Tool-owned report target. Regenerate with: npm run lint:rule-matrix -->

Generated from: `eslint.config.js (runtime + migrate profiles)`.

Stage 5 purpose: keep the existing ESLint gate intact while introducing a modern TypeScript lint lane in audit mode. This is not a TypeScript 7 upgrade, does not remove `@typescript-eslint`, and does not replace the AST adapter parser.

## Rule matrix

| Rule                                | Current source     | Applies to         | Profiles         | Levels           | Type-aware | Future target              | Notes / risk                                                                                                                                      |
| ----------------------------------- | ------------------ | ------------------ | ---------------- | ---------------- | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@typescript-eslint/no-unused-vars` | @typescript-eslint | TS, TSX            | migrate, runtime | warn             | no         | replace-by-oxlint          | Only TS-aware in the AST/parser sense; not parserOptions.project type-aware. Candidate for Oxlint syntax parity once ignore patterns match.       |
| `eqeqeq`                            | ESLint             | JS, TS, TSX, tools | migrate, runtime | warn             | no         | replace-by-oxlint          | Configured as smart equality today; verify Oxlint option parity before making it blocking.                                                        |
| `no-const-assign`                   | ESLint             | JS, TS, TSX        | migrate, runtime | error            | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                                   |
| `no-dupe-keys`                      | ESLint             | JS, TS, TSX, tools | migrate, runtime | error            | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                                   |
| `no-redeclare`                      | ESLint             | JS, TS, TSX, tools | migrate, runtime | error            | no         | replace-by-oxlint          | Oxlint can cover the syntax class, but globals/profile differences need parity review before removing ESLint.                                     |
| `no-restricted-globals`             | ESLint             | JS, TS, TSX        | migrate, runtime | error, off       | no         | replace-by-custom-contract | Architecture policy around browser globals; prefer a custom contract or explicit Oxlint-compatible parity before removing ESLint coverage.        |
| `no-restricted-imports`             | custom             | JS, TS, TSX        | migrate, runtime | error            | no         | replace-by-custom-contract | Project layer/browser-env boundary expressed through ESLint patterns today; custom contracts already overlap and should become the durable owner. |
| `no-restricted-syntax`              | custom             | JS, TS, TSX        | migrate, runtime | error            | no         | replace-by-custom-contract | Project-specific App.* bag ban expressed through selectors; should move to a custom AST contract before TypeScript ESLint parser removal.         |
| `no-undef`                          | ESLint             | JS, TS, TSX, tools | migrate, runtime | error, off, warn | no         | keep-eslint                | Keep ESLint for JS/tools globals while TS/TSX remains covered by TypeScript typecheck instead of no-undef.                                        |
| `no-unreachable`                    | ESLint             | JS, TS, TSX, tools | migrate, runtime | error            | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                                   |
| `no-unused-vars`                    | ESLint             | JS, TS, TSX, tools | migrate, runtime | off, warn        | no         | replace-by-oxlint          | Oxlint reports unused variables but underscore ignore behavior differs; keep audit-only until parity is tuned.                                    |

## Migration policy

- `lint:legacy` remains the canonical ESLint gate until parity is proven.
- `lint:ts-modern:syntax` runs Oxlint without failing the build on diagnostics; it validates modern parser/file discovery and feeds the parity report.
- `lint:ts-modern:type-aware` is audit-only because `oxlint-tsgolint` targets the TypeScript 7/type-aware path and the project is intentionally still on the current TypeScript lane.
- `lint:contracts` owns project-specific rules that should not depend on `@typescript-eslint/parser` long term.
- Removing `@typescript-eslint` from TS/TSX is blocked until every row marked `replace-*` is classified as covered in `docs/LINT_PARITY_REPORT.md`.
