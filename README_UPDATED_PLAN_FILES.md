# Updated plan files

This repository now keeps the refactor plan in a small active set:

- `refactor_workmap.md` is the root pointer and remaining-work summary.
- `docs/REFACTOR_NEXT_STAGE_PLAN.md` is the canonical decision gate for future refactor work.
- `docs/REFACTOR_WORKMAP_PROGRESS.md` is the compact retained progress marker used by integration checks.
- `docs/QUALITY_GUARDRAILS.md` is the living policy document.
- `docs/FACADE_AND_PUBLIC_API_POLICY.md` is the active decision policy for facade/public-API ownership splits.
- `tools/wp_legacy_fallback_allowlist.json` remains the active count-lock for the fallback audit.
- `tools/wp_css_style_budget.json` is the active CSS cascade debt budget.

Do not re-add large generated audit dumps, dated workmap handoff files, or per-stage closeout docs. When the plan changes, update the root pointer plus the compact progress marker or living guardrail document that owns the rule.

## Current Live Additions

- The root `new refactor_workmap` draft has been reconciled against the live repository state. Its import-cycle concern is now a guardrail, not an active cleanup phase: both `esm` and `types` currently report 0 cycle groups through `tools/wp_cycles.js`.
- `check:import-cycles` is now wired into `check:refactor-guardrails` and `verify:refactor-modernization` so future refactor work cannot silently reintroduce cycles.
- `check:private-owner-imports` now guards registered public facade/private owner families so recent Stage 75-79 owners cannot be imported directly from unrelated consumers.
- `tools/wp_refactor_stage_catalog.mjs` now records explicit metadata for completed Stages 74-80 and post-closeout guardrails, and `check:refactor-integration` validates that metadata against package scripts and guard files.
- `check:project-import-fixtures` now guards real project import JSON fixtures through schema normalization, canonical `ui.raw` migration, and config replace-owned branch materialization.
- `check:css-style` now reads its ratchet from `tools/wp_css_style_budget.json`, so CSS cascade debt limits are explicit and can only move by a deliberate budget change.
- `check:cloud-sync-offline-reconnect` now guards Cloud Sync visible offline reconnect eligibility and hidden reconnect parking until visible return.
- `e2e:cloud-sync-reconnect` now covers a real browser offline/online transition and post-reconnect Cloud Sync action.
- `perf:smoke` and `perf:browser` were refreshed on 2026-05-04; both measured lanes pass, and the browser baseline report was updated.
- Cloud Sync recovery hardening is covered by focused runtime tests and `check:cloud-sync-races`.
- Canvas mirror/split/sketch hit-identity parity, split click commit base/bounds parity, removed-door transparent restore/blocking parity, full-door mirror commit fallback, sketch hover/commit host identity precedence, and sketch-box special-paint target preservation are covered by focused runtime tests plus `check:canvas-hit-identity` and `check:canvas-hit-parity`.
- Project migration selector hardening canonicalizes existing typed `ui.raw` scalar values at project ingress and proves canonical runtime selectors do not fall back to legacy top-level UI fields.
- Stage 43-69 ownership splits are retained as completed work. Do not restart them or rename Stage 69; in this repository Stage 69 is already the render-interior-sketch external-drawers ownership split.
- The facade/API policy closeout should be treated as Stage 70 or as a documentation-only plan update before Stage 70 code work.

## Professional Split Policy

Continue splitting only when it creates a real ownership boundary, improves behavior coverage, or protects a public import seam. Do not split just because a file is 200-300 lines.

A cohesive 150-300 line owner is acceptable. More splitting at that size is useful only when the module has separate reasons to change, mixed side effects, weak test seams, lifecycle cleanup risks, or public/private import-boundary risk.

## Historical Workmap Cleanup

These dated/root draft files were consolidated into the active set above and removed:

- `wardrobepro_refactor_workmap_2026-04-26.md`
- `wardrobepro_refactor_workmap_2026-04-28.md`
- `refactor_workmap_next_phase_2026-05-03.md`
- the root `new refactor_workmap` draft

## Recommended Verification

Because these are documentation/policy files only, run:

```bash
npm run check:docs-control-plane
npm run verify:refactor-modernization
```

For CSS/report updates, also run:

```bash
npm run report:css-style
npm run check:css-style
```
