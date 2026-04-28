# WardrobePro refactor workmap progress

This file tracks the current refactor ZIP line against the original 2026-04-26 workmap. It is intentionally practical: it records what is actually protected by code/tests/guards, not what merely sounds finished.

## Current baseline

- Current generated baseline: `wardrobepro_refactor_stage16_builder_pipeline_context.zip`
- Previous baseline used: `wardrobepro_refactor_stage14_ui_design_system.zip`
- Main active lane: `npm run check:refactor-guardrails`
- Full refactor modernization lane: `npm run verify:refactor-modernization`

## Stage status

| Original workmap stage | Status | What is covered now | Remaining work |
|---|---|---|---|
| Stage 0. Baseline, gates, toolchain | Done | Duplicate script audit is green and package aliases are explicit. | Full gate can still be run locally before release. |
| Stage 1. Legacy/fallback audit | Done | `wp_legacy_fallback_audit` classifies current fallback/legacy inventory. | Use the inventory to remove runtime-risk entries gradually. |
| Stage 2. Migration/import boundary | Mostly done | `io/project_migrations` owns `ui.raw` and config canonicalization for project load. | Add more old-project fixtures when real customer payloads are available. |
| Stage 3. Runtime/config selectors hardening | In progress | Runtime selector policy guard and docs exist. Canonical readers/asserts exist for `ui.raw`. | Remove remaining fail-soft selector paths only with targeted tests. |
| Stage 4. BuildContext-only / builder cleanup | In progress | Builder context policy guard blocks globals, direct DOM/storage/timer access in builder hotpaths. | Builder string normalization and deps resolver ownership are now guarded; continue ctx-only cleanup in deeper module/corner pipelines only with targeted tests. |
| Stage 5. Features public API | In progress | Feature public API contract exists and interior layout preset imports were moved to an API surface. | Expand manifest across modules/corner/door trim/style families. |
| Stage 6. UI React / CSS design system | In progress | `OptionButton`/`OptionButtonGroup` primitives exist; critical Structure/Interior controls use them; Design tab door-style/curtain choices use them; ColorSwatch now owns multi-color brush swatches; CSS ratchet exists. | Saved/default swatches now use `ColorSwatchItem`; continue splitting CSS sections and migrate only true selection controls, not ordinary action buttons. |
| Stage 7. Canvas picking / hit identity | In progress | Canonical `hitIdentity` exists, hover/click contract paths populate it, and click finalization now preserves door-face metadata (`surfaceId`, `faceSide`, `faceSign`) by merging surface-child and parent-part userData. | Add deeper behavior tests for full mirror inside/outside authoring, split removed doors, and sketch parity in browser/e2e lanes. |
| Stage 8. Order PDF / Notes / HTML hardening | In progress | HTML sink policy exists; listener cleanup owner exists and is used by Order PDF/Notes effects. | Split PDF hotspots only after behavior tests are available. |
| Stage 9. Cloud Sync | In progress | `as any` was removed from lifecycle binding; timer ownership guard exists; coalesced pull follow-up queues now reset if the owner becomes disposed or suppressed while a run is in flight; main-row pending push follow-up is now dropped when suppression begins before the active push settles. | Add remaining race tests for reconnect with pending push, hidden-tab attention, and realtime timeout-to-polling resume. |
| Stage 10. Render/build performance | In progress | Perf hotpath guard exists; unused timing probe was removed; scheduler timer ownership is guarded. Stage 10 also wires refactor guardrails into `verify` before the general test suite. Stage 11 deepens Canvas hit parity so commit identity no longer loses face-side metadata discovered at the raycast object. | Run browser perf locally and update budgets only after measured improvement. |
| Stage 11. Type hardening / wide surfaces | In progress | `as any` audit is green for `esm/` and `types/`. | Narrow large surfaces gradually with type tests. |
| Stage 12. Test portfolio modernization | Done for control plane | `wp_test_portfolio_audit` classifies the suite, checks stale package refs and focused tests, and adds a stage guard lane. | Add more user-journey/e2e tests for product-critical flows. |
| Stage 13. Documentation closeout | In progress | This progress file, portfolio docs, and policy docs connect the workmap to the current code. | Final closeout should update owner maps after remaining product-level cleanups. |

## Next recommended deep step

The next highest-value code step is either:

