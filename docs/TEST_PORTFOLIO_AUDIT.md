# Test portfolio audit

Generated: 2026-05-01T04:03:25.723Z

## Summary

- Test files classified: 947
- Package script test references: 436

| Category         | Count |
| ---------------- | ----: |
| contract         |   289 |
| runtime-unit     |   233 |
| integration      |   378 |
| e2e-smoke        |     5 |
| perf-smoke       |     6 |
| legacy-migration |    36 |

## Guard results

| Check                                                                                 | Failures |
| ------------------------------------------------------------------------------------- | -------: |
| No stale package test references                                                      |        0 |
| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped |        0 |
| Refactor stage guard tests are referenced by package scripts                          |        0 |

## Policy

This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.
