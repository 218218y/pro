# Node 24 toolchain alignment — changed files

This package preserves each changed file in its original project directory.

## Main changes

- Added `.node-version` as the exact Node source of truth.
- Aligned `engines`, `devEngines`, package-lock, GitHub Actions, runtime contracts, lint policy, tests, and documentation to Node 24.
- Removed the Node 22 CI compatibility matrix and retired the experimental test-isolation fallback.
- Added a fail-fast runtime/toolchain policy that validates Node, `@types/node`, lockfile, and workflow consistency.
- Refreshed the exact toolchain policy for ESLint 10.7.0, Oxlint 1.74.0, oxlint-tsgolint 0.25.0, and oxc-parser 0.140.0.

## Changed paths

- `.node-version`
- `package.json`
- `package-lock.json`
- `README.md`
- `.github/workflows/ci.yml`
- `.github/workflows/manual-closeout.yml`
- `.github/workflows/manual-lint.yml`
- `.github/workflows/manual-playwright-smoke.yml`
- `.github/workflows/manual-typescript.yml`
- `docs/QUALITY_GUARDRAILS.md`
- `docs/TOOLCHAIN_VERSION_POLICY.md`
- `tests/github_actions_ci_contracts.test.js`
- `tests/wp_lint_rule_matrix_runtime.test.js`
- `tests/wp_test_runner_command_runtime.test.js`
- `tests/wp_toolchain_version_policy_runtime.test.js`
- `tools/wp_esnext_target_contract.mjs`
- `tools/wp_node_runtime_policy.mjs`
- `tools/wp_test_runner_command.mjs`
- `tools/wp_toolchain_version_policy.mjs`
