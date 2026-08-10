# Refactor Workmap

This is the root pointer for future architecture work. It links only to the current planning and engineering policies.

## Canonical Planning Files

- `docs/REFACTOR_NEXT_STAGE_PLAN.md` is the decision gate for any future refactor stage.
- `docs/QUALITY_GUARDRAILS.md` is the living engineering policy.
- `docs/FACADE_AND_PUBLIC_API_POLICY.md` owns facade/public API decisions.

## Current Baseline

- The numbered refactor track is closed. `tools/wp_contract_registry.mjs` records current architecture invariants; historical stage proof files are not part of the active control plane.
- Phase 5 test/control-plane simplification is closed: historical proof files and dead identity wrappers are removed, large named test lanes are catalog-backed, and package.json no longer owns long test-file inventories.
- Canonical Domain Codecs are closed across Saved Models, Cloud Collections, Project Config maps, Settings Backup, and the current Project Schema. `check:domain-codecs` owns the cross-domain source boundary, `test:domain-codecs` owns deterministic round-trip/malformed evidence, Settings Backup now exports schema v1 with an explicit unversioned-v0 migration, and Cloud/Project version boundaries reject unsupported schemas.
- Cloud Sync state-machine decomposition is closed behind the stable `createCloudSyncOwnerGatewayIo` surface. Credential/session lifecycle, gateway transport, row cache, conflict journal, conflict resolution, and remote adoption are independent owners; browser lock acquisition remains at the runtime-access boundary and is injected into the resolution machine. `check:cloud-sync-owner-decomposition` plus the gateway runtime suite guard the split.
- New work requires a real bug, measured performance regression, missing behavior coverage, or newly proven ownership seam.
- Import cycles are a guardrail, not an active decomposition target: `check:import-cycles` currently covers `esm` and `types`.
- Private facade/owner splits are guarded by `check:private-owner-imports`; justified entry facades live in the registry and the reviewed single-consumer identity topology is explicit in `tools/wp_identity_facade_inventory.json`.
- Legacy/fallback auditing is semantic and prefix/camel/Pascal-aware: ordinary defaults/capability fallbacks remain report-visible without allowlist churn, reviewed project/external/compatibility seams are growth-ratcheted, reductions pass automatically, and `legacy-runtime-risk` / `unknown` are required to stay at zero.
- Project import behavior is guarded by `check:project-import-fixtures` with real JSON fixtures.
- CSS cascade debt is ratcheted by `check:css-style` using `tools/wp_css_style_budget.json`.
- CSS `transition: all` debt has been cleared; the active CSS budget now locks `transitionAll` at 0.
- Cloud Sync offline/reconnect behavior is guarded by `check:cloud-sync-offline-reconnect`.
- Cloud Sync browser reconnect is smoked by `e2e:cloud-sync-reconnect`.
- Canvas browser pointer parity is smoked by `e2e:canvas-pointer-parity`.
- Targeted E2E matrix expansion is closed: one `@matrix` journey runs across desktop, XS portrait/landscape, touch+DPR2, and reduced-motion profiles while the rest of the Playwright suite remains single-profile. The debug-only scene surface exposes a deterministic wardrobe geometry fingerprint with finite-transform/BufferGeometry invariants, and Cloud Sync offline/reconnect remains a dedicated connectivity profile rather than being multiplied across devices.
- Contract Engine modernization has a completed first family: all ten Dimension Composition owners now share one declarative manifest and one semantic AST/provenance engine, with one canonical runtime-identity test. The former primary/secondary/remaining wrappers and their support files were removed rather than preserved as CI compatibility facades. Exact export statement ordering, duplicated contract declarations, regex shape checks, and stale body hashes were removed from this family; mutation tests prove harmless reordering passes while owner bypasses, aliases, copied logic, and provenance drift fail.
- TypeScript/control-plane simplification is closed: `tsconfig.json` is the canonical whole-project strict gate, `tsconfig.ui-lean.json` is the only alternate portability config, and the former per-layer/non-strict/strict-duplicate `tsconfig.checkjs*` matrix is removed. CI and verify lanes now reuse the canonical project gate instead of rerunning layer subsets; `tsconfig.dist.json` remains a build/emit config rather than a duplicate typecheck lane.
- Capability DI pilot is closed on Viewer Measurement geometry resolution: `viewer_measurement_tool_resolution.ts` and `viewer_measurement_tool_point_resolution.ts` no longer depend on `AppContainer`, runtime accessors, or canvas projection helpers directly. A four-capability `ViewerMeasurementGeometryRuntime` owns camera, grid-map, local-box measurement, and world-to-local projection seams; the public measurement tool constructs the adapter at the feature boundary. The architecture lint now prevents those geometry-core modules from regaining direct runtime/AppContainer dependencies, and runtime coverage proves the resolver works with a directly injected capability object.
- Performance measurement was refreshed on 2026-05-04: `perf:smoke` passed under the stored budget and `perf:browser` passed while refreshing `docs/BROWSER_PERF_AND_E2E_BASELINE.md`.
- Phase 3 error-observability modernization is complete. The current silent-catch baseline is 524/0 globally and 83/0 in services (statement-free/bare), with **0 vague `// ignore` / `// swallow` blocks in every production layer**. Services, Builder, Features, Kernel, and UI now have zero vague catch comments; their remaining statement-free catches are capability-classified best-effort paths rather than undocumented suppression. The UI classification closeout additionally makes Notes persistence/draw hooks, Room mutations, structural recompute, Interior workflow bootstrap, Settings global-click synchronization, Sidebar clamps/exits, Multicolor actions, and mode-controller apply/cleanup observable while precisely classifying event/DOM/browser/timer/prefetch/reporter fallbacks. The Runtime/Platform/Adapters classification closeout is now complete: rejected Boot/Internal/Doors/Cache state writes and required Platform Tools installation are observable or fail closed, door forced-close write failures are diagnostic, and reviewed browser, cleanup, DOM, cache, console, callback, subscription, disposal, and adapter-capability fallbacks carry precise classifications. Edit State reset now exposes real convergence to project, kernel, and React callers while independent cleanup still runs after a rejected owner; kernel, React, and native UI mode transitions fail closed instead of layering a new mode over stale edit state or publishing door/chrome/callback side effects for a rejected transition. Dimension synchronization uses one coordinated transaction and timer for builder/runtime mirrors, rolls the builder mirror back after a rejected runtime write, and immediately flushes when scheduling is unavailable. The shared runtime coalescer reports rejected writes and timer failures rather than claiming a false flush. Cloud Sync now reports pull scheduling/adoption failures, keeps unresolved conflicts active until durable finalization succeeds, and isolates collection/status subscribers with detached snapshots. The commit-critical Render/Measurement/Canvas slice now prevents history-batch mutation replay, rolls rejected camera-pose writes back, fails renderer setup closed, reports committed measurement-state failures, and suppresses paint refresh/render until the canonical config mutation completes. The Canvas structural-authoring closeout routes all `canvas_picking*.ts` module `patchForStack` writes through one transactional seam, rejects unavailable/non-invoking writers, rolls back throw/rejection paths, preserves stable nested identities on successful commits, and reports direct-hit/manual-layout routing failures; services now have zero bare catches.

## Remaining Product-Risk Work

These are the useful remaining upgrade lanes, ordered by value:

1. **Typed geometry/build IR.** Convert geometry descriptor families to discriminated typed plans when those areas are actively changed, enabling deterministic combinatorial invariant tests before Three.js emission. Viewer Measurement is now capability-isolated and is a suitable consumer of typed geometry plans without reopening runtime ownership.
2. **Capability DI expansion on evidence.** The Viewer Measurement pilot is complete. Expand the pattern only where a touched feature shows the same broad-container symptom and the change removes real `AppContainer`/runtime-access reach; do not perform project-wide DI churn.
3. **Contract Engine expansion on demand.** The Dimension Composition pilot is complete. Migrate another source/hash-heavy family only when it is actively changed or its implementation-shape guard creates real refactor friction; reuse the declarative engine rather than creating another one-off parser.
4. Behavior coverage for remaining facade splits and targeted performance/CSS work only when a real user-facing gap, measured regression, or safely reducible budget is demonstrated.

## Verification

Use the smallest relevant check first, then broaden:

```bash
npm run check:docs-control-plane
npm run check:refactor-guardrails
npm run verify:refactor-modernization
```
