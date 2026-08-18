# Final Verification Summary

- schema_version: `1`
- run_id: `6c1104c9-54d2-4fc7-a239-a18437d29b50`
- generated_at: 2026-08-17T21:38:36.511Z
- workspace: `C:\Users\יעקב\Downloads\pro\latestzip`
- source_digest: `sha256:bd777cdeee60bcecf2ce473bb654a4ba95fea60971f78f806faa242dae4e44a8`
- source_files: **4457**
- lane_catalog_digest: `sha256:84d34fbfad79f10546eb6db842ecb58efa63e34a1e62323a2bb5e7f6aeb27229`
- node: `v24.18.0`
- final_status: **passed**
- requested lanes: **29**
- completed selection: **yes**
- total results: **29**
- passed: **29**
- environment-blocked: **0**
- runner-blocked: **0**
- failed: **0**
- selected profiles: `default`
- selected categories: `(all)`
- selected lanes: `(all)`
- skipped lanes: `(none)`
- resumed from: `(start)`
- requested lane ids: `verification-control-plane, toolchain-surfaces, build-dist, perf-smoke, overlay-export-core, order-pdf-overlay-core, order-pdf-pdf-render, order-pdf-sketch, order-pdf-export-overlay, order-pdf-export-builders, order-pdf-export-capture, order-pdf-export-text, sketch-manual-hover, sketch-box-hover, sketch-free-boxes, sketch-render-visuals, cloud-sync-lifecycle, cloud-sync-main-row, cloud-sync-panel-install, cloud-sync-panel-controller, cloud-sync-panel-subscriptions, cloud-sync-panel-snapshots, cloud-sync-sync-ops, cloud-sync-tabs-ui, e2e-preflight, e2e-list, e2e-smoke-run, browser-perf, browser-perf-release`
- completed lane ids: `verification-control-plane, toolchain-surfaces, build-dist, perf-smoke, overlay-export-core, order-pdf-overlay-core, order-pdf-pdf-render, order-pdf-sketch, order-pdf-export-overlay, order-pdf-export-builders, order-pdf-export-capture, order-pdf-export-text, sketch-manual-hover, sketch-box-hover, sketch-free-boxes, sketch-render-visuals, cloud-sync-lifecycle, cloud-sync-main-row, cloud-sync-panel-install, cloud-sync-panel-controller, cloud-sync-panel-subscriptions, cloud-sync-panel-snapshots, cloud-sync-sync-ops, cloud-sync-tabs-ui, e2e-preflight, e2e-list, e2e-smoke-run, browser-perf, browser-perf-release`
- state file: `(none)`

## Interpretation

All selected closeout lanes passed. This report is valid for the explicit selection recorded above.

No environment blockers were detected in this closeout run.

No runner blockers were detected in this closeout run.

## Lane results

### [PASS] Verification control-plane contracts

- id: `verification-control-plane`
- category: `toolchain`
- command: `node tools/wp_test_group.mjs verification-control-plane`
- status: **passed**
- exit code: `0`
- duration: `1556ms`

#### stdout

```text
✔ generated report catalog classifies source-derived reports separately from release evidence (2.5255ms)
✔ generated report default selection excludes release evidence while explicit selection stays strict (0.5588ms)
✔ generated report selection rejects unknown ids and preserves catalog order (0.3844ms)
✔ generated report comparison ignores timestamps but catches semantic drift (8.7354ms)
✔ source identity is deterministic and changes when owned source changes (108.0725ms)
✔ lane catalog identity covers lane execution and profile membership (0.9242ms)
✔ verification payload binds results to source lane catalog and explicit selection (58.0429ms)
✔ verification validation fails closed for source drift lane drift and summary tampering (125.9872ms)
✔ state compatibility rejects legacy or stale payloads with a reset instruction (79.1437ms)
✔ summary and final status preserve environment blockers without treating them as clean proof (0.1948ms)
✔ empty and partial selections cannot report a successful closeout (50.5718ms)
✔ verification summary contract derives markdown from one validated JSON payload (84.0326ms)
✔ verification summary contract refuses to canonize a stale report (65.3286ms)
✔ verification summary contract rejects a successful focused profile as final proof (56.702ms)
✔ closeout resolves npm through its JS CLI without a shell command fallback (1.9444ms)
✔ closeout lanes keep stable ids and include critical families (0.1618ms)
✔ group-backed closeout lanes execute canonical test groups directly (3.8115ms)
✔ overlay export closeout lane stays direct and uses a live canonical typecheck mode (1.5884ms)
✔ closeout profiles stay stable and Order PDF remains fully catalog-backed (0.197ms)
✔ normalize args collects profiles categories lane ids skips log dir and state options (0.2814ms)
✔ closeout CLI rejects unknown flags missing values and unknown selectors (0.8228ms)
✔ final report eligibility requires a complete clean default closeout (546.2114ms)
✔ select lanes respects profile resume and skip while preserving order (0.2266ms)
✔ environment classifier recognizes playwright/browser failures (0.1961ms)
✔ runner classifier recognizes wrapper and sandbox failures (0.1447ms)
✔ summary separates passed failures environment-blocked and runner-blocked lanes (0.1042ms)
✔ state helpers merge by lane id and preserve canonical order (0.1607ms)
✔ state helpers roundtrip versioned payloads and return null when the file is missing (406.5062ms)
✔ reset-style empty state is explicitly not-run rather than passed (390.0939ms)
✔ state file resolves to explicit flag or default artifact path (0.0978ms)
✔ browser-dependent lanes inherit environment-blocked from preflight (0.353ms)
✔ report paths stay under docs and state path stays under artifacts (0.0727ms)
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1467.2069

```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `node tools/wp_test_group.mjs toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `9746ms`

#### stdout

```text
✔ [actions.patch types] fixture uses native @ts-expect-error contracts (3.3381ms)
✔ [actions.patch types] public/backend patch contract fixture typechecks through tsc (601.6013ms)
✔ [actions.patch types] fixture is safe if discovered by the generic runtime runner (272.4247ms)
✔ package-lock resolved tarballs stay on public registries (5.975ms)
✔ ts runtime loader loads a plain TS module (146.448ms)
✔ ts runtime loader resolves local .js imports to TS files (21.1727ms)
✔ ts runtime loader supports object mocks by exact specifier (6.3735ms)
✔ ts runtime loader supports dynamic mocks with loader context (6.6903ms)
✔ ts runtime loader cache returns the same module instance (8.9489ms)
✔ ts runtime loader transform errors include the fixture filename (7.3394ms)
✔ ts runtime loader evaluate errors include the fixture filename (8.2148ms)
✔ runtime tests do not reintroduce per-test TS VM loaders (149.7668ms)
✔ AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers (5.057ms)
✔ AST adapter preserves import, dynamic import, member, optional-chain, and meta-property shapes for callers (2.44ms)
✔ AST adapter keeps token/code-line metrics independent from tool callers (0.9138ms)
✔ AST adapter centralizes type-hardening AST counts (0.775ms)
✔ AST adapter exposes syntax error diagnostics without TypeScript compiler API (0.6203ms)
✔ no project tool/test/runtime source imports TypeScript directly (554.4134ms)
✔ AST adapter returns injected adapter instances without exposing TypeScript module wrapping (2.2785ms)
✔ build-dist args parsing keeps clean/assets/help/unknown policy (2.3458ms)
✔ build-dist path resolution stays rooted under project dist (0.5073ms)
✔ static asset copy mirrors html/runtime/public assets into dist (39.8532ms)
✔ static asset copy keeps repository tests out of dist outputs (6.3819ms)
✔ static asset copy fails when the canonical runtime config module is missing (3.4137ms)
✔ build-dist TypeScript resolver requires local TypeScript by default (2.6418ms)
✔ build-dist TypeScript resolver allows system tsc only in explicit manual mode (1.7907ms)
✔ build-dist flow fails clearly instead of using system tsc when local TypeScript is missing (2.0244ms)
✔ build-dist rejects unknown options in CI/release mode (1.0126ms)
✔ build-dist retries once without tsbuildinfo when incremental build misses entry (8.6857ms)
✔ bundle arg parsing preserves out/sourcemap/minify/rebuild policy (3.1375ms)
✔ bundle path resolution derives out dir and stale tmp cleanup dir canonically (0.3688ms)
✔ bundle dist freshness requests rebuild when entry/build info are stale or missing (6.1789ms)
✔ bundle TypeScript resolver refuses system tsc unless manual fallback is explicit (3.4157ms)
✔ bundle dist build fails before probing system tsc when local TypeScript is missing (1.6421ms)
✔ bundle artifact cleanup removes numbered chunk wrappers only (3.3028ms)
✔ bundle emit writes entry code, sourcemap comment, and extra chunks canonically (10.2667ms)
✔ bundle build config keeps strict entry signatures and named chunk policy (0.7123ms)
✔ bundle build config maps scheduler debug stats to full implementation outside client mode (0.3951ms)
✔ bundle emit writes build-mode marker next to the entry bundle (4.7793ms)
✔ check arg parsing preserves baseline/json/gate/strict flags (1.9944ms)
✔ check mode detection prefers js first and falls back to esm (1.3941ms)
✔ check syntax runner reports malformed js files (87.1476ms)
✔ check policy stats count legacy/root needles by directory (8.2042ms)
✔ check gate/strict results report regressions and clean strict state (0.4586ms)
✔ check json report preserves file and policy summary fields (0.2421ms)
✔ lint architecture contracts block new restricted imports, globals, and App bag access (6.3705ms)
✔ lint architecture contracts keep viewer measurement geometry behind capability DI (1.3746ms)
✔ lint architecture contracts keep viewer measurement flow and facade on the feature runtime boundary (3.2333ms)
✔ lint architecture contracts keep carcass shell geometry on the canonical typed IR boundary (1.1569ms)
✔ lint architecture contracts keep corner cornice planners on plan-first typed IR (0.5795ms)
✔ lint architecture contracts keep part-hover preview clients behind the typed protocol runtime (2.9217ms)
✔ lint architecture contracts keep planar reflector lifecycle ownership separated (7.0844ms)
✔ lint architecture contract has no unbaselined or stale violations in the current tree (9263.49ms)
✔ lint architecture baseline count matches the json baseline file (1.6205ms)
✔ lint architecture contracts fail a new violation that is not in baseline (10.5856ms)
✔ lint architecture contracts allow a violation only when it is explicitly baselined (3.7715ms)
✔ lint architecture contracts fail when a baseline entry is stale (3.0297ms)
✔ lint architecture baseline is loaded from json, not hardcoded in the tool (0.2759ms)
✔ JS-only prof
...
[trimmed 15412 chars]
```

### [PASS] Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `3637ms`

#### stdout

```text

