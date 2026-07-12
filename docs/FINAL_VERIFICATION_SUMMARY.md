# Final Verification Summary

- schema_version: `1`
- run_id: `48c4561c-b841-45ce-80f4-f3670d91c84c`
- generated_at: 2026-07-12T17:06:06.583Z
- workspace: `C:\Users\יעקב\Downloads\pro\latestzip`
- source_digest: `sha256:c80b99dd105bf275415d05294876e82f8e0efc4adc8600353d495fd7f8729c6c`
- source_files: **4196**
- lane_catalog_digest: `sha256:3ae34cd21b7c52e0bae681a5d3c63fccfa7f6369c3e0c7ef3c94a36c331dc0de`
- node: `v24.18.0`
- final_status: **passed**
- requested lanes: **27**
- completed selection: **yes**
- total results: **27**
- passed: **27**
- environment-blocked: **0**
- runner-blocked: **0**
- failed: **0**
- selected profiles: `default`
- selected categories: `(all)`
- selected lanes: `(all)`
- skipped lanes: `(none)`
- resumed from: `(start)`
- requested lane ids: `verification-control-plane, toolchain-surfaces, build-dist, perf-smoke, overlay-export-core, order-pdf-overlay-core, order-pdf-pdf-render, order-pdf-sketch, order-pdf-export-overlay, order-pdf-export-builders, order-pdf-export-capture, order-pdf-export-text, sketch-manual-hover, sketch-box-hover, sketch-free-boxes, sketch-render-visuals, cloud-sync-lifecycle, cloud-sync-main-row, cloud-sync-panel-install, cloud-sync-panel-controller, cloud-sync-panel-subscriptions, cloud-sync-panel-snapshots, cloud-sync-sync-ops, cloud-sync-tabs-ui, e2e-list, e2e-preflight, e2e-smoke-run`
- completed lane ids: `verification-control-plane, toolchain-surfaces, build-dist, perf-smoke, overlay-export-core, order-pdf-overlay-core, order-pdf-pdf-render, order-pdf-sketch, order-pdf-export-overlay, order-pdf-export-builders, order-pdf-export-capture, order-pdf-export-text, sketch-manual-hover, sketch-box-hover, sketch-free-boxes, sketch-render-visuals, cloud-sync-lifecycle, cloud-sync-main-row, cloud-sync-panel-install, cloud-sync-panel-controller, cloud-sync-panel-subscriptions, cloud-sync-panel-snapshots, cloud-sync-sync-ops, cloud-sync-tabs-ui, e2e-list, e2e-preflight, e2e-smoke-run`
- state file: `(none)`

## Interpretation

All selected closeout lanes passed. This report is valid for the explicit selection recorded above.

No environment blockers were detected in this closeout run.

No runner blockers were detected in this closeout run.

## Lane results

### [PASS] Verification control-plane contracts

- id: `verification-control-plane`
- category: `toolchain`
- command: `npm run test:verification-control-plane`
- status: **passed**
- exit code: `0`
- duration: `2859ms`

#### stdout

```text

> test:verification-control-plane
> node tools/wp_test_group.mjs verification-control-plane

✔ generated report catalog owns every checked-in audit pair (2.8528ms)
✔ generated report selection rejects unknown ids and preserves catalog order (0.621ms)
✔ generated report comparison ignores timestamps but catches semantic drift (11.65ms)
✔ source identity is deterministic and changes when owned source changes (180.8555ms)
✔ lane catalog identity covers lane execution and profile membership (1.1969ms)
✔ verification payload binds results to source lane catalog and explicit selection (112.2323ms)
✔ verification validation fails closed for source drift lane drift and summary tampering (249.7191ms)
✔ state compatibility rejects legacy or stale payloads with a reset instruction (152.7025ms)
✔ summary and final status preserve environment blockers without treating them as clean proof (0.3789ms)
✔ empty and partial selections cannot report a successful closeout (95.6246ms)
✔ verification summary contract derives markdown from one validated JSON payload (128.9891ms)
✔ verification summary contract refuses to canonize a stale report (112.4028ms)
✔ verification summary contract rejects a successful focused profile as final proof (101.4004ms)
✔ closeout lanes keep stable ids and include critical families (2.4641ms)
✔ group-backed closeout lanes delegate to canonical test-group package facades (4.3977ms)
✔ overlay export closeout lane stays direct and grouped (0.3147ms)
✔ closeout profiles stay stable and Order PDF remains fully catalog-backed (0.2113ms)
✔ normalize args collects profiles categories lane ids skips log dir and state options (0.6344ms)
✔ closeout CLI rejects unknown flags missing values and unknown selectors (1.4774ms)
✔ final report eligibility requires a complete clean default closeout (825.034ms)
✔ select lanes respects profile resume and skip while preserving order (0.2223ms)
✔ environment classifier recognizes playwright/browser failures (0.166ms)
✔ runner classifier recognizes wrapper and sandbox failures (0.2332ms)
✔ summary separates passed failures environment-blocked and runner-blocked lanes (0.1654ms)
✔ state helpers merge by lane id and preserve canonical order (0.2129ms)
✔ state helpers roundtrip versioned payloads and return null when the file is missing (597.0788ms)
✔ reset-style empty state is explicitly not-run rather than passed (597.8861ms)
✔ state file resolves to explicit flag or default artifact path (0.5209ms)
✔ dependency-blocked lanes inherit environment-blocked from preflight (1.0008ms)
✔ report paths stay under docs and state path stays under artifacts (0.1257ms)
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2206.176

```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `npm run test:toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `16924ms`

#### stdout

```text

> test:toolchain-surfaces
> node tools/wp_test_group.mjs toolchain-surfaces

