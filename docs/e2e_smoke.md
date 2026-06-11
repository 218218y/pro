# E2E smoke guide

Use E2E smoke tests for browser-level confidence, not as a replacement for focused unit/runtime coverage.

Do not run full `npm run e2e:smoke` after every Codex fix. Run it when the change touches browser boot, UI/browser interactions, Playwright tests, canvas pointer behavior, cloud-sync reconnect behavior, or another user journey listed below. For unrelated docs, tests, or non-browser source changes, prefer targeted runtime/typecheck/lint verification and leave the full browser matrix to GitHub/CI unless the user asks for it.

## Commands

```bash
npm run e2e:smoke:list
npm run e2e:smoke
npm run e2e:cloud-sync-reconnect
npm run e2e:canvas-pointer-parity
npm run e2e:smoke:headed
npm run perf:browser
```

`npm run e2e:smoke:preflight` checks the Playwright/browser environment before running the suite.

The Playwright config runs a small app-shell warmup setup project before the parallel smoke workers.
Keep that setup focused on booting `index_pro.html` and waiting for the canonical shell/canvas readiness;
do not add product scenarios there.

## What belongs in E2E

Keep E2E focused on critical journeys:

- app boot and React shell mount
- core cabinet authoring
- build/export paths
- save/load/reset/restore flows
- order PDF open/edit/export lifecycle
- cloud sync visible controls
- cloud sync offline/reconnect smoke around visible controls and post-reconnect actions
- canvas hover/click pointer parity around real browser pointer events
- settings backup import/export resilience

## Current build coverage

`tests/e2e/authoring_builds.spec.ts` is the canonical browser smoke for real user edits that must trigger
actual build/render work. Keep it focused on high-value authoring modes rather than exhaustive option matrices:
structure/design/interior edits, corner/chest/library/sliding modes, stack-split, and cell-dim overrides.

Release artifact cleanliness is guarded outside browser E2E by `npm run check:release-clean` and by the
pre-release `npm run verify` bundle lane. Tests stay in the source tree, but release folders must not ship
`tests`, `e2e`, Playwright configs, or test-only browser hooks.

## What does not belong in E2E

- pure data normalization
- small helpers
- import/layer checks
- exhaustive variant matrices that can be runtime tests
- historical closeout proof

## Debugging order

1. Run `npm run e2e:smoke:preflight`.
2. Run `npm run e2e:smoke:list` to confirm test discovery.
3. Run the narrow Playwright test or the full smoke suite.
4. Check `.artifacts/` outputs when a browser/perf run writes them.
5. If a failure is environmental, report it as such; do not hide a real product failure behind “probably browser weirdness.”
