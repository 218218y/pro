# Refactor modernization verify lane

Stage 10 promotes the refactor guardrails from ad-hoc scripts to a first-class verification lane.

## Commands

- `npm run check:refactor-guardrails` runs the static architecture guards added through the refactor stages.
- `npm run test:refactor-stage-guards` runs the focused stage guard tests.
- `npm run verify:refactor-modernization` runs duplicate-script checks, legacy/fallback inventory checks, all refactor guardrails, and the stage guard tests.

## Verify-flow policy

`tools/wp_verify_flow.js` runs `check:refactor-guardrails` before the general `test` command. This keeps architectural regressions loud and early without waiting for slower product-level test lanes.

The lane is intentionally lighter than full `npm run verify:gate:no-bundle`: it does not bundle, launch browser e2e, or update performance baselines. It is for refactor safety, not release certification.

## Maintenance policy

When a future stage adds a new refactor guard or focused stage test, update:

1. `package.json` → `check:refactor-guardrails`
2. `package.json` → `test:refactor-stage-guards`
3. `tools/wp_refactor_integration_audit.mjs`
4. `docs/REFACTOR_WORKMAP_PROGRESS.md`

`npm run check:refactor-integration` verifies this wiring.
