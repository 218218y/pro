# Refactor Workmap Progress

This file is the intentionally small, retained progress marker for the refactor guardrail portfolio.
It replaces the removed long-form planning docs with a durable audit contract: every completed stage remains discoverable for the integration checks without keeping stale workmap prose around.

## Current baseline

- Active baseline: Stage 18 source layout, Canvas mirror/split/sketch hit-identity parity, Stage 19 project migration selector hardening, Stage 20 Cloud Sync polling recovery hardening, Stage 21 Cloud Sync realtime start/restart recovery hardening, Stage 22 Cloud Sync lifecycle-owner realtime start/restart recovery hardening, Stage 23 Cloud Sync realtime fallback-publication hardening, Stage 24 Cloud Sync polling timer-install hardening, Stage 25 Cloud Sync polling tick callback recovery hardening, Stage 26 Cloud Sync lifecycle refresh async-rejection hardening, Stage 27 Cloud Sync polling recovery async-hook hardening, Stage 28 Cloud Sync async-recovery implementation alignment, Stage 29 Project runtime selector policy hardening, Stage 30 canonical ui.raw runtime batch-reader hardening, Stage 31 canonical ui.raw public API surface hardening, Stage 32 project selector closeout guardrail anchoring, Stage 33 project config replace-key owner consolidation, Stage 34 canonical project config replace-branch fail-fast hardening, Stage 35 project-load replace-policy closeout anchoring, Stage 36 deterministic project config replace-key ordering, Stage 37 project config replace-key type guard hardening, Stage 38 project migration boundary audit closeout anchoring, Stage 39 refactor stage-catalog owner consolidation, Stage 40 catalog-driven integration-audit anchoring, and Stage 41 stage-catalog runtime guard closeout, Stage 42 legacy fallback inventory closeout, Stage 43 perf runtime surface ownership split, Stage 44 scheduler debug stats ownership split, Stage 45 corner connector special interior ownership split, and Stage 46 domain API shared ownership split.
- Refactor verification entry point: `verify:refactor-modernization`.
- Guardrail aggregate lane: `check:refactor-guardrails`.
- Stage regression lane: `test:refactor-stage-guards`.
- Current Cloud Sync hardening slice: pull coalescer failure recovery, main-row push failure/suppression recovery, pending-push-vs-recovery-pull ordering, attention-pull error recovery, realtime-timeout polling recovery hook failures, realtime start/restart setup failures, owner-level realtime start/restart rejection fallbacks, immediate realtime start-guard rejection handling, fallback transition publication-before-reporting, polling timer installation-before-publication, polling tick restart/refresh/auto-stop callback failures, lifecycle refresh sync/async pull-error reporting, polling start/tick async hook rejection recovery, and live code alignment with the Stage 26/27 async recovery contracts are covered in focused Cloud Sync lanes and guarded by `check:cloud-sync-races`.
- Current Canvas parity slice: mirror face-sign inference, full-door mirror commit fallback from canonical hit identity, sketch-box special-paint target preservation, lower split-door identity/stack/split-part parity, split click commit base/bounds parity, removed-door transparent restore/blocking parity, sketch hover/commit host identity precedence, and sketch-box door module/door identity are covered by focused runtime tests and guarded by `check:canvas-hit-identity` plus `check:canvas-hit-parity`.
- Current Project migration selector hardening slice: project-ingress `ui.raw` migration now canonicalizes existing typed scalar values, removes invalid typed raw values before fallback materialization, preserves experimental raw keys, proves canonical runtime selectors remain raw-only, provides canonical-only numeric/batch dimension readers that fail fast when project ingress did not migrate legacy `ui.*` dimensions, exposes those canonical readers through the public Core/State API surfaces, keeps project-load config replace-owned branches under the project migration owner so empty saved maps/lists clear stale live state instead of merging with it, and now derives the replace-key map plus required-key contract from deterministic owner arrays instead of object-key enumeration.
- Current refactor control-plane closeout slice: completed stage labels and long-lived integration anchors are owned by `tools/wp_refactor_stage_catalog.mjs`, consumed by `tools/wp_refactor_integration_audit.mjs`, and guarded by Stage 10 runtime tests so the audit history does not drift as new stages are added.

## Retained audit anchors

These anchors are intentionally concise. Do not expand them back into the old planning documents unless the stages themselves change.

