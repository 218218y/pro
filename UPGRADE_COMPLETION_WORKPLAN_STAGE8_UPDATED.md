# WardrobePro upgrade completion workplan — Stage 8 final closeout

Date: 2026-05-11  
Baseline ZIP used for this stage: `wardrobepro_stage7_ui_diagnostics_closeout.zip`  
Stage output: `wardrobepro_stage8_lint_bundle_closeout.zip`

## Stage 8 purpose

Stage 8 was a final closeout pass after Stage 7. The goal was not to continue broad refactoring. The goal was to install the project dependencies in the extracted workspace, run the gates that previously could not run locally, and fix only real failures discovered by those gates.

## Stage 8 completed

### 1. Final lint gate fixed without disabling rules

After installing dependencies with:

```bash
npm ci --ignore-scripts
```

`npm run lint:migrate` exposed a real closeout issue introduced by the App-scoped UI reporter upgrades from Stage 7:

```text
esm/native/ui/react/overlay_app_shared.ts
  error  'reportOverlayAppNonFatal' is already defined  no-redeclare

esm/native/ui/react/tabs/design_tab_multicolor_shared.ts
  error  '__designTabReportNonFatal' is already defined  no-redeclare

esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts
  error  'structureTabReportNonFatal' is already defined  no-redeclare
```

Changed files:

```text
esm/native/ui/react/overlay_app_shared.ts
esm/native/ui/react/tabs/design_tab_multicolor_shared.ts
esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts
```

What changed:

- Replaced TypeScript overload declarations with explicit tuple-rest argument types.
- Preserved both supported call shapes:
  - old no-App compatibility calls: `(op, err, throttleMs?)`
  - App-scoped calls: `(app, op, err, throttleMs?)`
- Kept the existing argument normalization helpers and dedupe behavior.
- Did not add `eslint-disable`, wrapper aliases, or compatibility shims.

Decision:

- This is a real final-gate cleanup. Suppressing `no-redeclare` would hide a tooling failure.
- Tuple-rest types are clearer for these mixed legacy/new call signatures and keep runtime behavior unchanged.

### 2. Bundle/perf gate now runs locally

Because dependencies were installed, this stage also verified the gates that previously failed only because `eslint`/`vite` were missing.

Now passing locally:

```bash
npm run lint:migrate
npm run lint
npm run bundle:perf
```

This closes the two environment gaps reported in Stage 7.

## Verification completed

Focused tests passed:

```bash
node tools/wp_run_tsx_tests.mjs \
  tests/overlay_quick_actions_dock_controller_runtime.test.ts \
  tests/overlay_feedback_host_timers_runtime.test.ts \
  tests/design_tab_edit_modes_controller_runtime.test.js \
  tests/design_tab_multicolor_controller_runtime.test.js \
  tests/structure_tab_structure_raw_mutations_runtime.test.js \
  tests/structure_tab_structural_controller_runtime.test.js \
  tests/structure_tab_actions_controller_runtime.test.js \
  tests/structure_tab_shared_runtime.test.ts
```

Typechecks passed:

```bash
npm run typecheck:ui
npm run typecheck:runtime
npm run typecheck:services
npm run typecheck:builder
npm run typecheck:platform
```

Guardrails passed:

```bash
npm run check:strict
npm run check:import-cycles
npm run check:private-owner-imports
npm run check:legacy-fallbacks
npm run check:ui-design-system
npm run check:ui-effect-cleanup
npm run check:css-style
npm run check:perf-hotpaths
npm run check:features-public-api
npm run check:html-sinks
npm run check:project-import-fixtures
npm run check:project-migration-boundary
npm run check:cloud-sync-races
npm run check:cloud-sync-offline-reconnect
npm run check:builder-pipeline-contract
npm run check:refactor-closeout
npm run check:test-portfolio
npm run check:refactor-integration
npm run check:runtime-selector-policy
npm run check:builder-context-policy
npm run check:type-hardening
npm run check:ui-option-buttons
npm run check:canvas-hit-identity
npm run check:canvas-hit-parity
npm run check:cloud-sync-timers
```

Build/perf passed:

```bash
npm run build:dist
npm run bundle:perf
npm run perf:smoke
```

Additional browser perf attempt:

```bash
npm run perf:browser
```

This did not complete in the sandbox because Chromium navigation to the local Vite server was blocked by the environment:

```text
page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:5174/index_pro.html
```

The Vite server started successfully before the browser was blocked, so this is an environment/browser policy failure rather than a source-code failure.

## Current upgrade status after Stage 8

### P1 — Diagnostics closeout

Status: closed for this upgrade batch.

Remaining console fallbacks are either platform/root reporters, intentionally no-App embedded/reporting paths, or tooling/test output. Do not force App through those paths without a natural owner seam.

### P2 — Export/PDF/canvas workflow error surface cleanup

Status: closed for this upgrade batch.

The main export/PDF recovery diagnostics were cleaned in earlier stages. Remaining embedded PDF/no-App cases should remain local unless the PDF runtime naturally receives App.

### P3 — Cloud Sync / autosave / history recovery audit

Status: closed for this upgrade batch.

Cloud Sync, autosave, dirty flag, and history recovery checks pass.

### P4 — Builder/render recovery audit

Status: closed for this upgrade batch.

Builder pipeline and context policy checks pass. Remaining visual recovery behavior should stay best-effort unless a product contract makes it required.

### P5 — Project import fixtures from real old projects

Status: verified, no change needed.

Project import fixture and migration-boundary checks pass. Do not add invented compatibility.

### P6 — UI/default cleanup

Status: closed for this upgrade batch.

Stage 8 only fixed the final lint shape of the Stage 7 UI reporter work. No further UI cleanup is recommended unless a concrete bug or failing guard appears.

### P7 — CSS ratchet

Status: pass.

CSS style check passes.

### P8 — Performance measurement refresh

Status: mostly complete locally.

Passing:

```bash
npm run perf:smoke
npm run bundle:perf
```

Not completed in sandbox:

```bash
npm run perf:browser
```

Blocked by administrator/browser policy while navigating to localhost. Run this one in a normal local machine or CI browser environment.

## Recommended next step

Do not start another broad refactor batch now. The next step should be release verification only:

```bash
npm ci
npm run lint
npm run build:dist
npm run bundle:perf
npm run perf:smoke
npm run perf:browser
npm run e2e:smoke
```

Fix only concrete failures from those gates. The cleanup plan is now effectively complete for the current scope.
