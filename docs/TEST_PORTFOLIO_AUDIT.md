# Test portfolio audit

Generated: 2026-06-17T07:36:06.420Z

## Summary

- Test files classified: 1101
- Package script test references: 496

| Category         | Count |
| ---------------- | ----: |
| contract         |   349 |
| runtime-unit     |   276 |
| integration      |   423 |
| e2e-smoke        |     7 |
| perf-smoke       |     7 |
| legacy-migration |    39 |

## Guard results

| Check                                                                                 | Failures |
| ------------------------------------------------------------------------------------- | -------: |
| No stale package test references                                                      |        0 |
| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped |        0 |
| Refactor stage guard tests are referenced by package scripts                          |        0 |

## Policy

This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.
