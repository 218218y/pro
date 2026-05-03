# Updated plan files

This repository now keeps the refactor plan in two layers:

- `refactor_workmap.md` and `wardrobepro_refactor_workmap_2026-04-26.md` are the historical baseline plan.
- `wardrobepro_refactor_workmap_2026-04-28.md` is the current handoff plan with live-repository alignment notes.
- `docs/REFACTOR_WORKMAP_PROGRESS.md` is the compact retained progress marker used by integration checks.
- `docs/QUALITY_GUARDRAILS.md` is the living policy document that replaces removed one-off policy/audit docs.
- `docs/FACADE_AND_PUBLIC_API_POLICY.md` is the active decision policy for facade/public-API ownership splits.
- `refactor_workmap_next_phase_2026-05-03.md` is the next-phase plan for Stage 70+ governance and product-risk rebalancing.
- `tools/wp_legacy_fallback_allowlist.json` remains the active count-lock for the fallback audit.
- Short placeholder report targets under `docs/` are kept when package/tool scripts still reference them; the scripts can overwrite those files when a report is regenerated.

Do not re-add large generated audit dumps or per-stage closeout docs under `docs/`. When the plan changes, update the current handoff workmap plus the compact progress marker or living guardrail document that owns the rule.

## Current live additions

- Cloud Sync recovery hardening is covered by focused runtime tests and `check:cloud-sync-races`.
- Canvas mirror/split/sketch hit-identity parity, split click commit base/bounds parity, removed-door transparent restore/blocking parity, full-door mirror commit fallback, sketch hover/commit host identity precedence, and sketch-box special-paint target preservation are covered by focused runtime tests plus `check:canvas-hit-identity` and `check:canvas-hit-parity`.
- Project migration selector hardening canonicalizes existing typed `ui.raw` scalar values at project ingress and proves canonical runtime selectors do not fall back to legacy top-level UI fields.
- Stage 43–69 ownership splits are retained as completed work. Do not restart them or rename Stage 69; in this repository Stage 69 is already the render-interior-sketch external-drawers ownership split.
- The facade/API policy closeout should be treated as Stage 70 or as a documentation-only plan update before Stage 70 code work.

## Professional split policy

Continue splitting only when it creates a real ownership boundary, improves behavior coverage, or protects a public import seam. Do not split just because a file is 200–300 lines.

A cohesive 150–300 line owner is acceptable. More splitting at that size is useful only when the module has separate reasons to change, mixed side effects, weak test seams, lifecycle cleanup risks, or public/private import-boundary risk.

## Files in this plan update

- `docs/QUALITY_GUARDRAILS.md`
  - Adds active rules for public facades, private owners, external API stability, and when to stop splitting.
- `docs/FACADE_AND_PUBLIC_API_POLICY.md`
  - New policy document that defines when to keep a facade, when not to add one, how to redesign public API safely, and why line count alone is not a professional split trigger.
- `refactor_workmap_next_phase_2026-05-03.md`
  - Next-phase refactor plan focused on Stage 70+ facade/API governance, stronger behavior guards, import-boundary auditing, and product-risk slices.

## Recommended verification

Because these are documentation/policy files only, run:

```bash
npm run check:docs-control-plane
npm run verify:refactor-modernization
```

After a future code PR for the boundary audit, also run:

```bash
npm run check:facade-boundaries
npm run check:refactor-guardrails
npm run test:refactor-stage-guards
```
