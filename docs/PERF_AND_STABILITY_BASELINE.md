# Perf and Stability Baseline

Tool-owned report target for the perf smoke baseline.

- Baseline data: `tools/wp_perf_smoke_baseline.json`
- Report target: `docs/PERF_AND_STABILITY_BASELINE.md`
- Latest run artifacts: `.artifacts/perf-smoke/latest.json`, `.artifacts/perf-smoke/latest.md`

- Generated: 2026-08-18T08:45:23.594Z
- Profile: default
- Verify lanes: perf-toolchain-core, ui-react-jsx-hardening-core
- Node: v24.18.0
- Total runtime: 8.01s
- Total budget: 11.1s

## Definition of Done

- All scripts in the perf smoke profile pass.
- No script exceeds its stored budget.
- Total profile runtime stays within the stored total budget.
- The perf smoke profile remains dependency-light enough to run before larger verify waves.

## Script timings

| Script                                         | Actual | Budget | Status |
| ---------------------------------------------- | -----: | -----: | ------ |
| test-group:perf-toolchain-core                 |  338ms |  1.21s | ok     |
| test-group:ui-react-import-hardening-contracts |  329ms |  1.20s | ok     |
| test-group:ui-react-jsx-hardening-contracts    |  212ms |  1.04s | ok     |
| test-group:ui-type-hardening-contracts         |  174ms |  1.00s | ok     |
| npm:contract:layers                            |  5.84s |  8.64s | ok     |
| npm:contract:api                               |  1.11s |  2.26s | ok     |

## Re-run commands

```bash
npm run perf:smoke
npm run perf:smoke:update-baseline
```

## Notes

- This profile is meant to catch obvious verify/test/runtime cost regressions before deeper refactors.
- Budgets intentionally include slack so the check is useful without becoming flaky on normal machine variance.
- A timing must exceed its headroom by at least 100ms before it is classified as a material regression.
- A pure quantitative regression candidate receives one clean confirmation run and fails only when the profile remains over budget.
