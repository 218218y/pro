# Refactor Workmap Progress

This file is the intentionally small, retained progress marker for the refactor guardrail portfolio.
It replaces the removed long-form planning docs with a durable audit contract: every completed stage remains discoverable for the integration checks without keeping stale workmap prose around.

## Current baseline

- Active baseline: Stage 18 source layout, Canvas mirror/split/sketch hit-identity parity, Stage 19 project migration selector hardening, Stage 20 Cloud Sync polling recovery hardening, Stage 21 Cloud Sync realtime start/restart recovery hardening, Stage 22 Cloud Sync lifecycle-owner realtime start/restart recovery hardening, Stage 23 Cloud Sync realtime fallback-publication hardening, and Stage 24 Cloud Sync polling timer-install hardening.
- Refactor verification entry point: `verify:refactor-modernization`.
- Guardrail aggregate lane: `check:refactor-guardrails`.
- Stage regression lane: `test:refactor-stage-guards`.
- Current Cloud Sync hardening slice: pull coalescer failure recovery, main-row push failure/suppression recovery, pending-push-vs-recovery-pull ordering, attention-pull error recovery, realtime-timeout polling recovery hook failures, realtime start/restart setup failures, owner-level realtime start/restart rejection fallbacks, immediate realtime start-guard rejection handling, fallback transition publication-before-reporting, and polling fallback timer-install-before-publication ordering are covered in focused Cloud Sync lanes and guarded by `check:cloud-sync-races`.
- Current Canvas parity slice: mirror face-sign inference, full-door mirror commit fallback from canonical hit identity, sketch-box special-paint target preservation, lower split-door identity/stack/split-part parity, split click commit base/bounds parity, removed-door transparent restore/blocking parity, sketch hover/commit host identity precedence, and sketch-box door module/door identity are covered by focused runtime tests and guarded by `check:canvas-hit-identity` plus `check:canvas-hit-parity`.
- Current Project migration selector hardening slice: project-ingress `ui.raw` migration now canonicalizes existing typed scalar values, removes invalid typed raw values before fallback materialization, preserves experimental raw keys, and proves canonical runtime selectors remain raw-only.

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
- Stage 24 — Cloud Sync polling timer-install hardening retained: polling fallback must not publish an active polling snapshot or `polling:start` diagnostic until the owner timer has actually been installed.

## Maintenance rule

When docs are cleaned again, keep this file as the single compact integration marker. The audit intentionally checks these stage labels and `verify:refactor-modernization` so that the project does not silently lose the refactor closeout history that protects the current code layout.
