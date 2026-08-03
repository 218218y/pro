# Test portfolio audit

Generated: 2026-08-03T11:14:02.067Z

## Summary

- Test files classified: 1341
- Canonical unit/runtime runner files: 1333
- Playwright E2E files excluded from unit runner: 8
- Helpers/fixtures excluded by filename contract: 35
- Package script test references: 199
- Catalog test references: 352
- Total explicit test references: 551
- Catalog groups: 29
- Catalog-backed package scripts: 29
- Primary non-overlapping portfolio groups: 5

| Category         | Count |
| ---------------- | ----: |
| contract         |   492 |
| runtime-unit     |   322 |
| integration      |   466 |
| e2e-smoke        |     9 |
| perf-smoke       |     9 |
| legacy-migration |    43 |

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