1. **Cloud Sync race coverage** — add focused tests around dispose during pull, reconnect with pending push, hidden tab attention, and realtime timeout to polling resume.
2. **Canvas behavior parity** — use the existing `hitIdentity` contract to prove mirror inside/outside and split-door hover/click parity.
3. **Runtime selector / builder cleanup** — continue fail-fast selector work and ctx-only cleanup where targeted tests already exist.

Avoid starting large PDF splitting or runtime selector removal before the matching behavior tests exist. That is where clean refactors go to become haunted furniture.

## Stage 10 integration note

Stage 10 makes the refactor control plane first-class instead of optional:

- `tools/wp_refactor_integration_audit.mjs` verifies the required guardrail scripts, stage guard tests, progress document, and verify-flow wiring.
- `npm run verify:refactor-modernization` runs the focused modernization lane without requiring bundle/e2e/browser perf work.
- `tools/wp_verify_flow.js` runs `check:refactor-guardrails` before the general `test` command, so refactor regressions fail early.


## Stage 11 canvas hit parity note

Stage 11 closes a concrete gap in the Canvas picking work: click finalization now forwards hit-object userData into the canonical identity normalizer, and the scan step merges child surface metadata with parent part metadata. This gives commit code access to the same semantic face fields that hover already relied on, without adding global state or a heavy wrapper.

Protected by:

- `tools/wp_canvas_hit_parity_contract.mjs`
- `tests/refactor_stage11_canvas_hit_parity_runtime.test.js`
- runtime coverage in `tests/canvas_picking_click_hit_flow_runtime.test.ts`

## Stage 12 cloud sync race hardening note

Stage 12 adds a concrete Cloud Sync race fix rather than only another policy file: if a pull coalescer receives follow-up work during an in-flight run, and the lifecycle becomes disposed or suppressed before that run settles, the queued follow-up is now dropped and the pending reason/count state is reset. Fresh work after the stale window starts from a clean queue.

Protected by:

- `tools/wp_cloud_sync_race_contract.mjs`
- `tests/refactor_stage12_cloud_sync_race_runtime.test.js`
- focused runtime coverage in `tests/cloud_sync_pull_coalescer_runtime.test.ts`


## Stage 13 cloud sync push race note

Stage 13 completes the next Cloud Sync race slice: pending main-row push follow-up work no longer survives a suppression window. If a push is already in flight, another push request is queued, and suppression begins before the in-flight push settles, the stale queued push is now reset instead of being replayed after a later unrelated push.

Protected by:

- `tools/wp_cloud_sync_race_contract.mjs`
- `tests/refactor_stage13_cloud_sync_push_race_runtime.test.js`
- focused runtime coverage in `tests/cloud_sync_main_row_push_flow_runtime.test.ts`

## Stage 14 UI design-system note

Stage 14 extends the UI primitive rollout into the Design tab without introducing a second design system:

- `ColorSwatch` now supports special swatches, children, and custom classes while retaining one keyboard/click contract.
- Multi-color brush swatches use `ColorSwatch` instead of rebuilding the clickable swatch behavior locally.
- Design tab door-style and curtain choices use `OptionButtonGroup` + `OptionButton` instead of bespoke button/div role-button markup.

Protected by:

- `tools/wp_ui_design_system_contract.mjs`
- `tests/refactor_stage14_ui_design_system_runtime.test.js`
- `npm run check:ui-design-system`

## Stage 15 design saved swatch note

Stage 15 completes the next slice of the Design tab primitive rollout: saved/default color swatches now use `ColorSwatchItem` instead of rebuilding clickable swatch shell behavior locally. The lock button remains a real nested button, while the selectable swatch shell owns keyboard/click selection consistently.

Protected by:

- `tools/wp_ui_design_system_contract.mjs`
- `tests/refactor_stage15_design_swatch_system_runtime.test.js`
- `npm run check:ui-design-system`

## Stage 16 builder pipeline context note

Stage 16 strengthens the builder cleanup path without touching geometry or visual behavior. Build string normalization moved to `build_string_normalizer.ts`, `build_wardrobe_flow_context_setup.ts` no longer owns an ad-hoc fallback helper, and `resolveBuilderDepsOrThrow` now has an explicit request type and clearer fail-fast ownership wording.

Protected by:

- `tools/wp_builder_pipeline_contract.mjs`
- `tests/refactor_stage16_builder_pipeline_runtime.test.js`
- `npm run check:builder-pipeline-contract`
