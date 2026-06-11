# Perf and stability baseline

Tool-owned report target for `npm run perf:smoke:update-baseline` and `npm run perf:smoke`.

The full historical report was removed from active docs because it was stale noise. Regenerate this file when a fresh baseline is needed.

## Current policy

- Keep perf smoke budgets enforced by `tools/wp_perf_smoke*.mjs`.
- Store machine-readable baseline data in `tools/wp_perf_smoke_baseline.json`.
- Use `.artifacts/perf-smoke/latest.*` for run output.
