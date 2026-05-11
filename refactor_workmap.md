# Refactor Workmap

This is the root workmap pointer for future work. Older long-form workmaps were consolidated on
2026-05-04, and the remaining stage-update root notes were removed during the 2026-05-11 closeout so there is one clear plan instead of several historical drafts.

## Canonical Planning Files

- `docs/REFACTOR_NEXT_STAGE_PLAN.md` is the decision gate for any future refactor stage.
- `docs/REFACTOR_WORKMAP_PROGRESS.md` is the compact progress marker guarded by integration tests.
- `docs/QUALITY_GUARDRAILS.md` is the living engineering policy.
- `docs/FACADE_AND_PUBLIC_API_POLICY.md` owns facade/public API decisions.

## Current Baseline

- Stage 74, Stage 75, Stage 76, Stage 77, Stage 78, Stage 79, and Stage 80 are retained in the compact progress marker and stage catalog.
- Stage 80 - Measurement and performance guard closeout retained: the refactor track is closed unless a real bug, measured performance regression, missing behavior coverage, or newly proven ownership seam justifies new work.
- Import cycles are a guardrail, not an active decomposition target: `check:import-cycles` currently covers `esm` and `types`.
- Private facade/owner splits are guarded by `check:private-owner-imports`.
- Legacy/fallback inventory is camelCase/PascalCase-aware, category-locked, and now excludes the cleaned prefixed-map alias helper names and cornice envelope helper names, and renderer-lighting local helper names.
- Project import behavior is guarded by `check:project-import-fixtures` with real JSON fixtures.
- CSS cascade debt is ratcheted by `check:css-style` using `tools/wp_css_style_budget.json`.
- CSS `transition: all` debt has been cleared; the active CSS budget now locks `transitionAll` at 0.
- Cloud Sync offline/reconnect behavior is guarded by `check:cloud-sync-offline-reconnect`.
- Cloud Sync browser reconnect is smoked by `e2e:cloud-sync-reconnect`.
- Canvas browser pointer parity is smoked by `e2e:canvas-pointer-parity`.
- Performance measurement was refreshed on 2026-05-04: `perf:smoke` passed under the stored budget and `perf:browser` passed while refreshing `docs/BROWSER_PERF_AND_E2E_BASELINE.md`.

## Remaining Product-Risk Work

These are the useful remaining upgrade lanes, ordered by value:

1. Behavior coverage for the last facade splits, especially where a public facade exposes real user-facing behavior rather than only ownership boundaries.
2. Further CSS cleanup only where it can safely lower remaining `!important`, `z-index`, or `box-shadow` budgets without changing layout behavior.
3. Targeted performance owner changes only when future `perf:smoke` or `perf:browser` measurements show a real regression, or when a deliberate product decision accepts a measured hotspot improvement.

## Historical Cleanup

The removed root workmaps and stage-update notes were historical inputs, not active source of truth:

- `wardrobepro_refactor_workmap_2026-04-26.md`
- `wardrobepro_refactor_workmap_2026-04-28.md`
- `refactor_workmap_next_phase_2026-05-03.md`
- the root `new refactor_workmap` draft
- `README_UPDATED_PLAN_FILES.md`
- `UPGRADE_COMPLETION_WORKPLAN_STAGE7_UPDATED.md`
- `UPGRADE_COMPLETION_WORKPLAN_STAGE8_UPDATED.md`
- `UPGRADE_COMPLETION_WORKPLAN_STAGE9_UPDATED.md`

Their live decisions are now represented in the canonical planning files listed above.

## Verification

Use the smallest relevant check first, then broaden:

```bash
npm run check:docs-control-plane
npm run check:refactor-guardrails
npm run verify:refactor-modernization
```
