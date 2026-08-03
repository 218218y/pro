# Test portfolio audit

Generated: 2026-08-03T19:53:58.393Z

## Summary

- Test files classified: 1280
- Canonical unit/runtime runner files: 1272
- Playwright E2E files excluded from unit runner: 8
- Helpers/fixtures excluded by filename contract: 36
- Package script test references: 198
- Catalog test references: 290
- Total explicit test references: 488
- Catalog groups: 28
- Catalog-backed package scripts: 28
- Primary non-overlapping portfolio groups: 5
- Tests directly invoking the repository layer graph: 0
- Tests copying historical migration-ledger prefixes: 0
- Canonical contracts in registry: 18
- Historical refactor-stage guard files: 0
- Cross-kind contract overlap targets: 2

| Category         | Count |
| ---------------- | ----: |
| contract         |   449 |
| runtime-unit     |   317 |
| integration      |   457 |
| e2e-smoke        |     9 |
| perf-smoke       |     6 |
| legacy-migration |    42 |

## Guard results

| Check                                                                                 | Failures |
| ------------------------------------------------------------------------------------- | -------: |
| No stale package/catalog test references                                              |        0 |
| Test groups contain no duplicate file membership                                      |        0 |
| Test-group catalog definitions are valid                                              |        0 |
| Catalog script bindings match package.json facades                                    |        0 |
| Legacy tests are explicitly migration/compat/cleanup/root/guard/audit/contract scoped |        0 |
| Contract registry is valid and wired once                                             |        0 |
| Historical refactor-stage proof files are retired                                     |        0 |
| Unit runner has no duplicate files                                                    |        0 |
| Unit runner excludes Playwright E2E                                                   |        0 |
| Unit runner excludes helpers/fixtures                                                 |        0 |
| Repository layer graph is owned only by the cached central fixture                    |        0 |
| Historical migration prefixes are owned only by the final closeout fingerprint        |        0 |
| Every non-E2E test reaches the unit runner                                            |        0 |

## Cross-kind overlap map

- `esm/native/kernel/kernel_project_capture_payload.ts` — ownership / source-guard — `tests/kernel_project_capture_dimension_ownership_contract.test.js`, `tests/project_config_visual_maps_canonical_only_source_guard.test.js`
- `esm/shared/dimensions/sketch_box_geometry_policy.ts` — ownership / source-guard — `tests/interior_sketch_box_validation_source_guard.test.js`, `tests/sketch_box_preview_ownership_closeout_contract.test.js`

## Policy

This audit is intentionally a portfolio map, not a brittle snapshot of every assertion. It protects against stale package/catalog references and unnamed legacy runtime coverage while allowing the test suite to keep evolving.