> build:dist
> node tools/wp_build_dist.js

[WP BuildDist] Building dist modules (tsc:local-node-modules-package-bin)...
[WP BuildDist] Copying static assets to dist/...
[WP BuildDist] Done: dist/esm + dist/types + static assets

```

### [PASS] Perf smoke baseline

- id: `perf-smoke`
- category: `perf`
- command: `npm run perf:smoke`
- status: **passed**
- exit code: `0`
- duration: `8560ms`

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] test-group:perf-toolchain-core
============================================================

✔ check arg parsing preserves baseline/json/gate/strict flags (1.9554ms)
✔ check mode detection prefers js first and falls back to esm (1.4957ms)
✔ check syntax runner reports malformed js files (85.6303ms)
✔ check policy stats count legacy/root needles by directory (11.9213ms)
✔ check gate/strict results report regressions and clean strict state (0.5231ms)
✔ check json report preserves file and policy summary fields (0.2282ms)
✔ perf smoke args parse lanes, scripts, baseline paths, and flags canonically (2.8429ms)
✔ perf smoke help text advertises default lanes and baseline flags (0.3514ms)
✔ perf smoke planner resolves verify lanes and dedupes script overlap (0.8275ms)
✔ perf smoke resolves the stable Node-only profile directly and keeps other scripts on npm fallback (1.0184ms)
✔ perf smoke baseline evaluation detects regressions and profile drift (1.6845ms)
✔ perf smoke markdown report keeps durable tool-owned baseline anchors (1.5074ms)
✔ perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow (9.8651ms)
✔ [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules (6.4166ms)
✔ [toolchain] bundle keeps one thin entrypoint plus canonical owner modules (1.0335ms)
✔ [toolchain] check keeps one thin entrypoint plus canonical owner modules (0.7895ms)
✔ [toolchain] release keeps one thin entrypoint plus canonical owner modules (1.1449ms)
✔ [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules (1.0442ms)
✔ [toolchain] test keeps one thin entrypoint plus canonical owner modules (0.8012ms)
✔ [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules (1.7546ms)
✔ [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules (0.6259ms)
✔ [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules (0.6282ms)
✔ [toolchain] verify keeps one thin entrypoint plus canonical owner modules (0.7381ms)
✔ [toolchain] verify-parallel keeps one thin entrypoint plus canonical owner modules (0.6307ms)
✔ verify lane state parses canonical lane names plus print/dry-run/no-dedupe flags (4.3908ms)
✔ verify lane catalog uses typed tasks and dedupes multi-lane plans (0.8156ms)
✔ verify lane planner reports canonical task order for single and multi-lane runs (0.5155ms)
✔ verify lane flow dispatches test groups directly and package scripts through npm (0.4852ms)
✔ verify lane flow dedupes overlapping typed tasks across multiple lanes by default (0.3139ms)
✔ verify lane help text advertises the canonical lane catalog and multi-lane support (0.4659ms)

⚠️  Prettier check: formatting differences found (warning only).

❌ Prettier check failed in gate mode (formatting differences found).
✔ verify parallel args preserve verify flags and local concurrency controls (2.2773ms)
✔ verify parallel plan builds once and gives test shards isolated reports (2.003ms)
✔ verify parallel flow treats prettier diffs as warnings outside gate mode (2.2934ms)
✔ verify parallel flow fails prettier diffs in gate mode and skips bundle phase (0.9914ms)

============================================================
[WardrobePro] build dist (no assets)
============================================================

✔ verify args parsing preserves gate/no-build/skip-bundle/soft-format policy (1.9821ms)
✔ format check classification warns in normal mode and fails in strict gate mode (0.5267ms)
✔ ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise (2.1477ms)
✔ verify flow orders core checks and skips bundle commands when requested (3.6613ms)
✔ verify flow runs both client release bundle targets in order when bundling is enabled (2.2763ms)
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 215.0993

============================================================
[WP Perf Smoke] test-group:ui-react-import-hardening-contracts
============================================================

✔ ui react import hardening removes legacy React namespace access from pure ts modules (22.5894ms)
✔ ui react import hardening uses explicit named type imports for event-heavy contracts (0.2589ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 92.9016

============================================================
[WP Perf Smoke] test-group:ui-react-jsx-hardening-contracts
============================================================

✔ ui react jsx import hardening removes legacy default React imports and namespace access from tsx modules (7.8458ms)
✔ ui react jsx import hardening uses explicit named imports in representative components (0.2716ms)
ℹ
...
[trimmed 1261 chars]
```

### [PASS] Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `8071ms`

#### steps

- [PASS] overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 149ms)
- [PASS] typecheck project: `node tools/wp_typecheck.js --mode project` (passed, 606ms)
- [PASS] layer contracts: `node tools/wp_layer_contract.js` (passed, 6318ms)
- [PASS] public api contracts: `node tools/wp_public_api_contract.js` (passed, 998ms)

### [PASS] Order PDF overlay core (canonical group)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-overlay-core`
- status: **passed**
- exit code: `0`
- duration: `2117ms`

#### stdout

```text
✔ order pdf export actions honor image/gmail busy flags before starting another action (7.5923ms)
✔ order pdf interaction handlers report pointer-cancel failures instead of throwing (0.647ms)
✔ order pdf export actions reuse cached interactive blob while draft signature is unchanged (1.4532ms)
✔ getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error (1.9612ms)
✔ getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess (0.2831ms)
✔ getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text (0.2173ms)
✔ applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists (0.3099ms)
✔ readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing (3.1601ms)
✔ loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state (0.789ms)
✔ refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it (0.4964ms)
✔ resolveOrderPdfInlineConfirmAction returns the selected follow-up draft (0.2681ms)
✔ order pdf draft effects preserves a canonical edited details pair (3.067ms)
✔ order pdf draft effects derives the seed from canonical text when auto details are empty (0.381ms)
✔ order PDF editor mode starts from externally-owned sketch visibility (2.5545ms)
✔ PDF annotation waits for an open sketch preview to close (0.407ms)
✔ an externally opened sketch preview preempts PDF page annotation (0.2064ms)
✔ requesting sketch preview closes PDF annotation before the external toggle resolves (0.1727ms)
✔ canceling a pending PDF request does not reopen it after the sketch closes (0.2021ms)
✔ order pdf stage/file interactions keep close intent and PDF validation behavior canonical (3.0053ms)
✔ order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state (8.7949ms)
✔ getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes (0.7747ms)
✔ getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks (1.0009ms)
✔ bindExportApiFromModule captures the app once and returns null for missing module/app (0.3853ms)
✔ order pdf details line helpers parse and collect canonical keyed rows (2.4395ms)
✔ order pdf details line helpers preserve inline tails and positioned extras (1.1591ms)
✔ order pdf text fallback html decoder preserves newlines and common entities without a document (0.8895ms)
✔ order pdf text public seam exposes the canonical empty draft defaults (0.6164ms)
✔ order pdf text merge falls back to exact base replacement when no marker document is available (0.4094ms)
✔ order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam (2.7001ms)
✔ order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear (1.438ms)
✔ order pdf merge support resolves clean detected regions without preserving stale manual leftovers (0.5748ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2025.29

```

