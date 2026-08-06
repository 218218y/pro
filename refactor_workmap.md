# Refactor Workmap

This is the root pointer for future architecture work. It links only to the current planning and engineering policies.

## Canonical Planning Files

- `docs/REFACTOR_NEXT_STAGE_PLAN.md` is the decision gate for any future refactor stage.
- `docs/QUALITY_GUARDRAILS.md` is the living engineering policy.
- `docs/FACADE_AND_PUBLIC_API_POLICY.md` owns facade/public API decisions.

## Current Baseline

- The numbered refactor track is closed. `tools/wp_contract_registry.mjs` records current architecture invariants; historical stage proof files are not part of the active control plane.
- Phase 5 test/control-plane simplification is closed: historical proof files and dead identity wrappers are removed, large named test lanes are catalog-backed, and package.json no longer owns long test-file inventories.
- New work requires a real bug, measured performance regression, missing behavior coverage, or newly proven ownership seam.
- Import cycles are a guardrail, not an active decomposition target: `check:import-cycles` currently covers `esm` and `types`.
- Private facade/owner splits are guarded by `check:private-owner-imports`; justified entry facades live in the registry and the reviewed single-consumer identity topology is explicit in `tools/wp_identity_facade_inventory.json`.
- Legacy/fallback inventory is camelCase/PascalCase-aware, category-locked, and now excludes the cleaned prefixed-map alias helper names and cornice envelope helper names, and renderer-lighting local helper names.
- Project import behavior is guarded by `check:project-import-fixtures` with real JSON fixtures.
- CSS cascade debt is ratcheted by `check:css-style` using `tools/wp_css_style_budget.json`.
- CSS `transition: all` debt has been cleared; the active CSS budget now locks `transitionAll` at 0.
- Cloud Sync offline/reconnect behavior is guarded by `check:cloud-sync-offline-reconnect`.
- Cloud Sync browser reconnect is smoked by `e2e:cloud-sync-reconnect`.
- Canvas browser pointer parity is smoked by `e2e:canvas-pointer-parity`.
- Performance measurement was refreshed on 2026-05-04: `perf:smoke` passed under the stored budget and `perf:browser` passed while refreshing `docs/BROWSER_PERF_AND_E2E_BASELINE.md`.
- Error observability now covers the complete history scheduling family, the boot-seed default pipeline, the Autosave snapshot/storage/scheduling pipeline, camera access/motion, and the Saved Models clone/normalization/persistence family. Owner/action failures, required writes, restore-state reads, timer cleanup, Project Capture rejection, UI status publication, storage failures, camera service invocation, frame scheduling, vector cloning/interpolation, controls updates, canonical collection reads/repairs, mirror writes, listener publication, and PDF-state capture publish stable nonfatal diagnostics while their existing fallbacks remain intact. Invalid or failed Project Capture proceeds to the canonical History snapshot fallback; rejected camera clone, native interpolation, or RAF operations proceed to detached-copy, manual-interpolation, or timer fallbacks. The service-layer silent-catch ratchet is now 131/2 (statement-free/bare). Saved Models cloning never returns the live source on total failure, loading reads one canonical envelope, related repairs commit once under the collection lock, and listener/runtime-mirror consumers receive independently detached nested payloads. Config Compounds now verifies both compound writes in a concrete config snapshot before setting the boot flag, clears every settled in-flight attempt so a failed synchronous seed can be retried, and reports write, retry, timer, clone-exhaustion, and verification failures through the canonical nonfatal surface.

## Remaining Product-Risk Work

These are the useful remaining upgrade lanes, ordered by value:

1. Continue functional error-observability migration in the ordered Phase 3 map: Config Compounds is complete; edit-state reset/synchronization is next, followed by Cloud Sync persistence/reconciliation, render/measurement/Canvas commits, and boot/UI state mirrors. Saved Models persistence/transactions are complete; keep reviewed cleanup/browser fallbacks classified rather than converting them mechanically.
2. Behavior coverage for the last facade splits, especially where a public facade exposes real user-facing behavior rather than only ownership boundaries.
3. Further CSS cleanup only where it can safely lower remaining `!important`, `z-index`, or `box-shadow` budgets without changing layout behavior.
4. Targeted performance owner changes only when future `perf:smoke` or `perf:browser` measurements show a real regression, or when a deliberate product decision accepts a measured hotspot improvement.

## Verification

Use the smallest relevant check first, then broaden:

```bash
npm run check:docs-control-plane
npm run check:refactor-guardrails
npm run verify:refactor-modernization
```
