# Docs control plane

This folder is intentionally small. It contains only live architecture guidance, executable verification guidance, and generated report targets used by repository tools.

## Read first

1. `dev_guide.md` — day-to-day engineering rules and boot/layer boundaries.
2. `ARCHITECTURE_OVERVIEW.md` — compact map of the current architecture.
3. `ARCHITECTURE_OWNERSHIP_MAP.md` — where major surfaces are owned.
4. `TEST_PORTFOLIO_GUIDELINES.md` — how to keep tests useful instead of noisy.
5. `layering_completion_audit.md` — current decomposition guard strings used by tests.
6. `e2e_smoke.md` — browser/E2E smoke guidance.
7. `install_idempotency_patterns.md` — safe install/re-install patterns.
8. `CLOUD_SYNC_LIFECYCLE_STATE_MACHINE.md` and `supabase_cloud_sync_setup.md` — cloud sync lifecycle + database setup.

## Generated / tool-owned files

These files are kept because scripts write to them or other tooling expects them:

- `PERF_AND_STABILITY_BASELINE.md`
- `BROWSER_PERF_AND_E2E_BASELINE.md`
- `FINAL_VERIFICATION_SUMMARY.md`
- `FINAL_VERIFICATION_SUMMARY.json`
- `SCRIPT_DUPLICATE_AUDIT.md`
- `script_duplicate_audit.json`

Historical closeout/stage notes were removed from the active docs tree. Do not re-add one-off stage logs unless they become a living operational doc.
