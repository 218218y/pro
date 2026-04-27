# Project migration boundary

Project compatibility belongs at project ingress, not inside the live runtime/build path.

## Policy

- Project load may accept old persisted shapes and convert them once.
- After conversion, runtime and builder code should read canonical state only.
- `ui.raw` completion from old direct `ui.width` / `ui.height` / `ui.depth` / `ui.doors` fields is owned by `esm/native/io/project_migrations/`.
- Runtime selectors may expose fail-soft compatibility helpers during the transition, but new live paths should prefer canonical readers and assertions.

## Current owner

- `esm/native/io/project_migrations/ui_raw_snapshot_migration.ts`
  - converts project-loaded UI snapshots into canonical `ui.raw` snapshots.
  - preserves existing `raw` values over direct project fields.
  - returns `filledKeys` for auditing and future telemetry/debug use.

## Guardrail

Run:

```bash
npm run check:project-migration-boundary
```

The guard verifies that project load uses the migration owner, asserts canonical `ui.raw`, and does not call runtime fail-soft raw completion helpers directly.


## Stage 3 addition - config snapshot boundary

Project-load config compatibility is now owned by `esm/native/io/project_migrations/config_snapshot_migration.ts`. The loader calls `buildCanonicalProjectConfigSnapshot(...)` and receives a config snapshot that has already passed a canonical-key assertion.

Runtime selectors may still expose tolerant readers for existing callers, but project ingress must not rely on live runtime fallback to make imported snapshots usable. The migration owner is the only place that may translate persisted/project-load shapes into the canonical config snapshot used by store commits.
