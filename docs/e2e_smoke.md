# E2E smoke guide

Use E2E smoke tests for browser-level confidence, not as a replacement for focused unit/runtime coverage.

## Commands

```bash
npm run e2e:smoke:list
npm run e2e:smoke
npm run e2e:smoke:headed
npm run perf:browser
```

`npm run e2e:smoke:preflight` checks the Playwright/browser environment before running the suite.

## What belongs in E2E

Keep E2E focused on critical journeys:

- app boot and React shell mount
- core cabinet authoring
- build/export paths
- save/load/reset/restore flows
- order PDF open/edit/export lifecycle
- cloud sync visible controls
- settings backup import/export resilience

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
