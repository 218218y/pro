# Lint Strategy Matrix

<!-- Tool-owned report target. Regenerate with: npm run lint:rule-matrix -->

Generated from: `eslint.config.js (js-only profiles)`.

Stage 9 finalization: TypeScript 7.0.2 is active, TS/TSX ESLint ownership is removed, ESLint owns JS/tools/tests/config, and TS/TSX is covered by Oxlint syntax, TypeScript typecheck, and custom contracts.

## Rule matrix

| Rule                    | Current source | Applies to       | Profiles | Levels      | Type-aware | Future target              | Notes / risk                                                                                                                                           |
| ----------------------- | -------------- | ---------------- | -------- | ----------- | ---------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `eqeqeq`                | ESLint         | JS, tools, tests | js-only  | warn        | no         | replace-by-oxlint          | Oxlint syntax is configured with the same smart equality policy before becoming a blocking gate.                                                       |
| `no-const-assign`       | ESLint         | JS               | js-only  | error       | no         | replace-by-oxlint          | Covered by JS ESLint and Oxlint correctness; low-risk syntax parity rule.                                                                              |
| `no-dupe-keys`          | ESLint         | JS, tools, tests | js-only  | error, off  | no         | replace-by-oxlint          | Covered by JS ESLint and Oxlint correctness; low-risk syntax parity rule.                                                                              |
| `no-redeclare`          | ESLint         | JS, tools, tests | js-only  | error       | no         | replace-by-oxlint          | Oxlint owns this syntax class in the canonical modern gate; ESLint covers JS/tools/config only.                                                        |
| `no-restricted-globals` | ESLint         | JS               | js-only  | error, off  | no         | replace-by-custom-contract | Architecture policy around browser globals is now mirrored by wp_lint_architecture_contracts; the architecture baseline is 0 and new violations fail.  |
| `no-restricted-imports` | custom         | JS               | js-only  | error       | no         | replace-by-custom-contract | Project layer/browser-env boundaries are now mirrored by wp_lint_architecture_contracts plus existing layer contracts; the architecture baseline is 0. |
| `no-restricted-syntax`  | custom         | JS               | js-only  | error       | no         | replace-by-custom-contract | Project-specific App.* bag ban is now mirrored by wp_lint_architecture_contracts through the AST adapter; the architecture baseline is 0.              |
| `no-undef`              | ESLint         | JS, tools, tests | js-only  | error, warn | no         | keep-eslint                | Keep ESLint for JS/tools globals while TS/TSX remains covered by TypeScript typecheck instead of no-undef.                                             |
| `no-unreachable`        | ESLint         | JS, tools, tests | js-only  | error       | no         | replace-by-oxlint          | Covered by JS ESLint and Oxlint correctness; low-risk syntax parity rule.                                                                              |
| `no-unused-vars`        | ESLint         | JS, tools, tests | js-only  | warn        | no         | replace-by-oxlint          | Oxlint syntax is configured with underscore ignore behavior for args, vars, and catch bindings.                                                        |

## Migration policy

- `lint:modern` is the primary lint gate and combines strict JS ESLint, Oxlint syntax, blocking type-aware Oxlint, and custom contracts.
- `lint:ts-modern:syntax` is now a blocking Oxlint syntax gate; it must stay at 0 diagnostics as the canonical TS/TSX syntax gate.
- `lint:ts-modern:type-aware` is blocking at 0 diagnostics; the global zero contract covers `no-redundant-type-constituents`, `unbound-method`, and `no-base-to-string`.
- `lint:contracts` owns project-specific rules that should not depend on ESLint parser selectors, including the lint architecture contracts.
- TS/TSX ESLint removal is complete; `lint:modern-readiness` remains as a regression check for rule ownership.