- Stage 0 — baseline inventory and migration safety markers retained.
- Stage 1 — initial refactor structure and guardrail wiring retained.
- Stage 2 — compatibility and migration boundary markers retained.
- Stage 3 — runtime guardrails retained.
- Stage 4 — public API and type-hardening guardrails retained.
- Stage 5 — UI option-button guardrails retained.
- Stage 6 — UI effect-cleanup guardrails retained.
- Stage 7 — canvas hit-identity guardrails retained.
- Stage 8 — cloud-sync timer and perf hotpath guardrails retained.
- Stage 9 — test portfolio guardrails retained.
- Stage 10 — refactor integration audit retained.
- Stage 11 — canvas hit-parity guardrails retained.
- Stage 12 — cloud-sync race guardrails retained.
- Stage 13 — cloud-sync push-race guardrails retained.
- Stage 14 — UI design-system guardrails retained.
- Stage 15 — design swatch-system guardrails retained.
- Stage 16 — builder pipeline guardrails retained.
- Stage 17 — builder dependency resolver guardrails retained.
- Stage 18 — canvas hit-parity follow-up, mirror/split/sketch identity parity, and current source layout guardrails retained.
- Stage 19 — project migration selector hardening, typed `ui.raw` scalar canonicalization, and raw-only runtime selector guardrails retained.
- Stage 20 — Cloud Sync polling recovery hardening retained: realtime-timeout fallback polling must stay armed even when recovery pull/restart hooks fail.
- Stage 21 — Cloud Sync realtime start/restart recovery hardening retained: unexpected realtime start-flight failures and hint-cleanup failures must be reported as non-fatal and leave polling fallback reachable.
- Stage 22 — Cloud Sync lifecycle-owner realtime start/restart recovery hardening retained: owner-level realtime initial-start/restart failures must not break browser recovery listener binding and must fall back to polling through a non-fatal error path.
- Stage 23 — Cloud Sync realtime fallback-publication hardening retained: realtime start/restart failure transitions must publish the `error` snapshot and diagnostic event before reporting fallback polling transition failures.
- Stage 24 — Cloud Sync polling timer-install hardening retained: polling fallback must not publish an active polling snapshot before the owner timer is successfully installed and recorded.
- Stage 25 — Cloud Sync polling tick callback recovery hardening retained: polling tick restart, refresh, and auto-stop callback failures must be reported as non-fatal without detaching the polling timer or preventing later ticks from recovering.
- Stage 26 — Cloud Sync lifecycle refresh async-rejection hardening retained: lifecycle refresh and attention-pull seams must report synchronous pull failures as `pull-error`, observe asynchronous pull rejections, and preserve later recovery eligibility.
- Stage 27 — Cloud Sync polling recovery async-hook hardening retained: polling start and tick recovery hooks must observe asynchronous pull/restart rejections without losing fallback polling or detaching future ticks.
- Stage 28 — Cloud Sync async-recovery implementation alignment retained: production refresh, attention, and polling tick owners must match the Stage 26/27 contracts instead of only documenting them.
- Stage 29 — Project runtime selector policy hardening retained: canonical `ui.raw` readers must stay raw-only while tolerant `ui.*` fallback remains isolated to explicit legacy helpers.
- Stage 30 — Canonical ui.raw runtime batch-reader hardening retained: runtime/build dimension readers can fail fast on unmigrated legacy snapshots instead of silently rebuilding from legacy `ui.*` fields.
- Stage 31 — Canonical ui.raw public API surface hardening retained: Core and State public API surfaces must export the canonical raw-only readers so callers do not bypass the intended access layer.
- Stage 32 — Project selector closeout guardrail anchoring retained: runtime selector policy, project migration tests, and refactor integration audit must all anchor the public-surface/export contract.
- Stage 33 — Project config replace-key owner consolidation retained: project-load config replace-owned branches must be defined by the project migration owner, not by a local loader-only constant.
- Stage 34 — Canonical project config replace-branch fail-fast hardening retained: canonical project config snapshots must materialize every replace-owned branch before load commit so empty saved maps/lists clear stale state.
- Stage 35 — Project-load replace-policy closeout anchoring retained: project migration boundary audit and stage guards must prove the loader uses the migration-owned replace-key map.
- Stage 36 — Deterministic project config replace-key ordering retained: scalar required keys and replace-owned branches must be ordered tuples owned by project migration, not inferred from object-key enumeration.
- Stage 37 — Project config replace-key type guard hardening retained: project migration must expose a narrow `isProjectConfigSnapshotReplaceKey(...)` seam for callers/tests instead of ad-hoc string casts.
- Stage 38 — Project migration boundary audit closeout anchoring retained: boundary and integration audits must verify deterministic replace-key order, map derivation, barrel exports, and stage guard coverage.
- Stage 39 — Refactor stage-catalog owner consolidation retained: completed stage labels must live in one tool-owned catalog instead of being copied into every audit by hand.
- Stage 40 — Catalog-driven integration-audit anchoring retained: refactor integration audit must consume the shared catalog for progress labels and long-lived anchors.
- Stage 41 — Stage-catalog runtime guard closeout retained: Stage 10 runtime tests must verify catalog uniqueness, progress coverage, anchor coverage, and the audit execution path.

## Maintenance rule

When docs are cleaned again, keep this file as the single compact integration marker. The audit intentionally checks these stage labels and `verify:refactor-modernization` so that the project does not silently lose the refactor closeout history that protects the current code layout.

- Stage 42 — Legacy fallback inventory closeout retained: `tools/wp_legacy_fallback_allowlist.json`, `docs/legacy_fallback_audit.json`, and `docs/LEGACY_FALLBACK_AUDIT.md` must match the current categorized source inventory; `tests/refactor_stage42_legacy_fallback_inventory_guard.test.js` verifies the checked-in audit path.
- Stage 43 — Perf runtime surface ownership split retained: `perf_runtime_surface.ts` must stay a small public facade while perf entry storage, action-result classification, state fingerprinting, and debug budget readers live in focused owner modules guarded by `tests/refactor_stage43_perf_runtime_surface_ownership_guard.test.js`.

- Stage 44 — Scheduler debug stats ownership split retained: `scheduler_debug_stats.ts` must stay a small public facade while reason stat storage, signature/suppression policy, counter recorders, and budget summarization live in focused owner modules guarded by `tests/refactor_stage44_scheduler_debug_stats_ownership_guard.test.js`.


- Stage 45 — Corner connector special interior ownership split retained: `corner_connector_interior_special.ts` must stay a small public facade while metric policy, polygon/shape helpers, folded-content planning, and scene application live in focused owner modules guarded by `tests/refactor_stage45_corner_connector_special_ownership_guard.test.js`.

- Stage 46 — Domain API shared ownership split retained: `domain_api_surface_sections_shared.ts` must stay a small compatibility facade while contracts, prefixed-map semantics, map write/skip policy, and removed-door key policy live in focused owner modules guarded by `tests/refactor_stage46_domain_api_shared_ownership_guard.test.js`.
