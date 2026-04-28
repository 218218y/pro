# Performance Hotpath Policy

WardrobePro has several hotpaths where small accidental work becomes visible: builder scheduling, handle application, render follow-through, canvas hover, and Cloud Sync coalescing.

## Policy

- Do not add unused timing probes inside hotpaths. Measure through explicit debug/perf owners only.
- Builder timers must go through the browser/runtime timer surface, not global timers.
- Builder request coalescing and repeated-execute suppression must remain in the scheduler runtime.
- Render follow-through must stay owned by the platform/runtime access layer.
- Perf baselines must not be loosened to hide regressions. Update baselines only after a measured improvement or a deliberately accepted product change.

## Current guard

`npm run check:perf-hotpaths` runs `tools/wp_perf_hotpath_contract.mjs` and verifies the current builder hotpath invariants:

- `applyHandles` has no unused `performance.now()` / `Date.now()` probe.
- `applyHandles` still triggers render through `runPlatformRenderFollowThrough`.
- scheduler timers go through `getBrowserTimers(App)`.
- request/execute dedupe gates remain present in `scheduler_runtime.ts`.
