# E2E smoke guide

Use E2E smoke tests for browser-level confidence, not as a replacement for focused unit/runtime coverage.

Do not run full `npm run e2e:smoke` after every Codex fix. Run it when the change touches browser boot, UI/browser interactions, Playwright tests, canvas pointer behavior, cloud-sync reconnect behavior, or another user journey listed below. For unrelated docs, tests, or non-browser source changes, prefer targeted runtime/typecheck/lint verification and leave the full browser matrix to GitHub/CI unless the user asks for it.

## Commands

```bash
npm run e2e:smoke:list
npm run e2e:critical:list
npm run e2e:critical
npm run e2e:matrix:list
npm run e2e:matrix
npm run e2e:smoke
npm run e2e:cloud-sync-reconnect
npm run e2e:canvas-pointer-parity
npm run e2e:smoke:headed
npm run perf:browser
npm run perf:browser:release
```

`npm run e2e:smoke:preflight` checks the Playwright/browser environment before running the suite.

`npm run perf:browser` measures the full instrumented journey against the Vite-dev regression baseline.
`npm run perf:browser:release` first produces a minified/content-hashed release through the canonical release
packager in `perf` observability mode, serves only that folder from the local static server, verifies the served
release metadata, and then runs the same journey against an independent release regression baseline. The release
artifact uses instrumentation so the lane can collect runtime phases and Event Timing, but otherwise follows the
release minification, hashing, HTML, CSS, vendor, and static-serving path rather than Vite module transformation.
Numeric browser-budget candidates receive one clean confirmation run and fail only when reproduced; correctness
errors and missing/invalid evidence fail immediately without retry.
Wall-clock journey materiality is profile-specific: the Vite dev lane requires a 150ms absolute excess to
filter module-transform and development-server jitter, while release and runtime-code budgets retain the 20ms
threshold. This does not relax the static release UX contract.

`npm run e2e:critical` is the required CI lane for pull requests and normal pushes. It keeps the five
canonical Chromium `@critical` journeys (app boot/navigation, real authoring/build follow-through,
save/load roundtrip, canvas pointer preview/commit parity, and the order-PDF overlay lifecycle) and also
runs one targeted `@matrix` journey across five profiles: desktop, XS portrait, XS landscape, touch+DPR2,
and reduced motion. The matrix journey verifies shell interaction, a real structure edit, and deterministic
scene-geometry invariants. It does **not** multiply the rest of the smoke suite across devices.

`npm run e2e:matrix` runs only that five-profile matrix. Cloud Sync offline/reconnect remains a dedicated
single-profile browser scenario (`e2e:cloud-sync-reconnect`); it is intentionally not duplicated across
layout/device profiles because its risk is connectivity lifecycle rather than responsive rendering.

The Playwright config runs a small app-shell warmup setup project before the smoke workers. The regular
`chromium` project excludes `critical_matrix.spec.ts`; one dedicated `matrix` project owns its five profile
cases. Those cases stay in one non-fully-parallel file so they reuse one browser worker instead of starting
several cold Three.js browser processes at once. Keep the setup focused on booting `index_pro.html` and
waiting for canonical shell/canvas readiness; do not add product scenarios there.

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

`tests/e2e/critical_matrix.spec.ts` is the only device/profile multiplication point. Its profile definitions
live in `tools/wp_playwright_matrix_profiles.js`, so Playwright configuration and E2E assertions share one
source of truth.

The debug build exposes `__WP_DEBUG__.scene.getGeometrySnapshot()` without exposing the application
container. The snapshot is deterministic: it scans only the canonical wardrobe group, sorts scene entries,
rounds geometry-relevant transforms, inspects BufferGeometry position data/local bounds, and reports a stable
fingerprint plus violations. Matrix tests require zero non-finite transforms/vertex values and prove that a
real structure edit changes the fingerprint. This gives browser-level geometry evidence without fragile
pixel screenshots.

Release artifact cleanliness is guarded outside browser E2E by `npm run check:release-clean`,
`npm run check:release-observability-clean`, and by the pre-release `npm run verify` bundle lane. Tests stay
in the source tree, but release folders must not ship `tests`, `e2e`, Playwright configs, test-only browser
hooks, or scheduler debug stats instrumentation.

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
