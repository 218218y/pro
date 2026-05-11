# WardrobePro upgrade completion workplan — Stage 7 update

Date: 2026-05-11  
Baseline ZIP used for this stage: `02--.zip`  
Stage output: `wardrobepro_stage7_ui_diagnostics_closeout.zip`

## Stage 7 completed

Stage 7 continued the upgrade from the ZIP supplied by the user. The goal was not cosmetic renaming. The work focused on remaining React UI diagnostics seams where a real `App` context already exists and can be passed cleanly.

### 1. Design tab diagnostics cleanup

Changed files:

```text
esm/native/ui/react/tabs/design_tab_multicolor_shared.ts
esm/native/ui/react/tabs/design_tab_edit_modes_controller_runtime.ts
esm/native/ui/react/tabs/design_tab_multicolor_controller_runtime.ts
esm/native/ui/react/tabs/design_tab_multicolor_panel.tsx
esm/native/ui/react/tabs/use_design_tab_custom_color_workflow.ts
tests/design_tab_edit_modes_controller_runtime.test.js
```

What changed:

- `__designTabReportNonFatal` now supports both the old no-App signature and a new App-scoped signature.
- Design edit-mode failures no longer go through local `console.warn`.
- When DesignTab controllers have App context, non-fatal failures go through canonical `reportError(App, ...)` with `consoleFallback: false`.
- Old no-App behavior is preserved as a compatibility fallback for call sites that still do not have a clean App seam.

Decision:

- This is a real diagnostics seam cleanup, not an alias rename.
- The old helper remains because several older call sites still use it as a no-App compatibility path. It is now a compatibility boundary, not the preferred path.

### 2. Structure tab diagnostics cleanup

Changed files:

```text
esm/native/ui/react/tabs/structure_tab_core_edit_mode.ts
esm/native/ui/react/tabs/structure_tab_structure_raw_mutations.ts
esm/native/ui/react/tabs/structure_tab_actions_controller_shared.ts
esm/native/ui/react/tabs/structure_tab_structure_stack_split_mutations.ts
esm/native/ui/react/tabs/structure_tab_structural_controller_sync.ts
```

What changed:

- `structureTabReportNonFatal` now supports both old no-App calls and new App-scoped calls.
- Structure edit mode, raw dimension commits, stack-split mutations, and structural sync now report owner failures through App-scoped diagnostics when App is available.
- Dedupe behavior was preserved for old string/error/object failure shapes.

Decision:

- This avoids forcing App through every historical helper in one risky sweep.
- The updated call sites are high-value because they already own App and are real UI-write seams.

### 3. React overlay diagnostics cleanup

Changed files:

```text
esm/native/ui/react/overlay_app_shared.ts
esm/native/ui/react/overlay_feedback_host.tsx
esm/native/ui/react/overlay_quick_actions_dock.tsx
esm/native/ui/react/overlay_top_controls.tsx
esm/native/ui/react/components/LazyErrorBoundary.tsx
```

What changed:

- `reportOverlayAppNonFatal` now supports App-scoped canonical reporting while preserving the old no-App console fallback.
- Feedback host timers, prompt handling, quick actions, history/camera controls, and overlay lifecycle failures now use App-scoped diagnostics when App is already in scope.
- `LazyErrorBoundary` no longer double-logs after calling `reportError`.

Decision:

- No new reporting framework was added.
- The no-App fallback remains only for small browser event cases where the local component does not hold App in that scope.

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

Build/perf:

```bash
npm run build:dist
npm run perf:smoke
```

Both passed.

Not completed locally:

```bash
npm run lint:migrate
```

Failed because ESLint is not installed in the extracted ZIP environment:

```text
[WP Lint] ESLint not found. Run: npm i (or npm ci)
```

```bash
npm run bundle:perf
```

Failed because `vite` is not installed in the extracted ZIP environment:

```text
[WP Bundle] Missing dependency: vite
Run: npm i -D vite
```

These are missing-dependency/environment failures, not source-code failures from Stage 7.

## Current upgrade status after Stage 7

### P1 — Diagnostics closeout

Status: effectively closed.

Remaining no-App fallbacks are intentionally preserved only where there is no clean App context. Do not force App through those APIs unless a future owner split naturally creates the seam.

### P2 — Export/PDF/canvas workflow error surface cleanup

Status: mostly closed.

Remaining PDF embedded/no-App cases should stay no-App unless the PDF runtime naturally receives App. Do not remove legitimate recovery paths such as optional logo/canvas retry behavior.

### P3 — Cloud Sync / autosave / history recovery audit

Status: closed for the current upgrade batch.

The important Cloud Sync, autosave, dirty flag, and history recovery paths were covered in earlier stages and passed the current guard checks again.

### P4 — Builder/render recovery audit

Status: closed for the current upgrade batch.

Builder pipeline guardrails pass. Remaining visual best-effort recovery should not be converted into hard failures without a product contract requiring it.

### P5 — Project import fixtures from real old projects

Status: verified, no change needed.

Project import fixtures and migration-boundary checks pass. Do not invent compatibility for payloads that do not exist in real projects.

### P6 — UI/default cleanup

Status: mostly closed.

Stage 7 handled the most valuable remaining UI diagnostic seams. Further UI cleanup should be surgical and behavior-driven, not vocabulary-driven.

### P7 — CSS ratchet

Status: pass.

CSS audit passes. No CSS debt cleanup is currently high priority.

### P8 — Performance measurement refresh

Status: partially complete.

`perf:smoke` passes. `bundle:perf` and browser/perf bundle checks require project dependencies (`vite`, browser tooling) in the local environment or CI.

## Recommended next step

The next stage should be a final verification/release-prep stage, not another broad refactor:

1. Run `npm ci` or install the missing dev dependencies.
2. Run `npm run lint:migrate`.
3. Run `npm run bundle:perf`.
4. Run browser/e2e lanes if the environment has Playwright/Chromium.
5. Only if those checks reveal a real failure, fix that specific owner seam.

Do not start a new broad “cleanup wave” unless there is a measured defect, failing guardrail, or clearly identified ownership seam.
