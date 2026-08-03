# Perf and Stability Baseline

Tool-owned report target for the perf smoke baseline.

- Baseline data: `tools/wp_perf_smoke_baseline.json`
- Report target: `docs/PERF_AND_STABILITY_BASELINE.md`
- Latest run artifacts: `.artifacts/perf-smoke/latest.json`, `.artifacts/perf-smoke/latest.md`

- Generated: 2026-08-03T11:17:02.714Z
- Profile: default
- Verify lanes: perf-toolchain-core, ui-react-jsx-hardening-core
- Node: v24.18.0
- Total runtime: 6.28s
- Total budget: 9.04s

## Definition of Done

- All scripts in the perf smoke profile pass.
- No script exceeds its stored budget.
- Total profile runtime stays within the stored total budget.
- The perf smoke profile remains dependency-light enough to run before larger verify waves.

## Script timings

| Script                                   | Actual | Budget | Status |
| ---------------------------------------- | -----: | -----: | ------ |
| test:perf-toolchain-core                 |  221ms |  1.05s | ok     |
| test:ui-react-import-hardening-contracts |  143ms |  1.00s | ok     |
| test:ui-react-jsx-hardening-contracts    |  125ms |  1.00s | ok     |
| test:ui-type-hardening-contracts         |  114ms |  1.00s | ok     |
| contract:layers                          |  4.71s |  7.11s | ok     |
| contract:api                             |  967ms |  2.06s | ok     |

## Re-run commands

```bash
npm run perf:smoke
npm run perf:smoke:update-baseline
```

## Notes

- This profile is meant to catch obvious verify/test/runtime cost regressions before deeper refactors.
- Budgets intentionally include slack so the check is useful without becoming flaky on normal machine variance.
