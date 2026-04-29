# Updated Refactor Plan Files

This repository now keeps the refactor plan in two layers:

- `refactor_workmap.md` and `wardrobepro_refactor_workmap_2026-04-26.md` are the historical baseline plan.
- `wardrobepro_refactor_workmap_2026-04-28.md` is the current handoff plan and has an appended live-repository alignment note.
- `docs/REFACTOR_WORKMAP_PROGRESS.md` is the compact retained progress marker used by integration checks.
- `docs/QUALITY_GUARDRAILS.md` is the living policy document that replaces the removed one-off policy/audit docs.
- `tools/wp_legacy_fallback_allowlist.json` remains the active count-lock for the fallback audit.
- Short placeholder report targets under `docs/` are kept when package/tool scripts still reference them; the scripts can overwrite those files when a report is regenerated.

Do not re-add large generated audit dumps or per-stage closeout docs under `docs/`. When the plan changes, update the current handoff workmap plus the compact progress marker or living guardrail document that owns the rule.

Current live additions:

- Cloud Sync recovery hardening is covered by focused runtime tests and `check:cloud-sync-races`.
- Canvas mirror/split/sketch hit-identity parity, split click commit base/bounds parity, removed-door transparent restore/blocking parity, full-door mirror commit fallback, sketch hover/commit host identity precedence, and sketch-box special-paint target preservation are covered by focused runtime tests plus `check:canvas-hit-identity` and `check:canvas-hit-parity`.
- Project migration selector hardening now canonicalizes existing typed `ui.raw` scalar values at project ingress and proves canonical runtime selectors do not fall back to legacy top-level UI fields.