### [PASS] Order PDF PDF-render batch (canonical group)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-pdf-render`
- status: **passed**
- exit code: `0`
- duration: `2137ms`

#### stdout

```text
✔ [order-pdf] prepared details split can be painted without re-wrapping (3.1652ms)
✔ [order-pdf] prepared layout preserves wrapped lines and visible max-line window (0.5183ms)
✔ [order-pdf] image-pdf details text uses the canonical touched semantics (0.2577ms)
✔ order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled (20.9247ms)
✔ order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled (6.0735ms)
✔ order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled (4.3177ms)
✔ order pdf pdf-import clears saved form text and stale widget appearances for editor background (15.7481ms)
✔ order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails (2.4612ms)
✔ order pdf pdf-import extracts generated field names through the canonical document-field runtime (16.363ms)
✔ order pdf pdf-import reads bytes from file-like objects and tolerates read failures (0.3307ms)
✔ order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page (3.239ms)
✔ order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime (0.9596ms)
✔ order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer (0.7394ms)
✔ order pdf image-pdf export writes hidden import fields that load back into the editor (7.8981ms)
✔ order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path (2.9358ms)
✔ order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup (0.3189ms)
✔ cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly (1.3486ms)
✔ loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document (0.7333ms)
✔ loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves (0.4097ms)
✔ order pdf render helpers treat destroyed/aborted worker errors as expected cancellations (2.4921ms)
✔ loadOrderPdfFirstPage clones source bytes before handing them to pdf.js (1.6436ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2038.9455

```

### [PASS] Order PDF sketch batch (canonical group)

