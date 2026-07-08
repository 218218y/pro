# Perf and Stability Baseline

Tool-owned report target for the perf smoke baseline.

- Baseline data: `tools/wp_perf_smoke_baseline.json`
- Report target: `docs/PERF_AND_STABILITY_BASELINE.md`
- Latest run artifacts: `.artifacts/perf-smoke/latest.json`, `.artifacts/perf-smoke/latest.md`

- Generated: 2026-07-08T08:23:53.758Z
- Profile: default
- Verify lanes: perf-toolchain-core, ui-react-jsx-hardening-core
- Node: v24.18.0
- Total runtime: 5.07s
- Total budget: 7.58s

## Definition of Done

- All scripts in the perf smoke profile pass.
- No script exceeds its stored budget.
- Total profile runtime stays within the stored total budget.
- The perf smoke profile remains dependency-light enough to run before larger verify waves.

## Script timings

| Script                                   | Actual | Budget | Status |
| ---------------------------------------- | -----: | -----: | ------ |
| test:perf-toolchain-core                 |  575ms |  1.53s | ok     |
| test:ui-react-import-hardening-contracts |  475ms |  1.39s | ok     |
| test:ui-react-jsx-hardening-contracts    |  496ms |  1.42s | ok     |
| test:ui-type-hardening-contracts         |  566ms |  1.51s | ok     |
| contract:layers                          |  1.57s |  2.87s | ok     |
| contract:api                             |  1.39s |  2.62s | ok     |

## Re-run commands

```bash
npm run perf:smoke
npm run perf:smoke:update-baseline
```

## Notes

- This profile is meant to catch obvious verify/test/runtime cost regressions before deeper refactors.
- Budgets intentionally include slack so the check is useful without becoming flaky on normal machine variance.
