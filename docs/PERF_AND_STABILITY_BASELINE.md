# Perf and Stability Baseline

- Generated: 2026-07-08T08:21:25.575Z
- Profile: default
- Verify lanes: perf-toolchain-core, ui-react-jsx-hardening-core
- Node: v24.18.0
- Total runtime: 5.48s
- Total budget: 8.08s

## Definition of Done

- All scripts in the perf smoke profile pass.
- No script exceeds its stored budget.
- Total profile runtime stays within the stored total budget.
- The perf smoke profile remains dependency-light enough to run before larger verify waves.

## Script timings

| Script                                   | Actual | Budget | Status |
| ---------------------------------------- | -----: | -----: | ------ |
| test:perf-toolchain-core                 |  566ms |  1.51s | ok     |
| test:ui-react-import-hardening-contracts |  541ms |  1.48s | ok     |
| test:ui-react-jsx-hardening-contracts    |  467ms |  1.38s | ok     |
| test:ui-type-hardening-contracts         |  444ms |  1.35s | ok     |
| contract:layers                          |  1.88s |  3.29s | ok     |
| contract:api                             |  1.58s |  2.88s | ok     |

## Re-run commands

```bash
npm run perf:smoke
npm run perf:smoke:update-baseline
```

## Notes

- This profile is meant to catch obvious verify/test/runtime cost regressions before deeper refactors.
- Budgets intentionally include slack so the check is useful without becoming flaky on normal machine variance.
