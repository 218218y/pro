# Runtime selector policy

Runtime selectors must make the difference between compatibility and canonical live state explicit.

## Canonical live path

Use canonical readers/assertions when the state has already passed through a load/import/migration boundary:

- `readUiRawScalarFromCanonicalSnapshot(...)`
- `hasCanonicalEssentialUiRawDimsFromSnapshot(...)`
- `assertCanonicalUiRawDims(...)`

These helpers read `ui.raw` only and do not fall back to old direct `ui.*` dimension fields.

## Compatibility path

Existing fail-soft helpers remain available for staged migration and old call sites:

- `readUiRawScalarFromSnapshot(...)`
- `ensureUiRawDimsFromSnapshot(...)`
- `readUiRawNumberFromSnapshot(...)`
- `readUiRawIntFromSnapshot(...)`

Do not introduce new live runtime/build call sites that depend on compatibility fallback. Move persisted-shape normalization to `esm/native/io/project_migrations/` first, then use canonical readers.

## Error policy

Missing canonical dimensions after project load are invalid input. They should fail clearly at the boundary instead of being silently guessed during build.

## Stage 3 guardrails

- `ui.raw` project compatibility belongs in `io/project_migrations/ui_raw_snapshot_migration.ts`.
- Project-load config compatibility belongs in `io/project_migrations/config_snapshot_migration.ts`.
- Live runtime/build code should prefer canonical readers/assertions after project load has canonicalized snapshots.
- Tolerant runtime helpers may remain as compatibility APIs, but they must not become the normal project-ingress path.
- `npm run check:runtime-selector-policy` enforces the wiring between project load, migration owners, and canonical selector APIs.
