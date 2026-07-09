# Lint Strategy Matrix

<!-- Tool-owned report target. Regenerate with: npm run lint:rule-matrix -->

Generated from: `eslint.config.js (runtime + migrate + parser-removal-dry-run profiles)`.

Stage 7 purpose: the TS/TSX ESLint parser-removal step is complete. ESLint now owns JS/tools/tests/config, while TS/TSX is covered by Oxlint syntax, TypeScript typecheck, and custom contracts. This is not a TypeScript 7 upgrade.

## Rule matrix

| Rule                    | Current source | Applies to       | Profiles                                 | Levels      | Type-aware | Future target              | Notes / risk                                                                                                                                           |
| ----------------------- | -------------- | ---------------- | ---------------------------------------- | ----------- | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eqeqeq`                | ESLint         | JS, tools, tests | migrate, parser-removal-dry-run, runtime | warn        | no         | replace-by-oxlint          | Oxlint syntax is configured with the same smart equality policy before becoming a blocking gate.                                                       |
| `no-const-assign`       | ESLint         | JS               | migrate, parser-removal-dry-run, runtime | error       | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                                        |
| `no-dupe-keys`          | ESLint         | JS, tools, tests | migrate, parser-removal-dry-run, runtime | error, off  | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                                        |
| `no-redeclare`          | ESLint         | JS, tools, tests | migrate, parser-removal-dry-run, runtime | error       | no         | replace-by-oxlint          | Oxlint owns the syntax class; legacy ESLint stays as a temporary compatibility gate until the parser-removal dry-run.                                  |
| `no-restricted-globals` | ESLint         | JS               | migrate, parser-removal-dry-run, runtime | error, off  | no         | replace-by-custom-contract | Architecture policy around browser globals is now mirrored by wp_lint_architecture_contracts; the architecture baseline is 0 and new violations fail.  |
| `no-restricted-imports` | custom         | JS               | migrate, parser-removal-dry-run, runtime | error       | no         | replace-by-custom-contract | Project layer/browser-env boundaries are now mirrored by wp_lint_architecture_contracts plus existing layer contracts; the architecture baseline is 0. |
| `no-restricted-syntax`  | custom         | JS               | migrate, parser-removal-dry-run, runtime | error       | no         | replace-by-custom-contract | Project-specific App.* bag ban is now mirrored by wp_lint_architecture_contracts through the AST adapter; the architecture baseline is 0.              |
| `no-undef`              | ESLint         | JS, tools, tests | migrate, parser-removal-dry-run, runtime | error, warn | no         | keep-eslint                | Keep ESLint for JS/tools globals while TS/TSX remains covered by TypeScript typecheck instead of no-undef.                                             |
| `no-unreachable`        | ESLint         | JS, tools, tests | migrate, parser-removal-dry-run, runtime | error       | no         | replace-by-oxlint          | Covered by ESLint today and by Oxlint correctness; low-risk syntax parity rule.                                                                        |
| `no-unused-vars`        | ESLint         | JS, tools, tests | migrate, parser-removal-dry-run, runtime | warn        | no         | replace-by-oxlint          | Oxlint syntax is configured with legacy underscore ignore behavior for args, vars, and catch bindings.                                                 |

## Migration policy

- `lint:modern` is the primary lint gate and combines strict JS ESLint, Oxlint syntax, and custom contracts.
- `lint:ts-modern:syntax` is now a blocking Oxlint syntax gate; it must stay at 0 diagnostics before later parser-removal work.
- `lint:ts-modern:type-aware` is audit-only because `oxlint-tsgolint` targets the TypeScript 7/type-aware path and the project is intentionally still on the current TypeScript lane.
- `lint:contracts` owns project-specific rules that should not depend on ESLint parser selectors, including the lint architecture contracts.
- TS/TSX parser removal is complete; `lint:parser-removal-readiness` remains as a regression check for the split.