✔ [actions.patch types] fixture uses native @ts-expect-error contracts (4.2356ms)
✔ [actions.patch types] public/backend patch contract fixture typechecks through tsc (673.1686ms)
✔ [actions.patch types] fixture is safe if discovered by the generic runtime runner (347.9431ms)
✔ package-lock resolved tarballs stay on public registries (12.1569ms)
✔ ts runtime loader loads a plain TS module (235.4029ms)
✔ ts runtime loader resolves local .js imports to TS files (31.202ms)
✔ ts runtime loader supports object mocks by exact specifier (20.0312ms)
✔ ts runtime loader supports dynamic mocks with loader context (18.4755ms)
✔ ts runtime loader cache returns the same module instance (12.0601ms)
✔ ts runtime loader transform errors include the fixture filename (6.702ms)
✔ ts runtime loader evaluate errors include the fixture filename (30.6054ms)
✔ runtime tests do not reintroduce per-test TS VM loaders (199.1231ms)
✔ AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers (20.7039ms)
✔ AST adapter preserves import, dynamic import, member, and optional-chain shapes for callers (2.5779ms)
✔ AST adapter keeps token/code-line metrics independent from tool callers (1.0337ms)
✔ AST adapter centralizes type-hardening AST counts (1.3011ms)
✔ AST adapter exposes syntax error diagnostics without TypeScript compiler API (0.8547ms)
✔ no project tool/test/runtime source imports TypeScript directly (638.5022ms)
✔ AST adapter returns injected adapter instances without exposing TypeScript module wrapping (0.5757ms)
✔ build-dist args parsing keeps clean/assets/help/unknown policy (3.8396ms)
✔ build-dist path resolution stays rooted under project dist (0.6322ms)
✔ static asset copy mirrors html/runtime/public assets into dist (64.9728ms)
✔ static asset copy keeps repository tests out of dist outputs (9.1035ms)
✔ static asset copy fails when the canonical runtime config module is missing (5.9314ms)
✔ build-dist TypeScript resolver requires local TypeScript by default (12.8352ms)
✔ build-dist TypeScript resolver allows system tsc only in explicit manual mode (2.8959ms)
✔ build-dist flow fails clearly instead of using system tsc when local TypeScript is missing (4.6633ms)
✔ build-dist rejects unknown options in CI/release mode (24.2779ms)
✔ build-dist retries once without tsbuildinfo when incremental build misses entry (13.3455ms)
✔ bundle arg parsing preserves out/sourcemap/minify/rebuild policy (5.7287ms)
✔ bundle path resolution derives out dir and stale tmp cleanup dir canonically (5.6721ms)
✔ bundle dist freshness requests rebuild when entry/build info are stale or missing (9.9856ms)
✔ bundle TypeScript resolver refuses system tsc unless manual fallback is explicit (2.1833ms)
✔ bundle dist build fails before probing system tsc when local TypeScript is missing (13.8132ms)
✔ bundle artifact cleanup removes numbered chunk wrappers only (3.8602ms)
✔ bundle emit writes entry code, sourcemap comment, and extra chunks canonically (17.8226ms)
✔ bundle build config keeps strict entry signatures and named chunk policy (0.9573ms)
✔ bundle build config maps scheduler debug stats to full implementation outside client mode (0.5807ms)
✔ bundle emit writes build-mode marker next to the entry bundle (5.6767ms)
✔ check arg parsing preserves baseline/json/gate/strict flags (3.4057ms)
✔ check mode detection prefers js first and falls back to esm (3.4044ms)
✔ check syntax runner reports malformed js files (194.0299ms)
✔ check policy stats count legacy/root needles by directory (9.2664ms)
✔ check gate/strict results report regressions and clean strict state (0.5862ms)
✔ check json report preserves file and policy summary fields (0.2836ms)
✔ lint architecture contracts block new restricted imports, globals, and App bag access (7.4561ms)
✔ lint architecture contract has no unbaselined or stale violations in the current tree (15564.1969ms)
✔ lint architecture baseline count matches the json baseline file (3.2245ms)
✔ lint architecture contracts fail a new violation that is not in baseline (19.0589ms)
✔ lint architecture contracts allow a violation only when it is explicitly baselined (10.1332ms)
✔ lint architecture contracts fail when a baseline entry is stale (10.181ms)
✔ lint architecture baseline is loaded from json, not hardcoded in the tool (1.1517ms)
✔ JS-only profile is the canonical ESLint lane (3.5932ms)
✔ JS-only ESLint config omits TS/TSX files and custom parsers (5.4874ms)
✔ unsupported historical ESLint profiles are rejected (4.936ms)
✔ JS-only keeps JS tools, tests, and config files under ESLint no-undef (2.448ms)
✔ wp_lint defaults target JS-only surfaces only (2.6491ms)
✔ modern readiness has a concrete owner for every lint matrix rule (30.0268ms)
✔ modern readiness blocks undecided manual-review targets (1.1156ms)
✔ modern readiness requires replace-by-oxlint rules t
...
[trimmed 12094 chars]
```

### [PASS] Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `5668ms`

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
- duration: `8012ms`

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] npm run test:perf-toolchain-core
============================================================


> test:perf-toolchain-core
> node --test tests/wp_perf_smoke_runtime.test.js tests/wp_toolchain_family_contracts.test.js tests/wp_check_runtime.test.js tests/wp_verify_runtime.test.js tests/wp_verify_lane_runtime.test.js tests/wp_verify_parallel_runtime.test.js

✔ check arg parsing preserves baseline/json/gate/strict flags (2.2732ms)
✔ check mode detection prefers js first and falls back to esm (2.1329ms)
✔ check syntax runner reports malformed js files (107.4871ms)
✔ check policy stats count legacy/root needles by directory (5.487ms)
✔ check gate/strict results report regressions and clean strict state (0.3984ms)
✔ check json report preserves file and policy summary fields (0.1782ms)
✔ perf smoke args parse lanes, scripts, baseline paths, and flags canonically (2.5486ms)
✔ perf smoke help text advertises default lanes and baseline flags (0.4901ms)
✔ perf smoke planner resolves verify lanes and dedupes script overlap (0.9786ms)
✔ perf smoke baseline evaluation detects regressions and profile drift (2.1694ms)
✔ perf smoke markdown report keeps durable tool-owned baseline anchors (1.017ms)
✔ perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow (20.4606ms)
✔ [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules (5.1032ms)
✔ [toolchain] bundle keeps one thin entrypoint plus canonical owner modules (1.4137ms)
✔ [toolchain] check keeps one thin entrypoint plus canonical owner modules (1.0963ms)
✔ [toolchain] release keeps one thin entrypoint plus canonical owner modules (1.4305ms)
✔ [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules (1.2559ms)
✔ [toolchain] test keeps one thin entrypoint plus canonical owner modules (1.7505ms)
✔ [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules (3.3597ms)
✔ [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules (0.8471ms)
✔ [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules (0.9534ms)
✔ [toolchain] verify keeps one thin entrypoint plus canonical owner modules (1.0138ms)
✔ [toolchain] verify-parallel keeps one thin entrypoint plus canonical owner modules (0.8507ms)
✔ verify lane state parses multiple lane names plus print/dry-run/no-dedupe flags (2.5689ms)
✔ verify lane catalog lists stable lane names, flattens nested aliases, and dedupes multi-lane plans canonically (4.7924ms)
✔ verify lane planner reports the canonical script order for single and multi-lane runs (3.4784ms)
✔ verify lane flow runs flattened scripts in order (0.776ms)
✔ verify lane flow dedupes overlapping scripts across multiple lanes by default (0.3963ms)
✔ verify lane help text advertises the canonical lane catalog and multi-lane support (0.6738ms)

⚠️  Prettier check: formatting differences found (warning only).

❌ Prettier check failed in gate mode (formatting differences found).
✔ verify parallel args preserve verify flags and local concurrency controls (3.3512ms)
✔ verify parallel plan builds once and gives test shards isolated reports (1.228ms)
✔ verify parallel flow treats prettier diffs as warnings outside gate mode (2.4233ms)
✔ verify parallel flow fails prettier diffs in gate mode and skips bundle phase (1.0685ms)

============================================================
[WardrobePro] build dist (no assets)
============================================================

✔ verify args parsing preserves gate/no-build/skip-bundle/soft-format policy (2.4917ms)
✔ format check classification warns in normal mode and fails in strict gate mode (0.5847ms)
✔ ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise (3.6348ms)
✔ verify flow orders core checks and skips bundle commands when requested (4.5959ms)
✔ verify flow runs both client release bundle targets in order when bundling is enabled (2.9089ms)
ℹ tests 38
ℹ suites 0
ℹ pass 38
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 277.6826

============================================================
[WP Perf Smoke] npm run test:ui-react-import-hardening-contracts
============================================================


> test:ui-react-import-hardening-contracts
> node --test tests/ui_react_import_hardening_contracts.test.js

✔ ui react import hardening removes legacy React namespace access from pure ts modules (36.7184ms)
✔ ui react import hardening uses explicit named type imports for event-heavy contracts (0.2853ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 151.105

============================================================
[WP Perf Smoke] npm run test:ui-react-jsx-hardening-contracts
==
...
[trimmed 1870 chars]
```

### [PASS] Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `6263ms`

#### steps

- [PASS] overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 284ms)
- [PASS] typecheck platform: `node tools/wp_typecheck.js --mode platform` (passed, 639ms)
- [PASS] typecheck services: `node tools/wp_typecheck.js --mode services` (passed, 1124ms)
- [PASS] typecheck runtime: `node tools/wp_typecheck.js --mode runtime` (passed, 556ms)
- [PASS] layer contracts: `node tools/wp_layer_contract.js` (passed, 1706ms)
- [PASS] public api contracts: `node tools/wp_public_api_contract.js` (passed, 1951ms)

