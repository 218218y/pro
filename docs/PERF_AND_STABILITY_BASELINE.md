# Perf and Stability Baseline

Tool-owned report target for the perf smoke baseline.

- Baseline data: `tools/wp_perf_smoke_baseline.json`
- Report target: `docs/PERF_AND_STABILITY_BASELINE.md`
- Latest run artifacts: `.artifacts/perf-smoke/latest.json`, `.artifacts/perf-smoke/latest.md`

- Generated: 2026-08-18T07:28:33.838Z
- Profile: default
- Verify lanes: perf-toolchain-core, ui-react-jsx-hardening-core
- Node: v24.18.0
- Total runtime: 6.99s
- Total budget: 9.89s

## Definition of Done

- All scripts in the perf smoke profile pass.
- No script exceeds its stored budget.
- Total profile runtime stays within the stored total budget.
- The perf smoke profile remains dependency-light enough to run before larger verify waves.

## Script timings

| Script                                         | Actual | Budget | Status |
| ---------------------------------------------- | -----: | -----: | ------ |
| test-group:perf-toolchain-core                 |  279ms |  1.13s | ok     |
| test-group:ui-react-import-hardening-contracts |  216ms |  1.04s | ok     |
| test-group:ui-react-jsx-hardening-contracts    |  195ms |  1.01s | ok     |
| test-group:ui-type-hardening-contracts         |  181ms |  1.00s | ok     |
| npm:contract:layers                            |  4.95s |  7.44s | ok     |
| npm:contract:api                               |  1.17s |  2.33s | ok     |

## Re-run commands

```bash
npm run perf:smoke
npm run perf:smoke:update-baseline
```

## Notes

- This profile is meant to catch obvious verify/test/runtime cost regressions before deeper refactors.
- Budgets intentionally include slack so the check is useful without becoming flaky on normal machine variance.
- A timing must exceed its headroom by at least 100ms before it is classified as a material regression.
