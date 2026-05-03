# Quality guardrails

This file keeps the active engineering policies in one place. Historical stage notes and one-off audit dumps should not be re-added to `docs/`.

## Core source rules

- `esm/` stays Pure ESM: no `window.App`, `globalThis.App`, `window.THREE`, or `globalThis.THREE` probing in source layers.
- Browser/DOM access belongs at entry/adapters/UI boundaries, not in kernel, builder, or domain code.
- Missing required state/dependencies should fail with clear errors instead of silent legacy fallback chains.
- Store state is the source of truth; do not rebuild behavior from DOM snapshots or shadow bags.
- New modules must not perform work on import. Expose explicit install/setup functions.
- Production TypeScript should avoid `as any`; prefer concrete types, `unknown` plus narrowing, and narrow local casts only when unavoidable.

## Public facades and external API boundaries

Use `docs/FACADE_AND_PUBLIC_API_POLICY.md` as the active decision policy for split modules.

- A facade is correct when it protects a deliberate public import boundary, a service/family entry point, a browser/adapter boundary, or a widely used stable seam.
- A facade is not correct when it exists only to hide arbitrary fragmentation, preserve a bad name forever, or bypass a public API contract.
- Do not keep splitting by line count alone. A cohesive 150–300 line owner is usually better than several tiny files that scatter one responsibility across the project.
- Split when there are real separate responsibilities, high volatility, lifecycle/side-effect seams, behavior-test seams, or an import boundary worth protecting.
- External API changes must be deliberate: inventory current consumers, introduce the canonical API, migrate internal imports, keep a compatibility shim only when it has an owner and removal criteria, and then remove the old entry after guards prove it is unused.
- Tiny facades should stay tiny. They may re-export, compose a stable factory/hook, or normalize a narrow public contract; they must not regain business logic, hidden state, timers, DOM access, storage access, or fallback chains.
- Private owner modules should be imported only by their facade or by sibling owners inside the same implementation family. Cross-family consumers should use the public facade unless the policy explicitly marks a lower-level owner as public.
- Ownership guard tests are useful, but they are not enough by themselves. Every risky split should also keep behavior/runtime coverage for the public operation that the facade exposes.

Relevant checks:

```bash
npm run check:docs-control-plane
npm run verify:refactor-modernization
npm run check:refactor-guardrails
npm run test:refactor-stage-guards
```

## Builder and render

- Builder orchestration moves through prepared/context objects after the prepare seam, not loose `args` bags.
- Dependency validation belongs at resolver boundaries such as `resolveBuilderDepsOrThrow`.
- Builder code must not use DOM/storage/global timer access directly.
- Render hotpaths should not gain casual probes or duplicate render triggers. Measure through explicit perf/debug owners.
- Perf baselines should be updated only after measured improvement or a deliberate accepted product change.
- Generated Three.js mirrors under `tools/three_addons/` are vendor refresh outputs. Keep them out of source style gates and validate their runtime surface through `wp_three_vendor_contract`.

Relevant checks:

```bash
npm run check:builder-context-policy
npm run check:builder-pipeline-contract
npm run check:perf-hotpaths
npm run contract:three-vendor
```

## Canvas picking

- Hover and click must describe the same visual target through canonical hit identity data.
- `esm/native/services/canvas_picking_hit_identity.ts` owns stable identity fields such as target kind, part id, door/drawer id, module index, stack, surface id, face side/sign, split part, and source.
- Click finalization should preserve the strongest available object metadata instead of re-guessing from weaker ids.
- Mirror hits that expose only `faceSign` must still resolve a canonical inside/outside face side.
- Mirror paint commits must receive the finalized `hitIdentity`; full-door mirror fallback may use `faceSign` only when no sized mirror draft is active and must remove matching full-face layouts instead of duplicating them.
- Split lower-stack door ids, sketch-box door metadata, and explicit object stack tags must flow through the same hit identity owner used by regular doors.
- Split click commits must normalize effective top/bot/mid part ids through the same split map-key policy and split-hover base-key owner before reading family bounds or dispatching split actions.
- Transparent removed-door restore hitboxes must be pickable only in remove-door mode and only when their owner carries removed-door metadata; transparent material arrays must not block normal clicks.
- Paint target resolution must preserve sketch-box door part keys for special paint maps; canonical sketch door ids may describe identity but must not replace the persisted map key.
- Click identity must not invent a `top` stack when no stack hint exists; use explicit object/module stack evidence only.
- Sketch hover/commit matching must prefer canonical `hostModuleKey`/`hostIsBottom` over legacy `moduleKey`/`isBottom` fields so a stale or mixed hover snapshot cannot commit into the wrong module stack.
- Identity helpers stay data-only: no DOM, scene mutation, store writes, timers, or UI operations.

Relevant checks:

```bash
npm run check:canvas-hit-identity
npm run check:canvas-hit-parity
```

## Cloud Sync

- Lifecycle orchestration belongs in cloud-sync service owners; UI/panel code displays state and dispatches actions.
- Long-lived timers must come from injected Cloud Sync dependencies or a single browser-runtime timer boundary, not direct global timer calls.
- Pull coalescers and main-row push flows must reset stale queued work across dispose/suppression boundaries.
- Repeated start/stop/pull calls must be singleflight or idempotent.
- Debounced Cloud Sync work must re-check suppression when the timer fires, not only when it is scheduled.
- Main-row push failures must be reported non-fatally and must still notify settled listeners so parked pulls can recover.
- Recovery pulls must not run ahead of a debounced main-row push; reconnect/attention/polling refresh work stays parked until the pending local write settles.
- Browser attention listeners must report non-fatal pull errors and remain usable for later events.

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