### [PASS] Order PDF overlay core (canonical group)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:overlay-core`
- status: **passed**
- exit code: `0`
- duration: `5172ms`

#### stdout

```text

> test:order-pdf-surfaces:overlay-core
> node tools/wp_test_group.mjs order-pdf-overlay-core

✔ order pdf export actions honor image/gmail busy flags before starting another action (32.6085ms)
✔ order pdf interaction handlers report pointer-cancel failures instead of throwing (3.2117ms)
✔ order pdf export actions reuse cached interactive blob while draft signature is unchanged (5.5224ms)
✔ getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error (2.4213ms)
✔ getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess (0.3222ms)
✔ getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text (0.271ms)
✔ applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists (0.3583ms)
✔ readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing (4.3749ms)
✔ loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state (0.7441ms)
✔ refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it (0.5395ms)
✔ resolveOrderPdfInlineConfirmAction returns the selected follow-up draft (0.4737ms)
✔ order pdf draft effects preserves a canonical edited details pair (9.1314ms)
✔ order pdf draft effects derives the seed from canonical text when auto details are empty (1.2667ms)
✔ order PDF editor mode starts from externally-owned sketch visibility (4.4786ms)
✔ PDF annotation waits for an open sketch preview to close (0.5478ms)
✔ an externally opened sketch preview preempts PDF page annotation (0.2819ms)
✔ requesting sketch preview closes PDF annotation before the external toggle resolves (0.2263ms)
✔ canceling a pending PDF request does not reopen it after the sketch closes (0.3085ms)
✔ order pdf stage/file interactions keep close intent and PDF validation behavior canonical (4.0273ms)
✔ order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state (2.5389ms)
✔ getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes (6.4849ms)
✔ getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks (6.3263ms)
✔ bindExportApiFromModule captures the app once and returns null for missing module/app (1.9906ms)
✔ order pdf details line helpers parse and collect canonical keyed rows (4.367ms)
✔ order pdf details line helpers preserve inline tails and positioned extras (1.4697ms)
✔ order pdf text fallback html decoder preserves newlines and common entities without a document (4.061ms)
✔ order pdf text public seam exposes the canonical empty draft defaults (4.3953ms)
✔ order pdf text merge falls back to exact base replacement when no marker document is available (1.608ms)
✔ order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam (4.3028ms)
✔ order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear (1.705ms)
✔ order pdf merge support resolves clean detected regions without preserving stale manual leftovers (0.7297ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4497.5334

```

### [PASS] Order PDF PDF-render batch (canonical group)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:pdf-render`
- status: **passed**
- exit code: `0`
- duration: `5911ms`

#### stdout

```text

> test:order-pdf-surfaces:pdf-render
> node tools/wp_test_group.mjs order-pdf-pdf-render

✔ [order-pdf] prepared details split can be painted without re-wrapping (4.4402ms)
✔ [order-pdf] prepared layout preserves wrapped lines and visible max-line window (0.526ms)
✔ [order-pdf] image-pdf details text uses the canonical touched semantics (0.4629ms)
✔ order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled (97.0781ms)
✔ order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled (26.8394ms)
✔ order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled (17.2781ms)
✔ order pdf pdf-import clears saved form text and stale widget appearances for editor background (67.6422ms)
✔ order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails (11.3881ms)
✔ order pdf pdf-import extracts generated field names through the canonical document-field runtime (72.6544ms)
✔ order pdf pdf-import reads bytes from file-like objects and tolerates read failures (1.4705ms)
✔ order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page (17.8739ms)
✔ order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime (3.7729ms)
✔ order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer (3.2327ms)
✔ order pdf image-pdf export writes hidden import fields that load back into the editor (39.1717ms)
✔ order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path (9.5391ms)
✔ order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup (1.7072ms)
✔ cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly (3.1504ms)
✔ loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document (2.8478ms)
✔ loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves (1.6451ms)
✔ order pdf render helpers treat destroyed/aborted worker errors as expected cancellations (11.0119ms)
✔ loadOrderPdfFirstPage clones source bytes before handing them to pdf.js (5.8818ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5116.9975

```

### [PASS] Order PDF sketch batch (canonical group)

- id: `order-pdf-sketch`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:sketch`
- status: **passed**
- exit code: `0`
- duration: `4285ms`

#### stdout

```text

> test:order-pdf-surfaces:sketch
> node tools/wp_test_group.mjs order-pdf-sketch

