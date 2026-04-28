# Quality guardrails

This file keeps the active engineering policies in one place. Historical stage notes and one-off audit dumps should not be re-added to `docs/`.

## Core source rules

- `esm/` stays Pure ESM: no `window.App`, `globalThis.App`, `window.THREE`, or `globalThis.THREE` probing in source layers.
- Browser/DOM access belongs at entry/adapters/UI boundaries, not in kernel, builder, or domain code.
- Missing required state/dependencies should fail with clear errors instead of silent legacy fallback chains.
- Store state is the source of truth; do not rebuild behavior from DOM snapshots or shadow bags.
- New modules must not perform work on import. Expose explicit install/setup functions.
- Production TypeScript should avoid `as any`; prefer concrete types, `unknown` plus narrowing, and narrow local casts only when unavoidable.

## Builder and render

- Builder orchestration moves through prepared/context objects after the prepare seam, not loose `args` bags.
- Dependency validation belongs at resolver boundaries such as `resolveBuilderDepsOrThrow`.
- Builder code must not use DOM/storage/global timer access directly.
- Render hotpaths should not gain casual probes or duplicate render triggers. Measure through explicit perf/debug owners.
- Perf baselines should be updated only after measured improvement or a deliberate accepted product change.

Relevant checks:

```bash
npm run check:builder-context-policy
npm run check:builder-pipeline-contract
npm run check:perf-hotpaths
```

## Canvas picking

- Hover and click must describe the same visual target through canonical hit identity data.
- `esm/native/services/canvas_picking_hit_identity.ts` owns stable identity fields such as target kind, part id, door/drawer id, module index, stack, surface id, face side/sign, split part, and source.
- Click finalization should preserve the strongest available object metadata instead of re-guessing from weaker ids.
- Identity helpers stay data-only: no DOM, scene mutation, store writes, timers, or UI operations.

Relevant checks:

```bash
npm run check:canvas-hit-parity
```

## Cloud Sync

- Lifecycle orchestration belongs in cloud-sync service owners; UI/panel code displays state and dispatches actions.
- Long-lived timers must come from injected Cloud Sync dependencies or a single browser-runtime timer boundary, not direct global timer calls.
- Pull coalescers and main-row push flows must reset stale queued work across dispose/suppression boundaries.
- Repeated start/stop/pull calls must be singleflight or idempotent.

Relevant docs/checks:

```bash
docs/CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md
npm run check:cloud-sync-timers
npm run check:cloud-sync-races
```

## Project load and runtime selectors

- Project compatibility belongs at project ingress, not inside the live runtime/build path.
- Old persisted shapes may be converted once in `esm/native/io/project_migrations/`.
- After load/import migration, runtime and builder paths should read canonical state only.
- Tolerant compatibility readers may remain for staged migration, but new live paths should prefer canonical readers/assertions.

Relevant checks:

```bash
npm run check:project-migration-boundary
npm run check:runtime-selector-policy
```

## Feature APIs and HTML sinks

- `esm/native/features/` is shared domain logic. External layers should import only deliberate public feature entries.
- Do not add barrels/wrappers just to bypass a public API contract.
- Raw HTML sinks are allowed only inside UI/runtime owners that sanitize, escape, or intentionally mount trusted fragments.
- New sinks must be deliberate and covered by the sink audit allowlist/reasoning.

Relevant checks:

```bash
npm run check:features-public-api
npm run check:html-sinks
```

## React UI primitives and effects

- Repeated choice controls should use the existing option/swatch primitives instead of rebuilding selectable button behavior locally.
- `OptionButton`, `OptionButtonGroup`, `ColorSwatch`, and `ColorSwatchItem` are the current preferred primitives for migrated tab controls.
- React DOM event effects should return one deterministic, idempotent cleanup function.
- Migrated pointer/keyboard effects should use the shared cleanup owner instead of manual scattered `addEventListener` / `removeEventListener` pairs.

Relevant checks:

```bash
npm run check:ui-design-system
npm run check:ui-effect-cleanup
```