- id: `order-pdf-sketch`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-sketch`
- status: **passed**
- exit code: `0`
- duration: `1845ms`

#### stdout

```text
✔ [history-ui] suspended history shortcuts are detected from the active overlay element (1.1999ms)
✔ [history-ui] suspended history shortcuts fall back to a document-level overlay marker (0.329ms)
✔ [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags (3.6947ms)
✔ [order-pdf] refresh-auto preserves sketch annotations while refreshing project details (0.8793ms)
✔ [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport (0.8141ms)
✔ [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space (0.128ms)
✔ [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot (0.7507ms)
✔ [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports (0.1644ms)
✔ [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes (0.1453ms)
✔ [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads (0.4744ms)
✔ [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes (0.2533ms)
✔ [order-pdf] sketch canvas frame only commits once a real 2d context exists (0.5153ms)
✔ [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically (2.2196ms)
✔ [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key (0.4102ms)
✔ [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion (0.2151ms)
✔ [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect (0.2476ms)
✔ [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point (0.2988ms)
✔ [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths (0.9353ms)
✔ [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history (0.2624ms)
✔ [order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts (0.4261ms)
✔ [order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically (0.4322ms)
✔ [order-pdf] sketch panel runtime reads drawing rects once from the measured host surface (0.3437ms)
✔ [order-pdf] sketch preview reveal scrolls the editor stage just enough to expose created images (0.3973ms)
✔ [order-pdf] sketch preview reveal does not scroll when the panel is already visible (0.1342ms)
✔ [order-pdf] sketch preview reveal uses the stage scroll container instead of the page window (0.3108ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after success (1.2624ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after failure (1.0731ms)
✔ [order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states (0.3577ms)
✔ [order-pdf] sketch preview session restores the original doors-open state after success (0.2831ms)
✔ [order-pdf] sketch preview session snapshot captures and restores the original camera pose (0.9652ms)
✔ [order-pdf] sketch preview session restores the original camera pose after success (0.3359ms)
✔ [order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z (1.2701ms)
✔ [order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew (0.2958ms)
✔ [order-pdf] sketch history shortcuts are always consumed while the sketch panel is open (0.2304ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1745.3149

```

### [PASS] Order PDF export overlay batch (canonical group)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-overlay`
- status: **passed**
- exit code: `0`
- duration: `1759ms`

#### stdout

```text
✔ loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data (2.9275ms)
✔ exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download (0.5058ms)
✔ exportOrderPdfImageWithDeps reports busy before building another image PDF (0.3184ms)
✔ exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing (0.3055ms)
✔ loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast (0.8103ms)
✔ exportOrderPdfInteractiveWithDeps preserves the real export failure detail (0.3177ms)
✔ loadOrderPdfIntoEditorWithDeps treats canonical html-only extracted details as found fields (0.5914ms)
✔ loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late (0.5582ms)
✔ order pdf overlay export ops fail fast when rasterization has no document seam (1.5012ms)
✔ order pdf overlay export ops build image attachments through the canonical attachment seam (2.7837ms)
✔ order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages (0.8486ms)
✔ order pdf overlay image rasterization restores first-page annotations clipped inside repainted PDF text boxes (1.1734ms)
✔ order pdf export single-flight reuses duplicate same-key work per app and clears after completion (2.1688ms)
✔ order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps (0.5762ms)
✔ order pdf export single-flight derives stable load keys and maps them back to action kinds (0.5321ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1662.116

```

### [PASS] Order PDF export builders batch (canonical group)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-builders`
- status: **passed**
- exit code: `0`
- duration: `2159ms`

#### stdout

```text
✔ resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values (0.7267ms)
✔ resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so (0.2398ms)
✔ resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides (1.6468ms)
✔ buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable (349.706ms)
✔ captureOrderPdfCompositeImages applies sketch annotations after base composite capture (2.0433ms)
✔ buildOrderPdfDocumentResult embeds the primary PDF page annotation layer at high raster density (1.2682ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2060.464

```

### [PASS] Order PDF export capture batch (canonical group)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-capture`
- status: **passed**
- exit code: `0`
- duration: `1747ms`

#### stdout

```text
✔ order pdf capture cache signature falls back cleanly when state is missing or invalid (1.1919ms)
✔ order pdf capture cache returns cloned bytes instead of live cache buffers (0.942ms)
✔ order pdf capture cache reuses sketch base assets while signature is unchanged (0.5919ms)
✔ order pdf capture cache ignores editor/runtime ephemera but invalidates on canonical config changes (0.2925ms)
✔ order pdf capture cache signature ignores sketch-only annotation changes (0.6986ms)
✔ export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas (2.0782ms)
✔ export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures (0.4614ms)
✔ order PDF render/sketch composite preserves chest live viewport and screenshot note mapping (1.5965ms)
✔ order PDF open/closed composite preserves corner live viewport and screenshot note mapping (0.7431ms)
✔ export order pdf ops factory exposes stable draft/export surface (2.2774ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1651.7677

```

### [PASS] Order PDF export text batch (canonical group)

- id: `order-pdf-export-text`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-text`
- status: **passed**
- exit code: `0`
- duration: `1547ms`

#### stdout

```text
✔ createOrderPdfRenderAnnotationLayerPngOp renders first-page PDF annotations to PNG bytes (1.7006ms)
✔ listOrderPdfSketchStrokes keeps only valid strokes for the requested page (0.1604ms)
✔ paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas (0.2656ms)
✔ paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser (0.1389ms)
✔ compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer (0.3544ms)
✔ paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite (0.5193ms)
✔ export order pdf text ops compose details, bidi, and layout behavior from one canonical seam (2.2442ms)
✔ export order pdf text ops keep canonical draft defaults and bidi stabilization behavior (1.3301ms)
✔ export order pdf text uses wardrobe-type depth fallback only when raw depth is missing (0.3093ms)
✔ export order pdf text includes classic cornice only when the main cornice flag is enabled (0.2216ms)
✔ export order pdf text omits cornice when the main cornice flag is disabled (0.2154ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1456.1007

```

### [PASS] Sketch manual/hover (canonical group)

- id: `sketch-manual-hover`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-manual-hover`
- status: **passed**
- exit code: `0`
- duration: `1440ms`

#### stdout

```text
✔ drawer remove plan resolves exact typed targets and rejects ambiguous or cross-module hits (2.8181ms)
✔ drawer remove plan mutates only the resolved sketch external target (0.6419ms)
✔ drawer remove plan applies sketch internal and standard external mutations without cross-family spillover (0.406ms)
✔ sketch internal removal uses exact IDs regardless of overlap, list order, or cassette slot (0.6851ms)
✔ sketch internal resolver rejects part identities that do not encode the exact module scope (0.2464ms)
✔ sketch external removal never crosses module, box, or list scopes for duplicate IDs (0.2826ms)
✔ ambiguous duplicate records and duplicate box identities are rejected without mutation (0.1523ms)
✔ drawer remove commit owns the structural patch boundary and applies one immutable plan (0.2877ms)
✔ drawer remove commit reports false when the patch is skipped or no target changes (0.3158ms)
✔ manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner (3.0331ms)
✔ manual-layout flow skips auto-filled shelves colliding with sketch drawers and warns once (2.2811ms)
✔ manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata (0.6814ms)
✔ manual-layout sketch hover match state accepts a recent matching hover snapshot (1.805ms)
✔ manual-layout sketch hover match state rejects stale or mismatched hover snapshots (0.385ms)
✔ manual-layout sketch hover match state rejects records that still carry retired host identity fields (0.3125ms)
✔ manual-layout hover intent readers decode canonical versioned commands (2.5155ms)
✔ manual-layout hover intent readers reject malformed and non-exact command payloads (0.378ms)
✔ manual-layout command decoder rejects missing, unknown, and extra fields for every mutation family (0.8606ms)
✔ manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides (3.9784ms)
✔ manual-layout hover module context falls back to the corner root config when no cell config exists (1.6ms)
✔ manual-layout hover base context rejects missing or invalid module bounds (0.7033ms)
✔ manual-layout hover base context preserves storage clamp pad and hit-Y bounds (1.1713ms)
✔ manual-layout hover base context preserves box defaults, clamps, and positive overrides (0.5805ms)
✔ manual-layout hover base context preserves shelf parsing and centimeter conversion (0.3982ms)
✔ manual-layout hover base context preserves storage defaults, minimum, span cap, and center clamp (0.4573ms)
✔ manual-layout module box preview routes shelf hover through the focused box owner (6.5777ms)
✔ manual-layout module stack preview routes ext drawers through the focused stack owner (4.9908ms)
✔ manual-layout shared remove eps exports retain number shape and focused-owner values (0.2312ms)
✔ manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools (6.6909ms)
✔ manual-layout sketch hover targets free-box content before a module selector behind it (3.1946ms)
✔ manual-layout sketch hover falls back to standalone free placement when no selector is hit (0.961ms)
✔ manual-layout sketch external drawer hover marks standard external drawers for removal only (0.8631ms)
✔ manual-layout sketch internal drawer hover ignores standard external drawers (0.3525ms)
✔ manual-layout free-box external drawer hover prefers the drawer stack over a nearby shelf removal (3.4284ms)
✔ module surface hover writes shelf add intent so click follows the hover preview (3.487ms)
✔ module surface hover writes rod add intent so stale shelf-remove hover cannot steal the click (0.6729ms)
✔ module preview flow probes existing shelf removal before drawer stack add previews (0.6737ms)
✔ existing vertical remove helper is a no-op when nothing removable is under the cursor (0.3853ms)
✔ door action hover state resolves the nearest door leaf owner with metrics (0.4357ms)
✔ manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors (2.2401ms)
✔ manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool (2.5499ms)
✔ manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout (0.5072ms)
✔ recent sketch hover matching honors tool, age, free-placement, and host identity together (2.8605ms)
✔ recent sketch hover matching rejects retired or malformed host identity records (0.4551ms)
✔ manual tool access prefers canonical mode-state value before runtime tools fallback (1.5719ms)
✔ manual tool access falls back to runtime tools when mode-state tool is absent (0.3713ms)
✔ sketch-free host falls back to internal grid maps before the zero-door hinged default host (2.7291ms)
✔ sketch-free host uses the hinged zero-door fallback only when no config or grid host exists (0.3633ms)
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1346.268

```

### [PASS] Sketch box/hover (canonical group)

- id: `sketch-box-hover`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-box-hover`
- status: **passed**
- exit code: `0`
- duration: `1150ms`

#### stdout

```text
✔ sketch-box door preview stays inert for hinge toggles when the active segment has no door (2.0353ms)
✔ sketch-box door preview resolves canonical remove metadata for an existing double-door pair (20.4311ms)
✔ sketch-box door preview keeps explicit hinge/remove metadata for a single existing door (0.6159ms)
✔ sketch-box door preview preserves material fallback and edge-extension boundaries (1.4964ms)
✔ sketch-box door preview preserves focused depth, back-clearance, remove-offset, and command payloads (0.7981ms)
✔ sketch-box doors upsert single-door records through the canonical id factory and segment placement seam (2.4717ms)
✔ sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair (16.6157ms)
✔ sketch-box doors remove a focused segment door without disturbing the other segment (0.5651ms)
✔ sketch-box doors treat rows inside the same divided column as independent cells (1.9521ms)
✔ sketch-box doors preserve stored groove line counts when rewriting door records (1.2228ms)
✔ resolved module boxes ignore free-placement items and the requested ignoreBoxId (1.7348ms)
✔ resolved module boxes reject string-encoded live geometry (0.1439ms)
✔ vertical center clamp respects module bounds even when desired center is far outside range (0.1489ms)
✔ placement resolution can ignore the edited box id instead of blocking on itself (0.4064ms)
✔ placement reports blocked when overlap chain reaches the module ceiling and floor (0.7897ms)
✔ overlap primitive still allows exact edge contact without treating it as overlap (0.1115ms)
✔ placement resolution can be confined to the pointer slot instead of jumping across blockers (0.4063ms)
✔ placement resolution reports blocked when vertical content blockers leave no valid box slot (0.2972ms)
✔ sketch-box runtime parses width/depth overrides and rejects unrelated tools (1.643ms)
✔ sketch-box runtime geometry center-snaps and width-clamps inside the module span (0.4216ms)
✔ sketch-box runtime geometry preserves shell minimums, center snap boundaries, and finite fallbacks (0.2761ms)
✔ free-box geometry preserves fallback clamping without capping explicit dimensions (0.2892ms)
✔ sketch-box runtime geometry rejects string-encoded live overrides (0.1668ms)
✔ sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match (0.3733ms)
✔ sketch-box runtime hit scan rejects string-encoded live box geometry (0.1147ms)
✔ sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized (0.7385ms)
✔ sketch-box free-placement commit does not derive floorY from string measurements (0.3097ms)
✔ sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column (0.7354ms)
✔ sketch-box free-placement commit clears hover when the canonical commit finishes without next hover (0.2559ms)
✔ sketch-box free-placement commit stays inert when no canonical host is available (0.1469ms)
✔ sketch-box door visuals forward mirror state, mirror layout, effective frame style, and deep pick meta through the special visual path (5.0068ms)
✔ sketch-box door visuals use styled profile visuals for in-cabinet whole box doors (0.6873ms)
✔ free-box click uses canonical units and Shell Geometry minimums without changing numeric behavior (2.6899ms)
✔ free-box click preserves missing and invalid optional-dimension handling (0.5335ms)
✔ Interior-tab Sketch Box defaults remain plain integer centimeters with stable tool parsing (0.7292ms)
✔ free-box click fallback does not turn a module hit into a free-placement box (1.9435ms)
✔ free-box click fallback still creates a free-placement box when no module was hit (0.334ms)
✔ free-box click fallback rejects string-encoded plane-hit geometry (0.1881ms)
✔ free-box click preserves a real recent free-placement hover even when a module is behind it (0.3622ms)
✔ sketch external drawers hover context loads persisted module stacks for remove/overlap handling (7.0044ms)
✔ free-box content click stays on the free box even when a wardrobe module is behind it (0.8187ms)
✔ free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks (2.8456ms)
✔ module sketch hover blocks collisions between internal and external drawer stacks (0.4777ms)
✔ free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind (0.7576ms)
✔ module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit (0.7625ms)
✔ module sketch external drawers preview reads the selector front envelope instead of the inner cavity only (0.4933ms)
ℹ tests 46
ℹ suites 0
ℹ pass 46
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1058.3872

```

### [PASS] Sketch free-boxes (canonical group)

- id: `sketch-free-boxes`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-free-boxes`
- status: **passed**
- exit code: `0`
- duration: `1259ms`

#### stdout

```text
✔ manual-layout free-box shelf grid scopes five shelves to the active split cell (2.5702ms)
✔ manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short (0.2301ms)
✔ manual-layout free-box shelf grid commit writes shelves into the no-main free box (3.1638ms)
✔ manual-layout free-box shelf grid blocked commit consumes click without mutating (0.7495ms)
✔ manual-layout free-box shelf grid rejects partial hover records without mutating content (0.2871ms)
✔ manual-layout free-box shelf grid blocks shelves that would collide with an existing rod (0.4599ms)
✔ manual-layout free-box rod hover can target an existing shelf for removal (1.2136ms)
✔ manual-layout free-box shelf edit can target an existing rod or storage barrier for removal (0.728ms)
✔ manual-layout free-box commits cross-kind removal hovers from shelf and rod tools (1.5781ms)
✔ manual-layout free-box storage removal hover covers the whole existing barrier height (0.6031ms)
✔ manual-layout shelf-grid defaults and span boundary come from focused owners (0.5556ms)
✔ manual-layout preset defaults preserve focused grid, rod, storage and material geometry (0.7029ms)
✔ manual-layout brace plan keeps exact tolerance, nearest identity, cell filter and variant depth (0.5641ms)
✔ manual-layout content hover preserves default thickness, storage height and preview order (2.6822ms)
✔ manual-layout shelf-grid add remains a layout preview with canonical hide/set order (1.7239ms)
✔ brace hover preserves brace clearance and regular minimum-width branches (0.8045ms)
✔ manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it (0.6491ms)
✔ preset layout free-box plan maps storage shortcut into active split cell contents (0.3354ms)
✔ preset layout shortcut hover and click target the free box instead of the wardrobe behind it (1.7508ms)
✔ brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe (0.768ms)
✔ sketch-free box content preview short-circuits unsupported content kinds before target scanning (0.9697ms)
✔ sketch-free box content preview keeps door-hinge hover inert when the active segment has no door (1.7817ms)
✔ sketch-free box content preview returns canonical double-door removal metadata for an existing pair (9.655ms)
✔ sketch-free external drawer preview blocks construction on existing free-box shelf content (3.8301ms)
✔ sketch-free vertical preview keeps removal hover available while the active tool is sketch external drawers (1.7209ms)
✔ sketch-free shelf removal accepts direct shelf-board hits with the same generous tolerance as wardrobe shelves (0.5508ms)
✔ sketch-free placement hover record keeps canonical host/free-placement fields (1.7298ms)
✔ sketch-free placement commit adds a free-placement box through the canonical modules patch seam (1.9221ms)
✔ sketch-free placement commit rejects string-encoded internal hover geometry (0.3142ms)
✔ sketch-free placement remove fails closed when its target id is missing (0.3027ms)
✔ sketch-free placement content commit routes free-placement door removal through the canonical content seam (3.654ms)
✔ sketch-free placement content commit consumes blocked no-room hovers without mutating (1.2711ms)
✔ sketch-free placement ext-drawer removal also removes regular external drawers in the same free box (0.739ms)
✔ sketch-free vertical tools commit cross-kind vertical-content removal hovers (1.3986ms)
✔ sketch-free stack tools commit existing vertical-content removal hovers before adding drawers (0.5996ms)
✔ sketch-free drawer commit consumes a room-column collision without mutating the free box (3.4144ms)
✔ sketch-free regular external drawers can add a shoe drawer without falling back to module drawers (2.8019ms)
✔ sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top (1.7427ms)
✔ sketch-free regular external drawers update shoe and regular count independently in the same cell (0.9112ms)
✔ sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks (2.0799ms)
✔ sketch free surface target scan follows nearest ray intersection instead of free-box array order (0.5257ms)
✔ sketch free divider target scan projects fallback pointer to the box front plane (0.4136ms)
✔ side-wall free-box content target keeps the remapped rotated hit instead of projecting to a wardrobe Z plane (0.4259ms)
✔ sketch free surface target scan rejects string-encoded free-box geometry (0.2772ms)
✔ sketch free content target scan projects profile-door hits to the canonical box front plane (0.3323ms)
✔ sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry (1.8251ms)
✔ sketch free base adornment preview rejects string-encoded current base dimensions (2.2218ms)
✔ sketch free cornice adornment keeps toggle, fallback, focused geome
...
[trimmed 4032 chars]
```

### [PASS] Sketch render/visuals (canonical group)

- id: `sketch-render-visuals`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-render-visuals`
- status: **passed**
- exit code: `0`
- duration: `950ms`

#### stdout

```text
✔ render sketch box fronts reuses one mirror material across mirrored external drawers (6.1848ms)
✔ render sketch box fronts reject string-encoded live external drawer positions (0.2454ms)
✔ render sketch box fronts do not parse string-encoded live external drawer counts (0.504ms)
✔ render sketch box external drawers flush a top-anchored free-box stack to the box face edge (0.6673ms)
✔ interior sketch style, feature flags, and divider state read only canonical input fields (2.2327ms)
✔ interior sketch input contract fails fast when the config snapshot is missing (0.729ms)
✔ renderSketchFreeBoxDimensions keeps height on the right and depth on the left (1.7805ms)
✔ renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions (0.2693ms)
✔ renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries (3.5803ms)
✔ renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths (1.8145ms)
✔ renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label (0.5692ms)
✔ dimension grouping applies focused X/Y adjacency and span-merge tolerance boundaries (0.7036ms)
✔ grouped dimension rendering preserves call order, focused text scale and negative min-height label shift (0.3812ms)
✔ render interior sketch layout geometry clamps box size and center inside the internal span (1.0499ms)
✔ render sketch box shell height preserves defaults, minimums, and regular/free caps (0.1798ms)
✔ render sketch box shell placement keeps min, ratio, and max clamp pads (0.7212ms)
✔ render sketch box shell geometry rejects string-encoded live box dimensions (0.1489ms)
✔ render interior sketch layout geometry rejects string-encoded live numeric overrides (0.1563ms)
✔ render interior sketch layout geometry rejects string-encoded runtime placement args (0.173ms)
✔ render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry (0.1304ms)
✔ render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks (0.99ms)
✔ render interior sketch layout resolves content segments from divider-separated spans (0.9747ms)
✔ render interior sketch support clamps placement, emits shelf pins, and keeps brace side seams disabled (2.1934ms)
✔ render interior sketch shelf pins omit only supports that collide with the room column liner cut (0.7519ms)
✔ render interior sketch support locator resolves the matching box by center span (0.6651ms)
✔ render interior sketch shelves emit folded contents with measured shelf clearance (0.7284ms)
✔ render interior sketch support rejects string-encoded shelf and storage geometry (0.4975ms)
✔ removed frame side sketch shelves preserve glass and double variants on forced brace geometry (0.3383ms)
✔ render interior sketch module shelves keep brace shelves on the brace material path (2.8094ms)
✔ render interior sketch rods use the installed rod owner when it succeeds and local visual rod when it rejects (0.6241ms)
✔ render interior sketch rods report per-item failures and continue rendering later rods (0.2208ms)
✔ render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts (3.7852ms)
✔ render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists (0.4407ms)
✔ render interior sketch visuals expose callable factories only for function inputs (0.3124ms)
✔ sketch front visual state reuses canonical full-door mirror/glass maps for split door segments (3.6112ms)
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 859.046

```

### [PASS] Cloud sync lifecycle (canonical group)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-lifecycle`
- status: **passed**
- exit code: `0`
- duration: `5826ms`

#### stderr

```text
[serial-tests batch 1/6] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/6] ready
[serial-tests batch 1/6] ok (272ms)
[serial-tests batch 2/6] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/6] ready
[serial-tests batch 2/6] ok (1.8s)
[serial-tests batch 3/6] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/6] ready
[serial-tests batch 3/6] ok (536ms)
[serial-tests batch 4/6] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_realtime_runtime.test.ts)
[serial-tests batch 4/6] ready
[serial-tests batch 4/6] ok (650ms)
[serial-tests batch 5/6] 3 files (tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 5/6] ready
[serial-tests batch 5/6] ok (1.9s)
[serial-tests batch 6/6] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 6/6] ready
[serial-tests batch 6/6] ok (518ms)
[serial-tests] completed 16 files in 5.7s across 6 batches

```

#### stdout

```text
✔ cloud sync access reads canonical services panelApi and ignores legacy root alias (1.0761ms)
✔ cloud sync access ensures canonical service state on services root (0.3647ms)
✔ cloud sync access exposes test hooks through canonical service state only (0.2685ms)
✔ cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required (1.6878ms)
✔ cloud sync feedback prefers preserved error messages when available (0.1741ms)
✔ cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller (56.071ms)
✔ cloud sync panel actions fall back to derived status when panel snapshot api is unavailable (3.2404ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 225.3903
✔ cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping (2.0983ms)
✔ cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly (1.1468ms)
✔ cloud sync install support preserves backward compatibility for untagged published dispose refs (0.7963ms)
✔ cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose (1.0687ms)
✔ cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch (0.3107ms)
✔ cloud sync install support clears only canonical published slots and preserves unrelated state (0.8006ms)
✔ cloud sync install support can preserve deactivated stable surfaces across an owner replacement (0.3242ms)
✔ cloud sync install support preserves canonical test hooks by default while clearing published slots (0.1717ms)
✔ cloud sync install support drops test hooks when cleanup opts out of hook preservation (0.1609ms)
✔ cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/subscriptions (16.2569ms)
✔ cloud_sync lifecycle: no timer/listener leaks after dispose (1.8283ms)
✔ cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle (2.6893ms)
✔ cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose (2.3597ms)
✔ cloud_sync lifecycle: dispose clears published public state but preserves test hooks (1.3489ms)
✔ cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes (1.3394ms)
✔ cloud_sync lifecycle: stale held dispose refs do not clear newer public state (2.9104ms)
✔ cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap (1.9253ms)
✔ cloud_sync lifecycle: failed reinstall clears stale public state when config disappears (0.9461ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1769.0953
✔ owned cloud-sync family flight registers immediately for synchronous re-entry reuse (1.3633ms)
✔ owned cloud-sync family flight returns busy for synchronous conflicting re-entry (0.7959ms)
✔ runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work (0.2553ms)
✔ readCfg normalizes deps config and clamps site2 sketch max age (1.3809ms)
✔ cloud sync config browser helpers keep URL params and site2 detection canonical (0.8402ms)
✔ cloud sync config shared helpers keep gateway URL and headers canonical (0.1595ms)
✔ cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint (4.4816ms)
✔ cloud sync delete temp preserves a concurrent local mutation and queues push reconciliation (0.8002ms)
✔ cloud sync delete temp records a failed preflight attempt without stamping pull success (0.5268ms)
✔ cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors (0.4371ms)
✔ cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work (0.8449ms)
✔ cloud sync delete-temp tracks preflight pull activity and settled push activity canonically (0.8625ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 490.5068
✔ cloud sync attention pulls still fire on focus when eligible (2.336ms)
✔ cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown (0.3734ms)
✔ cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return (0.4353ms)
✔ cloud sync attention online pull does not stay blocked by subscribed status without a live channel (0.2887ms)
✔ cloud sync attention online handler reports pull failures without breaking later attention events (0.6481ms)
✔ cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes (0.3291ms)
✔ cloud sync attention pulls stay inert after the lifecycle guard flips stale before clean
...
[trimmed 3422 chars]
```

### [PASS] Cloud sync main-row (canonical group)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-main-row`
- status: **passed**
- exit code: `0`
- duration: `4058ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ready
[serial-tests batch 1/3] ok (469ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_mutation_commands_runtime.test.ts … tests/cloud_sync_owner_context_runtime.test.ts)
[serial-tests batch 2/3] ready
[serial-tests batch 2/3] ok (1.6s)
[serial-tests batch 3/3] 2 files (tests/cloud_sync_room_transition_runtime.test.ts … tests/cloud_sync_status_install_runtime.test.ts)
[serial-tests batch 3/3] ready
[serial-tests batch 3/3] ok (1.9s)
[serial-tests] completed 8 files in 3.9s across 3 batches

```

#### stdout

```text
✔ cloud sync main row skips remote apply churn when newer rows carry the same payload (3.4187ms)
✔ cloud sync main row still applies remote payloads when the effective collections actually change (1.9743ms)
✔ cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged (0.3983ms)
✔ cloud sync main row seeds a missing row from local collections on the initial pull (4.5175ms)
✔ cloud sync main row never seeds local collections after a failed initial read (0.3847ms)
✔ cloud sync main row never seeds a retention-deleted room (0.2958ms)
✔ cloud sync main row preserves a local mutation made while a normal pull is in flight (2.0288ms)
✔ cloud sync main row initial seed reuses returned representation when the upsert already returns the row (0.6989ms)
✔ cloud sync main row push publishes changed collections once and skips identical repeats (2.0612ms)
✔ cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch (0.6823ms)
✔ cloud sync main row reuses the same pending push promise for duplicate direct pushes (0.8992ms)
✔ cloud sync main row pull applies newer remote payloads into local storage (1.1529ms)
✔ cloud sync main row use-remote resolution adopts the verified row before reporting success (0.6647ms)
✔ cloud sync main row keep-local resolution adopts the server-confirmed row before reporting success (0.568ms)
✔ cloud sync main row first remote pull hydrates app maps even when stored hash already matches remote (0.7395ms)
✔ cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull (0.9262ms)
✔ cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push (0.6266ms)
✔ cloud sync main row push applies settled remote payload locally without forcing a follow-up pull (0.8146ms)
✔ cloud sync main row push settlement preserves a newer local revision and requeues that local state (0.7917ms)
✔ cloud sync main row collapses pull retries during a push into one post-push follow-up pull (0.9173ms)
✔ cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests (0.6907ms)
✔ cloud sync main row notifies push-settled listeners only after the push flight has cleared (0.6619ms)
✔ cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests (0.5482ms)
✔ cloud sync main row shares app-scoped push ownership across main-row instances for the same App (0.5659ms)
✔ cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run (0.1954ms)
✔ cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up (0.8891ms)
✔ cloud sync main row preserves one follow-up push request raised while a push is already in flight (0.7523ms)
✔ cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first (1.0556ms)
✔ cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce (0.5248ms)
✔ cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull (0.8409ms)
✔ cloud sync main-row pull runs immediately and reports when timer scheduling is unavailable (0.2309ms)
✔ cloud sync main-row pull reports scheduled rejections without leaking an unhandled promise (0.2393ms)
✔ cloud sync main-row pull keeps running when diagnostics or timer cleanup fail (2.2253ms)
✔ cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys (1.0535ms)
✔ cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner (0.256ms)
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 420.9974
✔ cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results (2.1439ms)
✔ cloud sync mutation cleanup commands return cancelled when confirm is declined (0.2702ms)
✔ cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel (0.3406ms)
✔ cloud sync delete-temp commands reuse one pending models cleanup flow per app (2.2816ms)
✔ cloud sync delete-temp commands block conflicting cleanup family actions while one is pending (0.4383ms)
✔ cloud sync owner context composes room helpers and per-tab client identity through dedicated seams (8.4181ms)
✔ cloud sync owner context uses the public room for gate rows when no room URL is selected (0.6528ms)
✔ cloud sync owner context migrates schema-1 private credentials to schema 2 with JWT expiry (1.0283ms)
✔ cloud sync owner context starts disabled realtime with an empty channel surface (0.6949ms)
✔ cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating (0.303ms)
✔ cloud sync owner context memoizes runtime status publishes and kee
...
[trimmed 1825 chars]
```

### [PASS] Cloud sync panel-install (canonical group)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-install`
- status: **passed**
- exit code: `0`
- duration: `1590ms`

#### stdout

```text
✔ cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall (5.3926ms)
✔ cloud sync panel api install heals legacy installed markers that only preserved stale public callables (0.3462ms)
✔ cloud sync panel api install ignores stale publication epochs (0.4415ms)
✔ cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch (0.7007ms)
✔ cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup (0.6952ms)
✔ cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation (0.5333ms)
✔ cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods (0.4068ms)
✔ cloud sync panel api stable surface forwards the expected conflict identity (0.226ms)
✔ cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots (5.8057ms)
✔ cloud sync panel api runtime status clone strips drifted realtime/polling extras (0.4789ms)
✔ cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes (0.325ms)
✔ cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged (0.5049ms)
✔ cloud sync room mode reports a failed owner transition instead of claiming the new room is active (0.5643ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1498.836

```

### [PASS] Cloud sync panel-controller (canonical group)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-controller`
- status: **passed**
- exit code: `0`
- duration: `1575ms`

#### stdout

```text
✔ cloud sync panel api republishes panel snapshot even when floating pin command throws (3.574ms)
✔ cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws (1.1028ms)
✔ cloud sync panel api preserves thrown messages for controller-facing commands (6.8328ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1482.7224

```

### [PASS] Cloud sync panel-subscriptions (canonical group)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-subscriptions`
- status: **passed**
- exit code: `0`
- duration: `1630ms`

#### stdout

```text
✔ cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets (5.0615ms)
✔ cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App (1.1219ms)
✔ cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener (3.5672ms)
✔ cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles (1.5499ms)
✔ cloud sync async family runner blocks re-entrant conflicting targets before the first run settles (1.1066ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1532.3199

```

### [PASS] Cloud sync panel-snapshots (canonical group)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-snapshots`
- status: **passed**
- exit code: `0`
- duration: `1716ms`

#### stdout

```text
✔ cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors (2.7849ms)
✔ cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors (0.6597ms)
✔ cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths (2.6437ms)
✔ cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids deadline timer churn for unchanged snapshots (0.7416ms)
✔ cloud sync panel snapshot controller does not create deadline timer until a tabs-gate subscriber exists (0.3207ms)
✔ cloud sync panel snapshot controller uses timer-driven tabs-gate minute updates when no source subscription exists (2.6728ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1614.0062

```

### [PASS] Cloud sync sync-ops (canonical group)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-sync-ops`
- status: **passed**
- exit code: `0`
- duration: `3823ms`

#### stderr

```text
[serial-tests batch 1/5] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/5] ready
[serial-tests batch 1/5] ok (586ms)
[serial-tests batch 2/5] 3 files (tests/cloud_sync_gateway_runtime.test.ts … tests/cloud_sync_room_scope_runtime.test.ts)
[serial-tests batch 2/5] ready
[serial-tests batch 2/5] ok (541ms)
[serial-tests batch 3/5] 3 files (tests/cloud_sync_owner_gateway_io_runtime.test.ts … tests/cloud_sync_room_commands_runtime.test.ts)
[serial-tests batch 3/5] ready
[serial-tests batch 3/5] ok (1.5s)
[serial-tests batch 4/5] 3 files (tests/cloud_sync_site2_sketch_behavior_runtime.test.ts … tests/cloud_sync_sketch_pull_load_runtime.test.ts)
[serial-tests batch 4/5] ready
[serial-tests batch 4/5] ok (626ms)
[serial-tests batch 5/5] 1 file (tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 5/5] ready
[serial-tests batch 5/5] ok (376ms)
[serial-tests] completed 13 files in 3.7s across 5 batches

```

#### stdout

```text
✔ cloud sync pull coalescer collapses burst triggers into one run and supports cancel (3.4623ms)
✔ cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels (0.3676ms)
✔ cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics (0.3236ms)
✔ cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers (1.3771ms)
✔ cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run (0.4065ms)
✔ cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles (0.3931ms)
✔ cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists (0.3378ms)
✔ cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse (0.3477ms)
✔ cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst (0.2536ms)
✔ cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles (0.4211ms)
✔ cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles (0.4262ms)
✔ cloud sync pull coalescer reports synchronous run failures and recovers for later work (0.3071ms)
✔ cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires (0.1454ms)
✔ cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run (0.2438ms)
✔ cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run (0.2007ms)
✔ cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted (0.1933ms)
✔ cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window (1.5032ms)
✔ cloud sync realtime connecting/failure/dispose markers share one canonical branch owner (0.8726ms)
✔ cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner (0.2917ms)
✔ cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish (0.4453ms)
✔ cloud sync realtime subscribed marker only issues a gap pull after a resubscribe (0.7704ms)
✔ cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe (0.4284ms)
✔ cloud sync realtime beforeunload cleanup removes the current channel through the installed listener (0.3092ms)
✔ cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label (0.2032ms)
✔ cloud sync realtime disconnected marker can publish a preserved error in one canonical transition (0.2655ms)
✔ cloud sync realtime disposed marker clears stale errors from the final disabled snapshot (0.2161ms)
✔ cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains (0.177ms)
✔ cloud sync realtime hint does not send when the subscribed status no longer has a live channel (0.1147ms)
✔ cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values (0.2066ms)
✔ cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets (2.0555ms)
✔ cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets (0.6065ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 539.7063
[WardrobePro][error] Error: offline
    at fetchFn (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_gateway_runtime.test.ts:235:13)
    at postGateway (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_gateway.ts:99:26)
    at getGatewayRow (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_gateway.ts:178:28)
    at TestContext.<anonymous> (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_gateway_runtime.test.ts:230:25)
    at async Test.run (node:internal/test_runner/test:1332:7)
    at async Test.processPendingSubtests (node:internal/test_runner/test:911:7)
✔ cloud sync gateway reads only through a signed room request and normalizes the row contract (1.6454ms)
✔ cloud sync gateway returns null for a missing room without exposing a table query (0.2197ms)
✔ cloud sync gateway writes with an expected revision and parses the committed revision (0.378ms)
✔ cloud sync gateway exposes a stale-write conflict as data for a bounded merge retry (0.3033ms)
✔ cloud sync gateway issues public and private signed credentials without accepting client room ids (0.4949ms)
✔ cloud sync gateway preserves auth expiry, rate-limit, and network failures (4.696ms)
✔ cloud sync gateway renews a private room without allowing a room change (0.48ms)
✔ signed-room SQL removes browser CRUD and requires tenant/store
...
[trimmed 14250 chars]
```

### [PASS] Cloud sync tabs-ui (canonical group)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-tabs-ui`
- status: **passed**
- exit code: `0`
- duration: `2583ms`

#### stdout

```text
✔ floating sketch sync pin command becomes a no-op when state is unchanged (2.7278ms)
✔ floating sketch sync pin command rolls back local state on push failure (0.5175ms)
✔ floating sketch sync pin toggle command flips the current state (0.3729ms)
✔ floating sketch sync pin command preserves push failure message (0.3579ms)
✔ floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets (0.4791ms)
✔ cloud sync tabs gate command skips redundant refreshes but extends stale opens (2.1861ms)
✔ cloud sync tabs gate command rolls back on push failure and reports final state (0.7931ms)
✔ cloud sync tabs gate toggle command flips the current ref state (0.3235ms)
✔ cloud sync tabs gate command preserves push failure message (0.4006ms)
✔ cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets (0.425ms)
[WardrobePro][error] Error: [WardrobePro] Missing canonical action (soft UI write access): expected actions.ui.patchSoft
    at requireActionFn (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\runtime\actions_access_core.ts:122:9)
    at patchUiSoft (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\runtime\ui_write_access.ts:125:10)
    at applyCloudSyncUiPatch (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_support_feedback.ts:63:3)
    at Object.patchSite2TabsGateUi (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_tabs_gate_local_runtime_patch.ts:55:7)
    at TestContext.<anonymous> (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_tabs_gate_runtime.test.ts:92:7)
    at Test.runInAsyncScope (node:async_hooks:227:14)
    at Test.run (node:internal/test_runner/test:1325:25)
    at Test.start (node:internal/test_runner/test:1191:17)
    at startSubtestAfterBootstrap (node:internal/test_runner/harness:385:17)
✔ cloud sync tabs gate closes stale site2 UI on initial pull miss (7.2643ms)
✔ cloud sync tabs gate uses the current gate base room for push and pull (1.0311ms)
✔ cloud sync tabs gate defaults to the public room when no room URL is selected (0.6221ms)
✔ cloud sync tabs gate public-room push is visible to site2 public-room pull (1.8573ms)
✔ cloud sync tabs gate site2 ignores local open fallback when cloud row is missing (0.5413ms)
✔ cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling (1.9307ms)
✔ cloud sync tabs gate direct push reports controller-only canonically on site2 (0.3547ms)
✔ cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App (0.7661ms)
✔ cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state (4.0665ms)
✔ [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam (2253.2332ms)
✔ [cloud-sync-ui-controller] conflict resolution uses the canonical command and reporter (0.9105ms)
✔ [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations (1.887ms)
✔ [cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads (1.2621ms)
✔ [cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation (0.807ms)
ℹ tests 24
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2490.1875

```

### [PASS] Playwright browser preflight

- id: `e2e-preflight`
- category: `e2e`
- command: `npm run e2e:smoke:preflight`
- status: **passed**
- exit code: `0`
- duration: `1183ms`

#### stdout

```text

> e2e:smoke:preflight
> node tools/wp_playwright_preflight.js

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

```

### [PASS] Playwright smoke suite listing

- id: `e2e-list`
- category: `e2e`
- command: `npm run e2e:smoke:list`
- status: **passed**
- exit code: `0`
- duration: `845ms`

#### stdout

```text

> e2e:smoke:list
> playwright test -c playwright.config.ts --list

Listing tests:
  [setup] › app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers
  [chromium] › authoring_builds.spec.ts:485:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical
  [chromium] › authoring_builds.spec.ts:552:3 › Playwright authoring build coverage › manual groove controls keep independent dimensions and explicit orientation
  [chromium] › authoring_builds.spec.ts:614:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:677:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:734:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:789:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:844:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable
  [chromium] › authoring_builds.spec.ts:883:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:949:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated
  [chromium] › canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical
  [chromium] › cloud_sync_conflict_resolution.spec.ts:48:3 › Cloud Sync conflict resolution contention › two browser contexts resolve the same remote entity conflict without a blind overwrite
  [chromium] › cloud_sync_reconnect.spec.ts:31:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable
  [chromium] › cloud_sync_reconnect.spec.ts:57:3 › Cloud Sync browser reconnect smoke › switching from public to a newly created private room replaces the active owner without reload
  [chromium] › html_sanitize_security.spec.ts:4:3 › HTML sanitizer browser security › sanitizes descendants moved out of disallowed wrappers and drops foreign namespaces
  [chromium] › resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry
  [chromium] › resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state
  [chromium] › resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry
  [chromium] › smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable @critical
  [chromium] › smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name @critical
  [chromium] › smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly
  [chromium] › smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar @critical
  [chromium] › smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive
  [chromium] › user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics
  [chromium] › user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state
  [chromium] › user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip
  [chromium] › user_paths.spec.ts:274:3 › Playwright real user paths › cabinet authoring options survive project roundtrip
  [chromium] › user_paths.spec.ts:324:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout maps
  [chromium] › user_paths.spec.ts:366:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout scenario matrix
  [chromium] › user_paths.spec.ts:413:3 › Playwright real user paths › settings backup import and restore-last-session recover real user state
  [matrix] › critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-desktop › shell, authoring and deterministic scene geometry stay valid @critical @matrix
  [matrix] › critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-portrait › shell, authoring and deterministic scene geometry s
...
[trimmed 516 chars]
```

### [PASS] Playwright smoke run

- id: `e2e-smoke-run`
- category: `e2e`
- command: `npm run e2e:smoke`
- status: **passed**
- exit code: `0`
- duration: `150479ms`

#### stderr

```text
[WebServer] (node:22048) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:24856) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:25868) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24632) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24988) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:19692) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:24820) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)

```

#### stdout

```text

> e2e:smoke
> node tools/wp_playwright_preflight.js && playwright test -c playwright.config.ts

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

Running 35 tests using 4 workers

  ok  1 [setup] › tests\e2e\app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers (10.1s)
  ok  2 [chromium] › tests\e2e\canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical (12.8s)
  ok  5 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:31:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable (12.9s)
  ok  6 [chromium] › tests\e2e\html_sanitize_security.spec.ts:4:3 › HTML sanitizer browser security › sanitizes descendants moved out of disallowed wrappers and drops foreign namespaces (2.1s)
  ok  3 [chromium] › tests\e2e\authoring_builds.spec.ts:485:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical (20.5s)
  ok  7 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:57:3 › Cloud Sync browser reconnect smoke › switching from public to a newly created private room replaces the active owner without reload (10.0s)
  ok  4 [chromium] › tests\e2e\cloud_sync_conflict_resolution.spec.ts:48:3 › Cloud Sync conflict resolution contention › two browser contexts resolve the same remote entity conflict without a blind overwrite (26.3s)
  ok  8 [chromium] › tests\e2e\resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry (12.0s)
  ok  9 [chromium] › tests\e2e\authoring_builds.spec.ts:552:3 › Playwright authoring build coverage › manual groove controls keep independent dimensions and explicit orientation (10.7s)
  ok 10 [chromium] › tests\e2e\smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable @critical (13.5s)
  ok 12 [chromium] › tests\e2e\resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state (10.0s)
  ok 11 [chromium] › tests\e2e\user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics (18.3s)
  ok 14 [chromium] › tests\e2e\smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name @critical (9.3s)
  ok 15 [chromium] › tests\e2e\resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry (13.3s)
  ok 13 [chromium] › tests\e2e\authoring_builds.spec.ts:614:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load (20.5s)
  ok 17 [chromium] › tests\e2e\smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly (8.4s)
  ok 16 [chromium] › tests\e2e\user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state (17.7s)
  ok 19 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-desktop › shell, authoring and deterministic scene geometry stay valid @critical @matrix (11.1s)
  ok 20 [chromium] › tests\e2e\smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar @critical (11.8s)
  ok 18 [chromium] › tests\e2e\authoring_builds.spec.ts:677:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load (14.8s)
  ok 22 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-portrait › shell, authoring and deterministic scene geometry stay valid @critical @matrix (11.5s)
  ok 23 [chromium] › tests\e2e\smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive (10.1s)
  ok 24 [chromium] › tests\e2e\authoring_builds.spec.ts:734:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load (12.5s)
  ok 21 [chromium] › tests\e2e\user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip (17.9s)
  ok 25 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-landscape › shell, authoring and deterministic scene geometry stay valid @critical @matrix (8.1s)
  ok 26 [chromium] › tests\e2e\authoring_builds.spec.ts:789:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load (10.1s)
  ok 28 [matrix] › tests\e2e\criti
...
[trimmed 1522 chars]
```

### [PASS] Browser dev regression performance evidence

- id: `browser-perf`
- category: `perf`
- command: `npm run perf:browser`
- status: **passed**
- exit code: `0`
- duration: `108260ms`

#### stdout

```text

> perf:browser
> node tools/wp_browser_perf_smoke.mjs --target dev --enforce


> start:e2e
> vite --configLoader native --host 127.0.0.1 --port 5175 --strictPort


  VITE v8.2.1  ready in 234 ms

  ➜  Local:   http://127.0.0.1:5175/

```

### [PASS] Browser release UX performance evidence

- id: `browser-perf-release`
- category: `perf`
- command: `npm run perf:browser:release`
- status: **passed**
- exit code: `0`
- duration: `204495ms`

#### stderr

```text
[browser-perf][candidate] project.restoreLastSession UX p95 exceeded budget (564ms > 527ms)
[browser-perf][candidate] project.restoreLastSession code-execution p95 exceeded budget (564ms > 512ms)
[browser-perf][candidate] project.restoreLastSession runtime recovery debt exceeded budget (565ms > 513ms)
[browser-perf][candidate] project.restoreLastSession runtime recovery hangover p95 delta exceeded budget (189ms > 76ms)
[browser-perf][candidate] project.restoreLastSession runtime recovery hangover max delta exceeded budget (189ms > 76ms)
[browser-perf] quantitative regression candidate; running one clean confirmation

```

#### stdout

```text

> perf:browser:release
> node tools/wp_browser_perf_smoke.mjs --target release --enforce


> build:browser-perf-release
> node tools/wp_release.js --build-mode perf --out .artifacts/browser-perf/release-site

[WP Release] Bundle sourcemap missing (needed for dist debug). Re-running debug bundle...
[WP Bundle] Reusing dist modules (dist/esm entry and TypeScript build info are fresh).
[WP Bundle] Building ESM bundle (perf)...
[WP Bundle] Done: dist\wardrobepro.bundle.js
[WP Release] Building Three vendor bundle for dist debug site...
[WP Three Vendor] Building vendor bundle...
[WP Three Vendor] Done: dist\libs\three.vendor.js
[WP Release] Dist debug site ready: C:\Users\יעקב\Downloads\pro\latestzip\dist
[WP Release] Building release app bundle (native minify: Oxc)...
[WP Bundle] Reusing dist modules (dist/esm entry and TypeScript build info are fresh).
[WP Bundle] Building ESM bundle (perf)...
[WP Bundle] Done: .artifacts\browser-perf\release-site\wardrobepro.bundle.js
[WP Release] Release bundle after native build: 121 B (C:\Users\יעקב\Downloads\pro\latestzip\.artifacts\browser-perf\release-site\wardrobepro.bundle.js)
[WP Release] Release bundle final: 121 B (C:\Users\יעקב\Downloads\pro\latestzip\.artifacts\browser-perf\release-site\wardrobepro.bundle.js)
[WP Release] Building Three vendor bundle (tree-shaken)...
[WP Three Vendor] Building vendor bundle...
[WP Three Vendor] Done: .artifacts\browser-perf\release-site\libs\three.vendor.js
[WP Release] Done. Release folder ready at (perf): C:\Users\יעקב\Downloads\pro\latestzip\.artifacts\browser-perf\release-site

> start:browser-perf-release
> node tools/serve.js --root .artifacts/browser-perf/release-site --port 5176

WardrobePro server running at http://localhost:5176/
Serving: .artifacts/browser-perf/release-site

> build:browser-perf-release
> node tools/wp_release.js --build-mode perf --out .artifacts/browser-perf/release-site

[WP Release] Bundle sourcemap missing (needed for dist debug). Re-running debug bundle...
[WP Bundle] Reusing dist modules (dist/esm entry and TypeScript build info are fresh).
[WP Bundle] Building ESM bundle (perf)...
[WP Bundle] Done: dist\wardrobepro.bundle.js
[WP Release] Building Three vendor bundle for dist debug site...
[WP Three Vendor] Building vendor bundle...
[WP Three Vendor] Done: dist\libs\three.vendor.js
[WP Release] Dist debug site ready: C:\Users\יעקב\Downloads\pro\latestzip\dist
[WP Release] Building release app bundle (native minify: Oxc)...
[WP Bundle] Reusing dist modules (dist/esm entry and TypeScript build info are fresh).
[WP Bundle] Building ESM bundle (perf)...
[WP Bundle] Done: .artifacts\browser-perf\release-site\wardrobepro.bundle.js
[WP Release] Release bundle after native build: 121 B (C:\Users\יעקב\Downloads\pro\latestzip\.artifacts\browser-perf\release-site\wardrobepro.bundle.js)
[WP Release] Release bundle final: 121 B (C:\Users\יעקב\Downloads\pro\latestzip\.artifacts\browser-perf\release-site\wardrobepro.bundle.js)
[WP Release] Building Three vendor bundle (tree-shaken)...
[WP Three Vendor] Building vendor bundle...
[WP Three Vendor] Done: .artifacts\browser-perf\release-site\libs\three.vendor.js
[WP Release] Done. Release folder ready at (perf): C:\Users\יעקב\Downloads\pro\latestzip\.artifacts\browser-perf\release-site

> start:browser-perf-release
> node tools/serve.js --root .artifacts/browser-perf/release-site --port 5176

WardrobePro server running at http://localhost:5176/
Serving: .artifacts/browser-perf/release-site
[browser-perf] regression candidate was not reproduced by the confirmation run

```