✔ [history-ui] suspended history shortcuts are detected from the active overlay element (2.7089ms)
✔ [history-ui] suspended history shortcuts fall back to a document-level overlay marker (0.9483ms)
✔ [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags (13.619ms)
✔ [order-pdf] refresh-auto preserves sketch annotations while refreshing project details (3.4537ms)
✔ [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport (2.653ms)
✔ [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space (0.7834ms)
✔ [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot (4.0987ms)
✔ [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports (0.7987ms)
✔ [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes (1.0773ms)
✔ [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads (1.7235ms)
✔ [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes (0.3733ms)
✔ [order-pdf] sketch canvas frame only commits once a real 2d context exists (0.9121ms)
✔ [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically (8.3184ms)
✔ [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key (1.1877ms)
✔ [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion (0.3199ms)
✔ [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect (0.3135ms)
✔ [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point (0.3825ms)
✔ [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths (2.3579ms)
✔ [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history (0.5482ms)
✔ [order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts (1.17ms)
✔ [order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically (1.5714ms)
✔ [order-pdf] sketch panel runtime reads drawing rects once from the measured host surface (1.5306ms)
✔ [order-pdf] sketch preview reveal scrolls the editor stage just enough to expose created images (1.1487ms)
✔ [order-pdf] sketch preview reveal does not scroll when the panel is already visible (0.3765ms)
✔ [order-pdf] sketch preview reveal uses the stage scroll container instead of the page window (0.6925ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after success (1.7114ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after failure (2.9227ms)
✔ [order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states (2.8671ms)
✔ [order-pdf] sketch preview session restores the original doors-open state after success (0.6618ms)
✔ [order-pdf] sketch preview session snapshot captures and restores the original camera pose (1.7354ms)
✔ [order-pdf] sketch preview session restores the original camera pose after success (0.4856ms)
✔ [order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z (3.4538ms)
✔ [order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew (0.3939ms)
✔ [order-pdf] sketch history shortcuts are always consumed while the sketch panel is open (0.3391ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3517.1888

```

### [PASS] Order PDF export overlay batch (canonical group)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-overlay`
- status: **passed**
- exit code: `0`
- duration: `4424ms`

#### stdout

```text

> test:order-pdf-surfaces:export-overlay
> node tools/wp_test_group.mjs order-pdf-export-overlay

✔ loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data (7.2195ms)
✔ exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download (1.306ms)
✔ exportOrderPdfImageWithDeps reports busy before building another image PDF (0.5101ms)
✔ exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing (1.0672ms)
✔ loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast (2.8629ms)
✔ exportOrderPdfInteractiveWithDeps preserves the real export failure detail (1.0755ms)
✔ loadOrderPdfIntoEditorWithDeps treats canonical html-only extracted details as found fields (2.0672ms)
✔ loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late (2.056ms)
✔ order pdf overlay export ops fail fast when rasterization has no document seam (6.3028ms)
✔ order pdf overlay export ops build image attachments through the canonical attachment seam (16.3798ms)
✔ order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages (5.5184ms)
✔ order pdf overlay image rasterization restores first-page annotations clipped inside repainted PDF text boxes (8.3652ms)
✔ order pdf export single-flight reuses duplicate same-key work per app and clears after completion (7.1222ms)
✔ order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps (2.0674ms)
✔ order pdf export single-flight derives stable load keys and maps them back to action kinds (1.1516ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3667.8734

```

### [PASS] Order PDF export builders batch (canonical group)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-builders`
- status: **passed**
- exit code: `0`
- duration: `6201ms`

#### stdout

```text

> test:order-pdf-surfaces:export-builders
> node tools/wp_test_group.mjs order-pdf-export-builders

✔ resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values (4.2811ms)
✔ resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so (1.2391ms)
✔ resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides (7.8613ms)
✔ buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable (1722.6467ms)
✔ captureOrderPdfCompositeImages applies sketch annotations after base composite capture (7.8503ms)
✔ buildOrderPdfDocumentResult embeds the primary PDF page annotation layer at high raster density (5.6982ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5423.4998

```

### [PASS] Order PDF export capture batch (canonical group)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-capture`
- status: **passed**
- exit code: `0`
- duration: `3911ms`

#### stdout

```text

> test:order-pdf-surfaces:export-capture
> node tools/wp_test_group.mjs order-pdf-export-capture

✔ order pdf capture cache signature falls back cleanly when state is missing or invalid (1.807ms)
✔ order pdf capture cache returns cloned bytes instead of live cache buffers (1.0358ms)
✔ order pdf capture cache reuses sketch base assets while signature is unchanged (0.7761ms)
✔ order pdf capture cache ignores pdf editor draft changes but invalidates on build/config changes (0.3389ms)
✔ order pdf capture cache signature ignores sketch-only annotation changes (1.1967ms)
✔ export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas (3.7481ms)
✔ export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures (0.7926ms)
✔ order PDF render/sketch composite preserves chest live viewport and screenshot note mapping (2.6947ms)
✔ order PDF open/closed composite preserves corner live viewport and screenshot note mapping (1.3119ms)
✔ export order pdf ops factory exposes stable draft/export surface (4.9084ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3123.9184

```

### [PASS] Order PDF export text batch (canonical group)

- id: `order-pdf-export-text`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-text`
- status: **passed**
- exit code: `0`
- duration: `4183ms`

#### stdout

```text

> test:order-pdf-surfaces:export-text
> node tools/wp_test_group.mjs order-pdf-export-text

✔ createOrderPdfRenderAnnotationLayerPngOp renders first-page PDF annotations to PNG bytes (7.3053ms)
✔ listOrderPdfSketchStrokes keeps only valid strokes for the requested page (0.6625ms)
✔ paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas (1.8528ms)
✔ paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser (0.7088ms)
✔ compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer (1.829ms)
✔ paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite (1.9562ms)
✔ export order pdf text ops compose details, bidi, and layout behavior from one canonical seam (7.8032ms)
✔ export order pdf text ops keep canonical draft defaults and bidi stabilization behavior (5.367ms)
✔ export order pdf text uses wardrobe-type depth fallback only when raw depth is missing (1.1521ms)
✔ export order pdf text includes classic cornice only when the main cornice flag is enabled (0.7774ms)
✔ export order pdf text omits cornice when the main cornice flag is disabled (0.9828ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3489.3663

```

### [PASS] Sketch manual/hover (canonical group)

- id: `sketch-manual-hover`
- category: `verify`
- command: `npm run test:sketch-surfaces:manual-hover`
- status: **passed**
- exit code: `0`
- duration: `2869ms`

#### stdout

```text

> test:sketch-surfaces:manual-hover
> node tools/wp_test_group.mjs sketch-manual-hover

✔ manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner (9.3414ms)
✔ manual-layout flow skips auto-filled shelves colliding with sketch drawers and warns once (4.0775ms)
✔ manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata (1.1979ms)
✔ manual-layout sketch hover match state accepts a recent matching hover snapshot (1.9423ms)
✔ manual-layout sketch hover match state rejects stale or mismatched hover snapshots (0.4348ms)
✔ manual-layout sketch hover match state rejects records that still carry retired host identity fields (0.309ms)
✔ manual-layout hover intent readers decode canonical versioned commands (3.3471ms)
✔ manual-layout hover intent readers reject malformed and non-exact command payloads (0.3589ms)
✔ manual-layout command decoder rejects missing, unknown, and extra fields for every mutation family (1.1638ms)
✔ manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides (4.1194ms)
✔ manual-layout hover module context falls back to the corner root config when no cell config exists (1.8176ms)
✔ manual-layout module box preview routes shelf hover through the focused box owner (8.3436ms)
✔ manual-layout module stack preview routes ext drawers through the focused stack owner (3.5576ms)
✔ manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools (13.1834ms)
✔ manual-layout sketch hover targets free-box content before a module selector behind it (4.87ms)
✔ manual-layout sketch hover falls back to standalone free placement when no selector is hit (2.1868ms)
✔ manual-layout sketch external drawer hover marks standard external drawers for removal only (1.842ms)
✔ manual-layout sketch internal drawer hover ignores standard external drawers (0.9661ms)
✔ manual-layout free-box external drawer hover prefers the drawer stack over a nearby shelf removal (4.7646ms)
✔ module surface hover writes shelf add intent so click follows the hover preview (7.6455ms)
✔ module surface hover writes rod add intent so stale shelf-remove hover cannot steal the click (1.4901ms)
✔ module preview flow probes existing shelf removal before drawer stack add previews (1.5778ms)
✔ existing vertical remove helper is a no-op when nothing removable is under the cursor (0.8347ms)
✔ door action hover state resolves the nearest door leaf owner with metrics (0.9535ms)
✔ manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors (2.9504ms)
✔ manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool (2.8384ms)
✔ manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout (0.7457ms)
✔ recent sketch hover matching honors tool, age, free-placement, and host identity together (2.9937ms)
✔ recent sketch hover matching rejects retired or malformed host identity records (0.5024ms)
✔ manual tool access prefers canonical mode-state value before runtime tools fallback (1.8043ms)
✔ manual tool access falls back to runtime tools when mode-state tool is absent (1.0693ms)
✔ sketch-free host falls back to internal grid maps before the zero-door hinged default host (4.04ms)
✔ sketch-free host uses the hinged zero-door fallback only when no config or grid host exists (0.4253ms)
ℹ tests 33
ℹ suites 0
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1969.8442

```

### [PASS] Sketch box/hover (canonical group)

- id: `sketch-box-hover`
- category: `verify`
- command: `npm run test:sketch-surfaces:box-hover`
- status: **passed**
- exit code: `0`
- duration: `2489ms`

#### stdout

```text

> test:sketch-surfaces:box-hover
> node tools/wp_test_group.mjs sketch-box-hover

✔ sketch-box door preview stays inert for hinge toggles when the active segment has no door (3.3305ms)
✔ sketch-box door preview resolves canonical remove metadata for an existing double-door pair (22.1124ms)
✔ sketch-box door preview keeps explicit hinge/remove metadata for a single existing door (0.6339ms)
✔ sketch-box doors upsert single-door records through the canonical id factory and segment placement seam (4.3233ms)
✔ sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair (25.4592ms)
✔ sketch-box doors remove a focused segment door without disturbing the other segment (0.7162ms)
✔ sketch-box doors treat rows inside the same divided column as independent cells (2.2317ms)
✔ sketch-box doors preserve stored groove line counts when rewriting door records (3.4091ms)
✔ resolved module boxes ignore free-placement items and the requested ignoreBoxId (2.5961ms)
✔ resolved module boxes reject string-encoded live geometry (0.2177ms)
✔ vertical center clamp respects module bounds even when desired center is far outside range (0.2019ms)
✔ placement resolution can ignore the edited box id instead of blocking on itself (0.6489ms)
✔ placement reports blocked when overlap chain reaches the module ceiling and floor (0.9774ms)
✔ overlap primitive still allows exact edge contact without treating it as overlap (0.1604ms)
✔ placement resolution can be confined to the pointer slot instead of jumping across blockers (0.9077ms)
✔ placement resolution reports blocked when vertical content blockers leave no valid box slot (0.4121ms)
✔ sketch-box runtime parses width/depth overrides and rejects unrelated tools (3.2251ms)
✔ sketch-box runtime geometry center-snaps and width-clamps inside the module span (2.0004ms)
✔ sketch-box runtime geometry rejects string-encoded live overrides (0.618ms)
✔ sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match (1.0289ms)
✔ sketch-box runtime hit scan rejects string-encoded live box geometry (0.3227ms)
✔ sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized (1.4492ms)
✔ sketch-box free-placement commit does not derive floorY from string measurements (0.4257ms)
✔ sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column (1.1436ms)
✔ sketch-box free-placement commit clears hover when the canonical commit finishes without next hover (0.5764ms)
✔ sketch-box free-placement commit stays inert when no canonical host is available (0.475ms)
✔ sketch-box door visuals forward mirror state, mirror layout, effective frame style, and deep pick meta through the special visual path (7.3404ms)
✔ sketch-box door visuals use styled profile visuals for in-cabinet whole box doors (0.5833ms)
✔ free-box click fallback does not turn a module hit into a free-placement box (1.8406ms)
✔ free-box click fallback still creates a free-placement box when no module was hit (2.1334ms)
✔ free-box click fallback rejects string-encoded plane-hit geometry (0.2189ms)
✔ free-box click preserves a real recent free-placement hover even when a module is behind it (1.1569ms)
✔ sketch external drawers hover context loads persisted module stacks for remove/overlap handling (12.065ms)
✔ free-box content click stays on the free box even when a wardrobe module is behind it (0.9971ms)
✔ free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks (6.3266ms)
✔ module sketch hover blocks collisions between internal and external drawer stacks (1.0788ms)
✔ free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind (1.5036ms)
✔ module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit (1.4942ms)
✔ module sketch external drawers preview reads the selector front envelope instead of the inner cavity only (0.6901ms)
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1757.1314

```

### [PASS] Sketch free-boxes (canonical group)

- id: `sketch-free-boxes`
- category: `verify`
- command: `npm run test:sketch-surfaces:free-boxes`
- status: **passed**
- exit code: `0`
- duration: `2323ms`

#### stdout

```text

> test:sketch-surfaces:free-boxes
> node tools/wp_test_group.mjs sketch-free-boxes

✔ manual-layout free-box shelf grid scopes five shelves to the active split cell (3.3204ms)
✔ manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short (0.2676ms)
✔ manual-layout free-box shelf grid commit writes shelves into the no-main free box (3.7755ms)
✔ manual-layout free-box shelf grid blocked commit consumes click without mutating (1.3964ms)
✔ manual-layout free-box shelf grid rejects partial hover records without mutating content (0.6191ms)
✔ manual-layout free-box shelf grid blocks shelves that would collide with an existing rod (0.8963ms)
✔ manual-layout free-box rod hover can target an existing shelf for removal (2.8862ms)
✔ manual-layout free-box shelf edit can target an existing rod or storage barrier for removal (2.1715ms)
✔ manual-layout free-box commits cross-kind removal hovers from shelf and rod tools (2.7167ms)
✔ manual-layout free-box storage removal hover covers the whole existing barrier height (1.3662ms)
✔ manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it (3.9788ms)
✔ preset layout free-box plan maps storage shortcut into active split cell contents (0.9827ms)
✔ preset layout shortcut hover and click target the free box instead of the wardrobe behind it (2.3989ms)
✔ brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe (2.717ms)
✔ sketch-free box content preview short-circuits unsupported content kinds before target scanning (1.2337ms)
✔ sketch-free box content preview keeps door-hinge hover inert when the active segment has no door (3.9841ms)
✔ sketch-free box content preview returns canonical double-door removal metadata for an existing pair (15.6899ms)
✔ sketch-free external drawer preview blocks construction on existing free-box shelf content (6.5771ms)
✔ sketch-free vertical preview keeps removal hover available while the active tool is sketch external drawers (3.7687ms)
✔ sketch-free shelf removal accepts direct shelf-board hits with the same generous tolerance as wardrobe shelves (0.907ms)
✔ sketch-free placement hover record keeps canonical host/free-placement fields (3.6885ms)
✔ sketch-free placement commit adds a free-placement box through the canonical modules patch seam (2.5457ms)
✔ sketch-free placement commit rejects string-encoded internal hover geometry (0.5216ms)
✔ sketch-free placement remove fails closed when its target id is missing (0.3695ms)
✔ sketch-free placement content commit routes free-placement door removal through the canonical content seam (4.5951ms)
✔ sketch-free placement content commit consumes blocked no-room hovers without mutating (2.1246ms)
✔ sketch-free placement ext-drawer removal also removes regular external drawers in the same free box (2.116ms)
✔ sketch-free vertical tools commit cross-kind vertical-content removal hovers (2.9173ms)
✔ sketch-free stack tools commit existing vertical-content removal hovers before adding drawers (0.6869ms)
✔ sketch-free regular external drawers can add a shoe drawer without falling back to module drawers (2.3383ms)
✔ sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top (1.0497ms)
✔ sketch-free regular external drawers update shoe and regular count independently in the same cell (0.6448ms)
✔ sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks (2.3701ms)
✔ sketch free divider target scan projects fallback pointer to the box front plane (0.4647ms)
✔ sketch free surface target scan rejects string-encoded free-box geometry (0.207ms)
✔ sketch free content target scan projects profile-door hits to the canonical box front plane (0.2899ms)
✔ sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry (1.2811ms)
✔ sketch free base adornment preview rejects string-encoded current base dimensions (1.7794ms)
✔ free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset (2.6087ms)
✔ free-box attach still prefers top/bottom when the cursor is only outside vertically (0.9723ms)
✔ free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right (0.5703ms)
✔ free-box attach below still allows a true staircase corner touch before detaching (0.5146ms)
✔ free-box attach still prefers side attachment when the cursor is clearly outside only on X (0.4764ms)
✔ free-box attach rejects string-encoded geometry inputs (0.2434ms)
✔ free-box hover attach below falls back to a valid floor-safe side placement when room floor blocks under-stack placement (24.9552ms)
✔ free-box hover attach above keeps plane X even when surface hit lands on the left wall of the target box (0.8552ms)
✔ free-box hover near lower corners stays symmetric wh
...
[trimmed 1942 chars]
```

### [PASS] Sketch render/visuals (canonical group)

- id: `sketch-render-visuals`
- category: `verify`
- command: `npm run test:sketch-surfaces:render-visuals`
- status: **passed**
- exit code: `0`
- duration: `1926ms`

#### stdout

```text

> test:sketch-surfaces:render-visuals
> node tools/wp_test_group.mjs sketch-render-visuals

✔ render sketch box fronts reuses one mirror material across mirrored external drawers (11.2917ms)
✔ render sketch box fronts reject string-encoded live external drawer positions (0.4411ms)
✔ render sketch box fronts do not parse string-encoded live external drawer counts (0.6591ms)
✔ render sketch box external drawers flush a top-anchored free-box stack to the box face edge (0.705ms)
✔ interior sketch style, feature flags, and divider state read only canonical input fields (2.2063ms)
✔ interior sketch input contract fails fast when the config snapshot is missing (1.1155ms)
✔ renderSketchFreeBoxDimensions keeps height on the right and depth on the left (2.0363ms)
✔ renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions (0.3224ms)
✔ renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries (2.4662ms)
✔ renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths (1.5236ms)
✔ renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label (0.5087ms)
✔ render interior sketch layout geometry clamps box size and center inside the internal span (2.3494ms)
✔ render sketch box shell geometry rejects string-encoded live box dimensions (0.7772ms)
✔ render interior sketch layout geometry rejects string-encoded live numeric overrides (0.7519ms)
✔ render interior sketch layout geometry rejects string-encoded runtime placement args (1.3824ms)
✔ render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry (0.3853ms)
✔ render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks (2.293ms)
✔ render interior sketch layout resolves content segments from divider-separated spans (1.5169ms)
✔ render interior sketch support clamps placement, emits shelf pins, and keeps brace side seams disabled (1.5877ms)
✔ render interior sketch support locator resolves the matching box by center span (0.8023ms)
✔ render interior sketch shelves emit folded contents with measured shelf clearance (0.9186ms)
✔ render interior sketch support rejects string-encoded shelf and storage geometry (0.5307ms)
✔ removed frame side sketch shelves preserve glass and double variants on forced brace geometry (0.4406ms)
✔ render interior sketch module shelves keep brace shelves on the brace material path (3.103ms)
✔ render interior sketch rods use the installed rod owner when it succeeds and local visual rod when it rejects (0.8826ms)
✔ render interior sketch rods report per-item failures and continue rendering later rods (0.2424ms)
✔ render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts (3.4785ms)
✔ render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists (0.5589ms)
✔ render interior sketch visuals expose callable factories only for function inputs (0.3457ms)
✔ sketch front visual state reuses canonical full-door mirror/glass maps for split door segments (7.0429ms)
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1262.4723

```

### [PASS] Cloud sync lifecycle (canonical group)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:lifecycle`
- status: **passed**
- exit code: `0`
- duration: `15726ms`

#### stderr

```text
[serial-tests batch 1/6] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/6] ok (476ms)
[serial-tests batch 2/6] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/6] ok (5.0s)
[serial-tests batch 3/6] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/6] ok (1.0s)
[serial-tests batch 4/6] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_realtime_runtime.test.ts)
[serial-tests batch 4/6] ok (1.3s)
[serial-tests batch 5/6] 3 files (tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 5/6] ok (6.1s)
[serial-tests batch 6/6] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 6/6] ok (1.0s)
[serial-tests] completed 16 files in 15s across 6 batches

```

#### stdout

```text

> test:cloud-sync-surfaces:lifecycle
> node tools/wp_test_group.mjs cloud-sync-lifecycle

✔ cloud sync access reads canonical services panelApi and ignores legacy root alias (1.2087ms)
✔ cloud sync access ensures canonical service state on services root (0.2804ms)
✔ cloud sync access exposes test hooks through canonical service state only (0.2167ms)
✔ cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required (3.9394ms)
✔ cloud sync feedback prefers preserved error messages when available (0.4554ms)
✔ cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller (123.0656ms)
✔ cloud sync panel actions fall back to derived status when panel snapshot api is unavailable (11.7299ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 400.7498
✔ cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping (8.0291ms)
✔ cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly (5.9067ms)
✔ cloud sync install support preserves backward compatibility for untagged published dispose refs (1.95ms)
✔ cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose (2.253ms)
✔ cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch (0.7123ms)
✔ cloud sync install support clears only canonical published slots and preserves unrelated state (1.6245ms)
✔ cloud sync install support preserves canonical test hooks by default while clearing published slots (0.4282ms)
✔ cloud sync install support drops test hooks when cleanup opts out of hook preservation (0.2425ms)
✔ cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/wrappers (51.4393ms)
✔ cloud_sync lifecycle: no timer/listener leaks after dispose (5.8966ms)
✔ cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle (7.1895ms)
✔ cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose (9.1541ms)
✔ cloud_sync lifecycle: dispose clears published public state but preserves test hooks (3.0361ms)
✔ cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes (4.8792ms)
✔ cloud_sync lifecycle: stale held dispose refs do not clear newer public state (9.9683ms)
✔ cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap (8.2892ms)
✔ cloud_sync lifecycle: failed reinstall clears stale public state when config disappears (4.479ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4886.2012
✔ owned cloud-sync family flight registers immediately for synchronous re-entry reuse (2.5121ms)
✔ owned cloud-sync family flight returns busy for synchronous conflicting re-entry (1.5304ms)
✔ runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work (0.4813ms)
✔ readCfg normalizes deps config and clamps site2 sketch max age (2.2303ms)
✔ cloud sync config browser helpers keep URL params and site2 detection canonical (1.3554ms)
✔ cloud sync config shared helpers keep rest URL and headers canonical (0.2556ms)
✔ cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint (8.5588ms)
✔ cloud sync delete temp does not stamp pull activity when the preflight row read fails (1.1044ms)
✔ cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors (1.1647ms)
✔ cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work (1.6865ms)
✔ cloud sync delete-temp tracks preflight pull activity and settled push activity canonically (1.0699ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 932.0814
✔ cloud sync attention pulls still fire on focus when eligible (6.4333ms)
✔ cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown (0.5242ms)
✔ cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return (0.5952ms)
✔ cloud sync attention online pull does not stay blocked by subscribed status without a live channel (0.4708ms)
✔ cloud sync attention online handler reports pull failures without breaking later attention events (0.7734ms)
✔ cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes (0.423ms)
✔ cloud sync attention pulls stay inert after the lifecycle guard flips stale before cleanup (0.3008ms)
✔ cloud sync diagnostics storage listener stays inert after the lifecycle guard flips stale (0.2745ms)
✔ cloud sync real
...
[trimmed 3292 chars]
```

### [PASS] Cloud sync main-row (canonical group)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:main-row`
- status: **passed**
- exit code: `0`
- duration: `6217ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (879ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_mutation_commands_runtime.test.ts … tests/cloud_sync_owner_context_runtime.test.ts)
[serial-tests batch 2/3] ok (3.5s)
[serial-tests batch 3/3] 1 file (tests/cloud_sync_status_install_runtime.test.ts)
[serial-tests batch 3/3] ok (970ms)
[serial-tests] completed 7 files in 5.4s across 3 batches

```

#### stdout

```text

> test:cloud-sync-surfaces:main-row
> node tools/wp_test_group.mjs cloud-sync-main-row

✔ cloud sync main row skips remote apply churn when newer rows carry the same payload (7.189ms)
✔ cloud sync main row still applies remote payloads when the effective collections actually change (2.4178ms)
✔ cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged (0.6227ms)
✔ cloud sync main row seeds a missing row from local collections on the initial pull (11.6379ms)
✔ cloud sync main row initial seed reuses returned representation when the upsert already returns the row (1.5191ms)
✔ cloud sync main row push publishes changed collections once and skips identical repeats (6.0431ms)
✔ cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch (1.6799ms)
✔ cloud sync main row reuses the same pending push promise for duplicate direct pushes (2.4341ms)
✔ cloud sync main row pull applies newer remote payloads into local storage (1.3566ms)
✔ cloud sync main row first remote pull hydrates app maps even when stored hash already matches remote (1.3257ms)
✔ cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull (0.8503ms)
✔ cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push (0.9016ms)
✔ cloud sync main row push applies settled remote payload locally without forcing a follow-up pull (1.0961ms)
✔ cloud sync main row collapses pull retries during a push into one post-push follow-up pull (1.819ms)
✔ cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests (4.259ms)
✔ cloud sync main row notifies push-settled listeners only after the push flight has cleared (1.5371ms)
✔ cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests (1.286ms)
✔ cloud sync main row shares app-scoped push ownership across main-row instances for the same App (0.9037ms)
✔ cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run (0.2487ms)
✔ cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up (0.7947ms)
✔ cloud sync main row preserves one follow-up push request raised while a push is already in flight (1.0333ms)
✔ cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first (1.794ms)
✔ cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce (0.5069ms)
✔ cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull (0.7357ms)
✔ cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys (2.5418ms)
✔ cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner (1.0167ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 774.1923
✔ cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results (15.9791ms)
✔ cloud sync mutation cleanup commands return cancelled when confirm is declined (1.455ms)
✔ cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel (1.4751ms)
✔ cloud sync delete-temp commands reuse one pending models cleanup flow per app (8.6746ms)
✔ cloud sync delete-temp commands block conflicting cleanup family actions while one is pending (1.6449ms)
✔ cloud sync owner context composes room helpers and per-tab client identity through dedicated seams (10.5579ms)
✔ cloud sync owner context uses the public room for gate rows when no room URL is selected (1.0166ms)
✔ cloud sync owner context starts disabled realtime with an empty channel surface (1.5941ms)
✔ cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating (2.0549ms)
✔ cloud sync owner context memoizes runtime status publishes and keeps the canonical status surface live (2.3073ms)
✔ cloud sync owner context keeps held status refs alive across owner reinstall (3.6315ms)
✔ cloud sync owner context ignores stale status publishes after a newer owner takes over (1.7092ms)
✔ cloud sync owner context ignores late status publishes after publication teardown (2.6186ms)
✔ cloud sync owner context ignores stale publication cleanup after a newer owner takes over (1.5916ms)
✔ cloud sync owner context tombstones held status refs after published-state cleanup (0.9909ms)
✔ cloud sync owner context self-heals leaked enumerable status markers even when the runtime snapshot is unchanged (0.6148ms)
✔ cloud sync owner context self-heals drifted canonical status surfaces even when runtime snapshot is unchanged (0.4771ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3405.5691
✔ cloud sync status
...
[trimmed 714 chars]
```

### [PASS] Cloud sync panel-install (canonical group)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-install`
- status: **passed**
- exit code: `0`
- duration: `4386ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-install
> node tools/wp_test_group.mjs cloud-sync-panel-install

✔ cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall (19.7717ms)
✔ cloud sync panel api install heals legacy installed markers that only preserved stale public callables (1.4714ms)
✔ cloud sync panel api install ignores stale publication epochs (1.8166ms)
✔ cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch (2.7638ms)
✔ cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup (2.6933ms)
✔ cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation (2.4048ms)
✔ cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods (2.0715ms)
✔ cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots (18.1365ms)
✔ cloud sync panel api runtime status clone strips drifted realtime/polling extras (2.2791ms)
✔ cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes (0.7437ms)
✔ cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged (1.5325ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3631.2201

```

### [PASS] Cloud sync panel-controller (canonical group)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-controller`
- status: **passed**
- exit code: `0`
- duration: `5330ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-controller
> node tools/wp_test_group.mjs cloud-sync-panel-controller

✔ cloud sync panel api republishes panel snapshot even when floating pin command throws (19.957ms)
✔ cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws (6.9824ms)
✔ cloud sync panel api preserves thrown messages for controller-facing commands (27.0487ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4320.7577

```

### [PASS] Cloud sync panel-subscriptions (canonical group)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-subscriptions`
- status: **passed**
- exit code: `0`
- duration: `3307ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-subscriptions
> node tools/wp_test_group.mjs cloud-sync-panel-subscriptions

✔ cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets (5.4347ms)
✔ cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App (1.3396ms)
✔ cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener (5.4978ms)
✔ cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles (2.123ms)
✔ cloud sync async family runner blocks re-entrant conflicting targets before the first run settles (1.3408ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2647.0344

```

### [PASS] Cloud sync panel-snapshots (canonical group)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-snapshots`
- status: **passed**
- exit code: `0`
- duration: `3383ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-snapshots
> node tools/wp_test_group.mjs cloud-sync-panel-snapshots

✔ cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors (4.2296ms)
✔ cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors (1.271ms)
✔ cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths (5.081ms)
✔ cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids deadline timer churn for unchanged snapshots (1.1315ms)
✔ cloud sync panel snapshot controller does not create deadline timer until a tabs-gate subscriber exists (0.3735ms)
✔ cloud sync panel snapshot controller uses timer-driven tabs-gate minute updates when no source subscription exists (2.9021ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2735.0027

```

### [PASS] Cloud sync sync-ops (canonical group)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:sync-ops`
- status: **passed**
- exit code: `0`
- duration: `4495ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (860ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_rest_runtime.test.ts … tests/cloud_sync_site2_sketch_behavior_runtime.test.ts)
[serial-tests batch 2/3] ok (2.2s)
[serial-tests batch 3/3] 3 files (tests/cloud_sync_sketch_ops_runtime.test.ts … tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 3/3] ok (821ms)
[serial-tests] completed 9 files in 3.9s across 3 batches

```

#### stdout

```text

> test:cloud-sync-surfaces:sync-ops
> node tools/wp_test_group.mjs cloud-sync-sync-ops

✔ cloud sync pull coalescer collapses burst triggers into one run and supports cancel (3.2337ms)
✔ cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels (0.8254ms)
✔ cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics (0.7565ms)
✔ cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers (2.2419ms)
✔ cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run (0.5874ms)
✔ cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles (1.1447ms)
✔ cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists (2.2685ms)
✔ cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse (1.5547ms)
✔ cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst (0.7168ms)
✔ cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles (0.758ms)
✔ cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles (1.2408ms)
✔ cloud sync pull coalescer reports synchronous run failures and recovers for later work (0.5801ms)
✔ cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires (1.4217ms)
✔ cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run (0.8534ms)
✔ cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run (0.4557ms)
✔ cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted (0.8593ms)
✔ cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window (2.9896ms)
✔ cloud sync realtime connecting/failure/dispose markers share one canonical branch owner (0.9089ms)
✔ cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner (0.354ms)
✔ cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish (0.5004ms)
✔ cloud sync realtime subscribed marker only issues a gap pull after a resubscribe (0.8392ms)
✔ cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe (0.4231ms)
✔ cloud sync realtime beforeunload cleanup removes the current channel through the installed listener (0.3468ms)
✔ cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label (0.243ms)
✔ cloud sync realtime disconnected marker can publish a preserved error in one canonical transition (0.2196ms)
✔ cloud sync realtime disposed marker clears stale errors from the final disabled snapshot (0.2599ms)
✔ cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains (0.1851ms)
✔ cloud sync realtime hint does not send when the subscribed status no longer has a live channel (0.1321ms)
✔ cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values (0.2351ms)
✔ cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets (3.2488ms)
✔ cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets (1.2665ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 790.5431
✔ cloud sync rest preserves control-row payload fields on getRow (2.9583ms)
✔ cloud sync rest getRow accepts array responses and returns null for missing rows without object-only 406 semantics (0.4217ms)
✔ cloud sync rest getRow returns null for empty array responses (0.2208ms)
✔ cloud sync rest preserves tabs gate payload fields on upsert response (0.6894ms)
✔ cloud sync rest sanitizes saved collections while preserving control rows and extra payload fields (0.6037ms)
✔ cloud sync room commands derive status, private room targets, and share-link copy fallbacks canonically (2.9369ms)
✔ cloud sync room mode preserves thrown error messages (0.2866ms)
✔ cloud sync share-link copy preserves clipboard error messages when prompt fallback is unavailable (0.2958ms)
✔ cloud sync room/share-link commands normalize non-Error throwables into stable messages (0.3677ms)
✔ cloud sketch initial catchup is site2-only even when the remote row is fresh (5.3648ms)
✔ cloud sketch stale initial catchup does not block the next fresh site2 update (0.7662ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2124.5881
[toast] success סקיצה חדשה התעדכנה
[toast] success סקיצה חדשה התעדכנה
[toast] success סקיצה חדשה התעדכנה
✔ cloud sync sk
...
[trimmed 2487 chars]
```

### [PASS] Cloud sync tabs-ui (canonical group)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:tabs-ui`
- status: **passed**
- exit code: `0`
- duration: `3920ms`

#### stdout

```text

> test:cloud-sync-surfaces:tabs-ui
> node tools/wp_test_group.mjs cloud-sync-tabs-ui

✔ floating sketch sync pin command becomes a no-op when state is unchanged (2.5806ms)
✔ floating sketch sync pin command rolls back local state on push failure (0.6145ms)
✔ floating sketch sync pin toggle command flips the current state (0.4511ms)
✔ floating sketch sync pin command preserves push failure message (1.015ms)
✔ floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets (0.3929ms)
✔ cloud sync tabs gate command skips redundant refreshes but extends stale opens (2.6169ms)
✔ cloud sync tabs gate command rolls back on push failure and reports final state (1.2093ms)
✔ cloud sync tabs gate toggle command flips the current ref state (0.4959ms)
✔ cloud sync tabs gate command preserves push failure message (0.5314ms)
✔ cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets (0.65ms)
[WardrobePro][error] Error: [WardrobePro] Missing canonical action (soft UI write access): expected actions.ui.patchSoft
    at requireActionFn (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\runtime\actions_access_core.ts:122:9)
    at patchUiSoft (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\runtime\ui_write_access.ts:124:10)
    at applyCloudSyncUiPatch (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_support_feedback.ts:63:3)
    at Object.patchSite2TabsGateUi (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_tabs_gate_local_runtime_patch.ts:55:7)
    at TestContext.<anonymous> (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_tabs_gate_runtime.test.ts:87:7)
    at Test.runInAsyncScope (node:async_hooks:227:14)
    at Test.run (node:internal/test_runner/test:1325:25)
    at Test.start (node:internal/test_runner/test:1191:17)
    at startSubtestAfterBootstrap (node:internal/test_runner/harness:385:17)
✔ cloud sync tabs gate closes stale site2 UI on initial pull miss (11.506ms)
✔ cloud sync tabs gate uses the current gate base room for push and pull (1.4587ms)
✔ cloud sync tabs gate defaults to the public room when no room URL is selected (0.9379ms)
✔ cloud sync tabs gate public-room push is visible to site2 public-room pull (2.8711ms)
✔ cloud sync tabs gate site2 ignores local open fallback when cloud row is missing (0.5963ms)
✔ cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling (1.6304ms)
✔ cloud sync tabs gate direct push reports controller-only canonically on site2 (0.6641ms)
✔ cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App (1.0518ms)
✔ cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state (6.5062ms)
✔ [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam (2994.8961ms)
✔ [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations (2.6446ms)
✔ [cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads (1.6843ms)
✔ [cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation (0.3034ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3331.8371

```

### [PASS] Playwright smoke suite listing

- id: `e2e-list`
- category: `e2e`
- command: `npm run e2e:smoke:list`
- status: **passed**
- exit code: `0`
- duration: `1184ms`

#### stdout

```text

> e2e:smoke:list
> playwright test -c playwright.config.ts --list

Listing tests:
  [setup] › app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers
  [chromium] › authoring_builds.spec.ts:478:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical
  [chromium] › authoring_builds.spec.ts:545:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:608:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:665:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:720:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:775:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable
  [chromium] › authoring_builds.spec.ts:814:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:880:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated
  [chromium] › canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical
  [chromium] › cloud_sync_reconnect.spec.ts:29:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable
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
Total: 26 tests in 7 files

```

### [PASS] Playwright browser preflight

- id: `e2e-preflight`
- category: `e2e`
- command: `npm run e2e:smoke:preflight`
- status: **passed**
- exit code: `0`
- duration: `1505ms`

#### stdout

```text

> e2e:smoke:preflight
> node tools/wp_playwright_preflight.js

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

```

### [PASS] Playwright smoke run

- id: `e2e-smoke-run`
- category: `e2e`
- command: `npm run e2e:smoke`
- status: **passed**
- exit code: `0`
- duration: `269169ms`

#### stdout

```text

> e2e:smoke
> node tools/wp_playwright_preflight.js && playwright test -c playwright.config.ts

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

Running 26 tests using 4 workers

  ✓   1 [setup] › tests\e2e\app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers (15.5s)
  ✓   5 [chromium] › tests\e2e\canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical (31.4s)
  ✓   4 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:29:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable (32.5s)
  ✓   2 [chromium] › tests\e2e\resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry (33.9s)
  ✓   3 [chromium] › tests\e2e\authoring_builds.spec.ts:478:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical (47.2s)
  ✓   8 [chromium] › tests\e2e\resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state (21.1s)
  ✓   6 [chromium] › tests\e2e\smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable @critical (26.1s)
  ✓   7 [chromium] › tests\e2e\user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics (45.8s)
  ✓  11 [chromium] › tests\e2e\smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name @critical (23.9s)
  ✓  10 [chromium] › tests\e2e\resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry (35.0s)
  ✓   9 [chromium] › tests\e2e\authoring_builds.spec.ts:545:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load (49.4s)
  ✓  13 [chromium] › tests\e2e\smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly (15.6s)
  ✓  12 [chromium] › tests\e2e\user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state (31.1s)
  ✓  15 [chromium] › tests\e2e\smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar @critical (20.9s)
  ✓  14 [chromium] › tests\e2e\authoring_builds.spec.ts:608:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load (27.2s)
  ✓  17 [chromium] › tests\e2e\smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive (18.1s)
  ✓  16 [chromium] › tests\e2e\user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip (29.8s)
  ✓  18 [chromium] › tests\e2e\authoring_builds.spec.ts:665:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load (20.9s)
  ✓  20 [chromium] › tests\e2e\authoring_builds.spec.ts:720:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load (20.4s)
  ✓  19 [chromium] › tests\e2e\user_paths.spec.ts:274:3 › Playwright real user paths › cabinet authoring options survive project roundtrip (30.1s)
  ✓  21 [chromium] › tests\e2e\authoring_builds.spec.ts:775:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable (16.6s)
  ✓  22 [chromium] › tests\e2e\user_paths.spec.ts:324:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout maps (15.2s)
  ✓  24 [chromium] › tests\e2e\user_paths.spec.ts:366:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout scenario matrix (17.6s)
  ✓  23 [chromium] › tests\e2e\authoring_builds.spec.ts:814:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load (25.8s)
  ✓  26 [chromium] › tests\e2e\authoring_builds.spec.ts:880:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated (33.7s)
  ✓  25 [chromium] › tests\e2e\user_paths.spec.ts:413:3 › Playwright real user paths › settings backup import and restore-last-session recover real user state (40.3s)

  26 passed (4.4m)

```
