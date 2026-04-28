# Test portfolio audit

Generated: 2026-04-28T01:52:31.757Z

## Summary

- Test files classified: 925
- Package script test references: 419

| Category | Count |
|---|---:|
| contract | 284 |
| runtime-unit | 233 |
| integration | 366 |
| e2e-smoke | 5 |
| perf-smoke | 5 |
| legacy-migration | 32 |

## Guard results

| Check | Failures |
|---|---:|
| No stale package test references | 0 |
| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped | 0 |
| Refactor stage guard tests are referenced by package scripts | 0 |

## Policy

This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.

