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
- New work requires a real bug, measured performance regression, missing behavior coverage, or newly proven ownership seam.
- Import cycles are a guardrail, not an active decomposition target: `check:import-cycles` currently covers `esm` and `types`.
- Private facade/owner splits are guarded by `check:private-owner-imports`; justified entry facades live in the registry and the reviewed single-consumer identity topology is explicit in `tools/wp_identity_facade_inventory.json`.
- Legacy/fallback inventory is camelCase/PascalCase-aware, category-locked, and now excludes the cleaned prefixed-map alias helper names and cornice envelope helper names, and renderer-lighting local helper names.
- Project import behavior is guarded by `check:project-import-fixtures` with real JSON fixtures.
- CSS cascade debt is ratcheted by `check:css-style` using `tools/wp_css_style_budget.json`.
- CSS `transition: all` debt has been cleared; the active CSS budget now locks `transitionAll` at 0.
- Cloud Sync offline/reconnect behavior is guarded by `check:cloud-sync-offline-reconnect`.
- Cloud Sync browser reconnect is smoked by `e2e:cloud-sync-reconnect`.
- Canvas browser pointer parity is smoked by `e2e:canvas-pointer-parity`.
- Performance measurement was refreshed on 2026-05-04: `perf:smoke` passed under the stored budget and `perf:browser` passed while refreshing `docs/BROWSER_PERF_AND_E2E_BASELINE.md`.
- Phase 3 error-observability modernization is complete. The current silent-catch baseline is 526/0 globally and 84/0 in services (statement-free/bare), with **0 vague `// ignore` / `// swallow` blocks in every production layer**. Services, Builder, Features, Kernel, and UI now have zero vague catch comments; their remaining statement-free catches are capability-classified best-effort paths rather than undocumented suppression. The UI classification closeout additionally makes Notes persistence/draw hooks, Room mutations, structural recompute, Interior workflow bootstrap, Settings global-click synchronization, Sidebar clamps/exits, Multicolor actions, and mode-controller apply/cleanup observable while precisely classifying event/DOM/browser/timer/prefetch/reporter fallbacks. The Runtime/Platform/Adapters classification closeout is now complete: rejected Boot/Internal/Doors/Cache state writes and required Platform Tools installation are observable or fail closed, door forced-close write failures are diagnostic, and reviewed browser, cleanup, DOM, cache, console, callback, subscription, disposal, and adapter-capability fallbacks carry precise classifications. Edit State reset now exposes real convergence to project, kernel, and React callers while independent cleanup still runs after a rejected owner; kernel, React, and native UI mode transitions fail closed instead of layering a new mode over stale edit state or publishing door/chrome/callback side effects for a rejected transition. Dimension synchronization uses one coordinated transaction and timer for builder/runtime mirrors, rolls the builder mirror back after a rejected runtime write, and immediately flushes when scheduling is unavailable. The shared runtime coalescer reports rejected writes and timer failures rather than claiming a false flush. Cloud Sync now reports pull scheduling/adoption failures, keeps unresolved conflicts active until durable finalization succeeds, and isolates collection/status subscribers with detached snapshots. The commit-critical Render/Measurement/Canvas slice now prevents history-batch mutation replay, rolls rejected camera-pose writes back, fails renderer setup closed, reports committed measurement-state failures, and suppresses paint refresh/render until the canonical config mutation completes. The Canvas structural-authoring closeout routes all `canvas_picking*.ts` module `patchForStack` writes through one transactional seam, rejects unavailable/non-invoking writers, rolls back throw/rejection paths, preserves stable nested identities on successful commits, and reports direct-hit/manual-layout routing failures; services now have zero bare catches.

## Remaining Product-Risk Work

These are the useful remaining upgrade lanes, ordered by value:

1. **Cloud Sync state-machine decomposition.** Split credential/session state, gateway transport, row cache, conflict journal, conflict resolution, and remote adoption behind the existing external gateway surface. Split only on independent state/lifecycle seams; do not split by file length.
2. **Targeted E2E matrix expansion.** Run critical journeys across desktop, XS portrait/landscape, touch/DPR2, reduced motion, and relevant offline/reconnect profiles without multiplying the whole suite across every device.
3. Behavior coverage for the last facade splits, especially where a public facade exposes real user-facing behavior rather than only ownership boundaries.
4. Further CSS cleanup only where it can safely lower remaining `!important`, `z-index`, or `box-shadow` budgets without changing layout behavior.
5. Targeted performance owner changes only when future `perf:smoke` or `perf:browser` measurements show a real regression, or when a deliberate product decision accepts a measured hotspot improvement.

## Verification

Use the smallest relevant check first, then broaden:

```bash
npm run check:docs-control-plane
npm run check:refactor-guardrails
npm run verify:refactor-modernization
```
