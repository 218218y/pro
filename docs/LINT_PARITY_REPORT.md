# Lint Parity Report

<!-- Tool-owned report target. Regenerate with: npm run lint:parity-report -->

Stage 9 finalizes the TypeScript 7 quality path: TypeScript 7.0.2 is active, TS-specific ESLint parser/plugin packages are removed, JS/tools/tests/config stay on strict ESLint, TS/TSX syntax stays on Oxlint, architecture rules stay on custom contracts, type correctness stays on TypeScript, and `wp_ast_adapter` remains on `oxc-parser`. The modern gate is the canonical lint path.

## Gate comparison

| Gate              | Command                             | Blocking? | Role                                                                                 | Stage 9 status                                                                     |
| ----------------- | ----------------------------------- | --------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| lint modern       | `npm run lint:modern`               | yes       | Canonical lint gate combining strict JS ESLint, Oxlint syntax, and custom contracts. | blocking primary gate                                                              |
| lint JS-only      | `npm run lint:js:strict`            | yes       | ESLint coverage for JS/tools/tests/config, including `no-undef`.                     | strict blocking JS gate with 0 warnings; TS/TSX stays outside ESLint               |
| oxlint syntax     | `npm run lint:ts-modern:syntax`     | yes       | Fast modern parser/config/file-discovery lane for `esm` and `types` TS/TSX.          | blocking; current syntax diagnostics are 0                                         |
| oxlint type-aware | `npm run lint:ts-modern:type-aware` | yes       | Semantic lint lane through `oxlint-tsgolint`.                                        | blocking; current type-aware diagnostics are 0                                     |
| typecheck         | `npm run typecheck`                 | yes       | Whole-project strict TypeScript compiler gate.                                       | canonical for type correctness on TypeScript 7.0.2                                 |
| custom contracts  | `npm run lint:contracts`            | yes       | Project-owned quality rules that survive parser/linter swaps.                        | matrix/parity docs, modern readiness, and lint architecture contracts are blocking |

## Rule parity

| Rule                    | ESLint JS gate | Oxlint syntax | Oxlint type-aware  | Typecheck | Custom contracts | Classification          | Rationale                                                                                                    |
| ----------------------- | -------------- | ------------- | ------------------ | --------- | ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `eqeqeq`                | active         | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured with the same smart equality policy used by the JS ESLint gate.                  |
| `no-const-assign`       | active         | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and JavaScript semantics cover const reassignment.                                        |
| `no-dupe-keys`          | active         | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and `wp_check_syntax` both cover duplicate object keys.                                   |
| `no-redeclare`          | active         | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint reports redeclarations in the canonical modern syntax gate; ESLint stays focused on JS/tools/config.  |
| `no-restricted-globals` | active         | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts`; architecture baseline is 0, so every new violation fails.      |
| `no-restricted-imports` | active         | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` and existing layer contracts; architecture baseline is 0.       |
| `no-restricted-syntax`  | active         | not owner     | not required today | not owner | candidate owner  | covered by modern gate  | Mirrored by `wp_lint_architecture_contracts` through the AST adapter, without depending on ESLint selectors. |
| `no-undef`              | active         | not owner     | not required today | partial   | not owner        | blocked by tool support | TS/TSX should rely on TypeScript; JS/tools still need ESLint globals policy.                                 |
| `no-unreachable`        | active         | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint correctness and TypeScript syntax/typecheck catch unreachable syntax classes.                         |
| `no-unused-vars`        | active         | candidate     | not required today | not owner | not owner        | covered by modern gate  | Oxlint syntax is configured to match underscore ignore behavior for variables and catch bindings.            |

## Modern lint readiness

| Rule                    | Future owner                           | Blocking command                                       | Ready? | Notes                                                                                                    |
| ----------------------- | -------------------------------------- | ------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| `eqeqeq`                | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                        | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                               |
| `no-const-assign`       | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                        | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                               |
| `no-dupe-keys`          | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                        | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                               |
| `no-redeclare`          | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                        | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                               |
| `no-restricted-globals` | custom lint contracts                  | `npm run lint:contracts`                               | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                   |
| `no-restricted-imports` | custom lint contracts                  | `npm run lint:contracts`                               | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                   |
| `no-restricted-syntax`  | custom lint contracts                  | `npm run lint:contracts`                               | yes    | Owned by project lint contracts; architecture baseline must stay at 0.                                   |
| `no-undef`              | ESLint JS/tools + TypeScript typecheck | `npm run lint:js:strict; TS/TSX via npm run typecheck` | yes    | Not a TS/TSX ESLint blocker: ESLint keeps JS/tools globals, while TS/TSX relies on TypeScript typecheck. |
| `no-unreachable`        | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                        | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                               |
| `no-unused-vars`        | Oxlint syntax                          | `npm run lint:ts-modern:syntax`                        | yes    | Owned by the blocking Oxlint syntax lane at 0 diagnostics.                                               |

## Architecture contract baseline

The custom lint architecture contract baseline is 0. Every new architecture violation fails, and stale baseline entries fail as well.

## Stage 9 decision

- TypeScript 7.0.2 is active and remains the compiler version for this lane.
- TS-specific ESLint parser/plugin packages are removed from package metadata and ESLint config.
- `lint:modern` is the canonical lint gate: `lint:js:strict`, `lint:ts-modern:syntax`, `lint:ts-modern:type-aware`, and `lint:contracts`.
- `quality:ts-modern` is the primary TypeScript quality bundle.
- `lint:ts-modern:type-aware` is blocking at 0 diagnostics, with global zero guards for the hardened semantic rules.
