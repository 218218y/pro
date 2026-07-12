# Test portfolio audit

Generated: 2026-07-12T20:57:14.619Z

## Summary

- Test files classified: 1194
- Canonical unit/runtime runner files: 1188
- Playwright E2E files excluded from unit runner: 6
- Helpers/fixtures excluded by filename contract: 30
- Package script test references: 191
- Catalog test references: 348
- Total explicit test references: 539
- Catalog groups: 29
- Catalog-backed package scripts: 29
- Primary non-overlapping portfolio groups: 5

| Category         | Count |
| ---------------- | ----: |
| contract         |   389 |
| runtime-unit     |   308 |
| integration      |   441 |
| e2e-smoke        |     7 |
| perf-smoke       |     9 |
| legacy-migration |    40 |

## Guard results

| Check                                                                                 | Failures |
| ------------------------------------------------------------------------------------- | -------: |
| No stale package/catalog test references                                              |        0 |
| Test groups contain no duplicate file membership                                      |        0 |
| Test-group catalog definitions are valid                                              |        0 |
| Catalog script bindings match package.json facades                                    |        0 |
| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped |        0 |
| Refactor stage guard tests have package/catalog ownership                             |        0 |
| Unit runner has no duplicate files                                                    |        0 |
| Unit runner excludes Playwright E2E                                                   |        0 |
| Unit runner excludes helpers/fixtures                                                 |        0 |
| Every non-E2E test reaches the unit runner                                            |        0 |

## Policy

This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package/catalog references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.
