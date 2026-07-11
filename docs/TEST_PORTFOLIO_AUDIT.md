# Test portfolio audit

Generated: 2026-07-11T18:43:42.857Z

## Summary

- Test files classified: 1178
- Package script test references: 450
- Catalog test references: 59
- Total explicit test references: 509

| Category         | Count |
| ---------------- | ----: |
| contract         |   384 |
| runtime-unit     |   305 |
| integration      |   433 |
| e2e-smoke        |     7 |
| perf-smoke       |     9 |
| legacy-migration |    40 |

## Guard results

| Check                                                                                 | Failures |
| ------------------------------------------------------------------------------------- | -------: |
| No stale package/catalog test references                                              |        0 |
| Test groups contain no duplicate file membership                                      |        0 |
| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped |        0 |
| Refactor stage guard tests have package/catalog ownership                             |        0 |

## Policy

This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package/catalog references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.
