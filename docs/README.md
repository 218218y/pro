# Docs control plane

This folder is intentionally compact. Keep only living architecture guidance, setup notes, and tool-owned report targets that future code work actually needs. Root-level stage-update notes are not active planning files; useful decisions belong here or in `refactor_workmap.md`.

## Read first

1. `dev_guide.md` — day-to-day engineering rules and boot/layer boundaries.
2. `ARCHITECTURE_OVERVIEW.md` — compact map of the current architecture.
3. `ARCHITECTURE_OWNERSHIP_MAP.md` — where major surfaces are owned.
4. `QUALITY_GUARDRAILS.md` — active guardrail policies consolidated into one file.
5. `TEST_PORTFOLIO_GUIDELINES.md` — how to keep tests useful instead of noisy.
6. `layering_completion_audit.md` — current decomposition guard strings used by tests.
7. `e2e_smoke.md` — browser/E2E smoke guidance.
8. `install_idempotency_patterns.md` — safe install/re-install patterns.
9. `CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md` and `supabase_cloud_sync_setup.md` — cloud sync lifecycle + database setup.

## Tool-owned report targets

These files are kept because repository scripts may write to them. They should contain current generated output or a short placeholder, not historic closeout logs:

- `PERF_AND_STABILITY_BASELINE.md`
- `BROWSER_PERF_AND_E2E_BASELINE.md`
- `FINAL_VERIFICATION_SUMMARY.md`
- `FINAL_VERIFICATION_SUMMARY.json`
- `SCRIPT_DUPLICATE_AUDIT.md`
- `script_duplicate_audit.json`
- `CSS_STYLE_AUDIT.md`
- `css_style_audit.json`
- `FEATURES_PUBLIC_API_AUDIT.md`
- `features_public_api_audit.json`
- `LEGACY_FALLBACK_AUDIT.md`
- `legacy_fallback_audit.json`
- `TEST_PORTFOLIO_AUDIT.md`
- `test_portfolio_audit.json`

## Cleanup rule

Do not add new stage closeouts, refactor journals, or large generated audit dumps to the active docs tree. If a lesson is still useful, merge it into the relevant living doc above. If it is only proof of a past step, leave it out.
