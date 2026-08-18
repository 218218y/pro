# Final Verification Summary

- schema_version: `1`
- run_id: `9d6b052c-237e-4e21-bc80-c69283358b94`
- generated_at: 2026-08-18T07:42:19.159Z
- workspace: `C:\Users\יעקב\Downloads\pro\latestzip`
- source_digest: `sha256:166aee73c8bf8cf58355c5def26520d5e75ea55db9ed6c988082a94256068eaf`
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
- duration: `1724ms`

#### stdout

```text
✔ generated report catalog classifies source-derived reports separately from release evidence (3.0149ms)
✔ generated report default selection excludes release evidence while explicit selection stays strict (0.6125ms)
✔ generated report selection rejects unknown ids and preserves catalog order (0.3877ms)
✔ generated report comparison ignores timestamps but catches semantic drift (9.2968ms)
✔ source identity is deterministic and changes when owned source changes (100.6868ms)
✔ lane catalog identity covers lane execution and profile membership (0.8456ms)
✔ verification payload binds results to source lane catalog and explicit selection (60.5394ms)
✔ verification validation fails closed for source drift lane drift and summary tampering (132.9501ms)
✔ state compatibility rejects legacy or stale payloads with a reset instruction (78.5859ms)
✔ summary and final status preserve environment blockers without treating them as clean proof (0.1927ms)
✔ empty and partial selections cannot report a successful closeout (49.6467ms)
✔ verification summary contract derives markdown from one validated JSON payload (77.7487ms)
✔ verification summary contract refuses to canonize a stale report (65.2635ms)
✔ verification summary contract rejects a successful focused profile as final proof (60.3328ms)
✔ closeout resolves npm through its JS CLI without a shell command fallback (3.2256ms)
✔ closeout lanes keep stable ids and include critical families (0.2761ms)
✔ group-backed closeout lanes execute canonical test groups directly (3.7126ms)
✔ overlay export closeout lane stays direct and uses a live canonical typecheck mode (2.1017ms)
✔ closeout profiles stay stable and Order PDF remains fully catalog-backed (0.2264ms)
✔ normalize args collects profiles categories lane ids skips log dir and state options (0.3222ms)
✔ closeout CLI rejects unknown flags missing values and unknown selectors (0.7158ms)
✔ final report eligibility requires a complete clean default closeout (531.149ms)
✔ select lanes respects profile resume and skip while preserving order (0.1953ms)
✔ environment classifier recognizes playwright/browser failures (0.1947ms)
✔ runner classifier recognizes wrapper and sandbox failures (0.1593ms)
✔ summary separates passed failures environment-blocked and runner-blocked lanes (0.0974ms)
✔ state helpers merge by lane id and preserve canonical order (0.146ms)
✔ state helpers roundtrip versioned payloads and return null when the file is missing (425.9732ms)
✔ reset-style empty state is explicitly not-run rather than passed (409.4207ms)
✔ state file resolves to explicit flag or default artifact path (0.0984ms)
✔ browser-dependent lanes inherit environment-blocked from preflight (0.3623ms)
✔ closeout lane logs replace stale streams and grouped-step evidence (124.1944ms)
✔ report paths stay under docs and state path stays under artifacts (0.1433ms)
ℹ tests 33
ℹ suites 0
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1616.6367

```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `node tools/wp_test_group.mjs toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `10432ms`

#### stdout

```text
✔ [actions.patch types] fixture uses native @ts-expect-error contracts (2.8805ms)
✔ [actions.patch types] public/backend patch contract fixture typechecks through tsc (658.597ms)
✔ [actions.patch types] fixture is safe if discovered by the generic runtime runner (314.4101ms)
✔ package-lock resolved tarballs stay on public registries (6.681ms)
✔ ts runtime loader loads a plain TS module (147.1409ms)
✔ ts runtime loader resolves local .js imports to TS files (34.928ms)
✔ ts runtime loader supports object mocks by exact specifier (7.504ms)
✔ ts runtime loader supports dynamic mocks with loader context (8.2402ms)
✔ ts runtime loader cache returns the same module instance (7.0286ms)
✔ ts runtime loader transform errors include the fixture filename (13.2988ms)
✔ ts runtime loader evaluate errors include the fixture filename (9.6215ms)
✔ runtime tests do not reintroduce per-test TS VM loaders (169.7165ms)
✔ AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers (5.1609ms)
✔ AST adapter preserves import, dynamic import, member, optional-chain, and meta-property shapes for callers (3.2837ms)
✔ AST adapter keeps token/code-line metrics independent from tool callers (1.5641ms)
✔ AST adapter centralizes type-hardening AST counts (0.9122ms)
✔ AST adapter exposes syntax error diagnostics without TypeScript compiler API (1.0619ms)
✔ no project tool/test/runtime source imports TypeScript directly (573.8391ms)
✔ AST adapter returns injected adapter instances without exposing TypeScript module wrapping (0.2574ms)
✔ build-dist args parsing keeps clean/assets/help/unknown policy (2.3972ms)
✔ build-dist path resolution stays rooted under project dist (0.5419ms)
✔ static asset copy mirrors html/runtime/public assets into dist (50.9484ms)
✔ static asset copy keeps repository tests out of dist outputs (7.7782ms)
✔ static asset copy fails when the canonical runtime config module is missing (4.7706ms)
✔ build-dist TypeScript resolver requires local TypeScript by default (6.6055ms)
✔ build-dist TypeScript resolver allows system tsc only in explicit manual mode (2.373ms)
✔ build-dist flow fails clearly instead of using system tsc when local TypeScript is missing (2.762ms)
✔ build-dist rejects unknown options in CI/release mode (1.1249ms)
✔ build-dist retries once without tsbuildinfo when incremental build misses entry (10.5478ms)
✔ bundle arg parsing preserves out/sourcemap/minify/rebuild policy (3.2015ms)
✔ bundle path resolution derives out dir and stale tmp cleanup dir canonically (0.3713ms)
✔ bundle dist freshness requests rebuild when entry/build info are stale or missing (11.8121ms)
✔ bundle TypeScript resolver refuses system tsc unless manual fallback is explicit (3.7902ms)
✔ bundle dist build fails before probing system tsc when local TypeScript is missing (2.1874ms)
✔ bundle artifact cleanup removes numbered chunk wrappers only (4.8058ms)
✔ bundle emit writes entry code, sourcemap comment, and extra chunks canonically (33.3931ms)
✔ bundle build config keeps strict entry signatures and named chunk policy (0.6816ms)
✔ bundle build config maps scheduler debug stats to full implementation outside client mode (0.3513ms)
✔ bundle emit writes build-mode marker next to the entry bundle (5.4081ms)
✔ check arg parsing preserves baseline/json/gate/strict flags (2.1607ms)
✔ check mode detection prefers js first and falls back to esm (2.2137ms)
✔ check syntax runner reports malformed js files (138.4543ms)
✔ check policy stats count legacy/root needles by directory (25.3995ms)
✔ check gate/strict results report regressions and clean strict state (0.5025ms)
✔ check json report preserves file and policy summary fields (0.3002ms)
✔ lint architecture contracts block new restricted imports, globals, and App bag access (6.6667ms)
✔ lint architecture contracts keep viewer measurement geometry behind capability DI (1.2941ms)
✔ lint architecture contracts keep viewer measurement flow and facade on the feature runtime boundary (1.5768ms)
✔ lint architecture contracts keep carcass shell geometry on the canonical typed IR boundary (1.242ms)
✔ lint architecture contracts keep corner cornice planners on plan-first typed IR (0.5978ms)
✔ lint architecture contracts keep part-hover preview clients behind the typed protocol runtime (1.2236ms)
✔ lint architecture contracts keep planar reflector lifecycle ownership separated (2.1118ms)
✔ lint architecture contract has no unbaselined or stale violations in the current tree (9889.0567ms)
✔ lint architecture baseline count matches the json baseline file (1.0356ms)
✔ lint architecture contracts fail a new violation that is not in baseline (9.0688ms)
✔ lint architecture contracts allow a violation only when it is explicitly baselined (7.9792ms)
✔ lint architecture contracts fail when a baseline entry is stale (7.4702ms)
✔ lint architecture baseline is loaded from json, not hardcoded in the tool (0.3874ms)
✔ JS-only
...
[trimmed 15424 chars]
```

### [PASS] Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `3614ms`

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
- duration: `9067ms`

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] test-group:perf-toolchain-core
============================================================

✔ check arg parsing preserves baseline/json/gate/strict flags (2.3404ms)
✔ check mode detection prefers js first and falls back to esm (2.3963ms)
✔ check syntax runner reports malformed js files (67.8154ms)
✔ check policy stats count legacy/root needles by directory (3.1212ms)
✔ check gate/strict results report regressions and clean strict state (0.291ms)
✔ check json report preserves file and policy summary fields (0.1383ms)
✔ perf smoke args parse lanes, scripts, baseline paths, and flags canonically (2.4198ms)
✔ perf smoke help text advertises default lanes and baseline flags (0.4647ms)
✔ perf smoke planner resolves verify lanes and dedupes script overlap (1.0469ms)
✔ perf smoke resolves the stable Node-only profile directly and keeps other scripts on npm fallback (1.1464ms)
✔ perf smoke baseline evaluation detects regressions and profile drift (2.0122ms)
✔ perf smoke markdown report keeps durable tool-owned baseline anchors (1.7112ms)
✔ perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow (12.5908ms)
✔ [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules (4.4393ms)
✔ [toolchain] bundle keeps one thin entrypoint plus canonical owner modules (1.003ms)
✔ [toolchain] check keeps one thin entrypoint plus canonical owner modules (0.7291ms)
✔ [toolchain] release keeps one thin entrypoint plus canonical owner modules (1.1262ms)
✔ [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules (0.9049ms)
✔ [toolchain] test keeps one thin entrypoint plus canonical owner modules (0.8064ms)
✔ [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules (1.6457ms)
✔ [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules (0.6576ms)
✔ [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules (0.7033ms)
✔ [toolchain] verify keeps one thin entrypoint plus canonical owner modules (0.7111ms)
✔ [toolchain] verify-parallel keeps one thin entrypoint plus canonical owner modules (0.5501ms)
✔ verify lane state parses canonical lane names plus print/dry-run/no-dedupe flags (2.2207ms)
✔ verify lane catalog uses typed tasks and dedupes multi-lane plans (0.6816ms)
✔ verify lane planner reports canonical task order for single and multi-lane runs (0.3833ms)
✔ verify lane flow dispatches test groups directly and package scripts through npm (0.6622ms)
✔ verify lane flow dedupes overlapping typed tasks across multiple lanes by default (0.5011ms)
✔ verify lane help text advertises the canonical lane catalog and multi-lane support (0.4477ms)

⚠️  Prettier check: formatting differences found (warning only).

❌ Prettier check failed in gate mode (formatting differences found).
✔ verify parallel args preserve verify flags and local concurrency controls (2.2147ms)
✔ verify parallel plan builds once and gives test shards isolated reports (1.0603ms)
✔ verify parallel flow treats prettier diffs as warnings outside gate mode (1.8691ms)
✔ verify parallel flow fails prettier diffs in gate mode and skips bundle phase (0.8347ms)

============================================================
[WardrobePro] build dist (no assets)
============================================================

✔ verify args parsing preserves gate/no-build/skip-bundle/soft-format policy (2.354ms)
✔ format check classification warns in normal mode and fails in strict gate mode (0.5929ms)
✔ ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise (7.1575ms)
✔ verify flow orders core checks and skips bundle commands when requested (1.4724ms)
✔ verify flow runs both client release bundle targets in order when bundling is enabled (1.3708ms)
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 201.5074

============================================================
[WP Perf Smoke] test-group:ui-react-import-hardening-contracts
============================================================

✔ ui react import hardening removes legacy React namespace access from pure ts modules (25.7341ms)
✔ ui react import hardening uses explicit named type imports for event-heavy contracts (0.3226ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 97.3443

============================================================
[WP Perf Smoke] test-group:ui-react-jsx-hardening-contracts
============================================================

✔ ui react jsx import hardening removes legacy default React imports and namespace access from tsx modules (7.9786ms)
✔ ui react jsx import hardening uses explicit named imports in representative components (0.266ms)
ℹ tes
...
[trimmed 1258 chars]
```

### [PASS] Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `8636ms`

#### steps

- [PASS] overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 146ms)
- [PASS] typecheck project: `node tools/wp_typecheck.js --mode project` (passed, 580ms)
- [PASS] layer contracts: `node tools/wp_layer_contract.js` (passed, 6912ms)
- [PASS] public api contracts: `node tools/wp_public_api_contract.js` (passed, 998ms)

### [PASS] Order PDF overlay core (canonical group)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-overlay-core`
- status: **passed**
- exit code: `0`
- duration: `2107ms`

#### stdout

```text
✔ order pdf export actions honor image/gmail busy flags before starting another action (7.5214ms)
✔ order pdf interaction handlers report pointer-cancel failures instead of throwing (0.6283ms)
✔ order pdf export actions reuse cached interactive blob while draft signature is unchanged (1.4333ms)
✔ getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error (2.5461ms)
✔ getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess (0.5983ms)
✔ getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text (0.2674ms)
✔ applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists (0.5519ms)
✔ readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing (2.0702ms)
✔ loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state (0.5663ms)
✔ refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it (0.4338ms)
✔ resolveOrderPdfInlineConfirmAction returns the selected follow-up draft (0.2477ms)
✔ order pdf draft effects preserves a canonical edited details pair (2.8809ms)
✔ order pdf draft effects derives the seed from canonical text when auto details are empty (0.2636ms)
✔ order PDF editor mode starts from externally-owned sketch visibility (1.9642ms)
✔ PDF annotation waits for an open sketch preview to close (0.3739ms)
✔ an externally opened sketch preview preempts PDF page annotation (0.1907ms)
✔ requesting sketch preview closes PDF annotation before the external toggle resolves (0.1686ms)
✔ canceling a pending PDF request does not reopen it after the sketch closes (0.2108ms)
✔ order pdf stage/file interactions keep close intent and PDF validation behavior canonical (2.8485ms)
✔ order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state (1.9628ms)
✔ getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes (1.1388ms)
✔ getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks (1.5377ms)
✔ bindExportApiFromModule captures the app once and returns null for missing module/app (0.3983ms)
✔ order pdf details line helpers parse and collect canonical keyed rows (2.9737ms)
✔ order pdf details line helpers preserve inline tails and positioned extras (1.2603ms)
✔ order pdf text fallback html decoder preserves newlines and common entities without a document (1.3657ms)
✔ order pdf text public seam exposes the canonical empty draft defaults (0.8921ms)
✔ order pdf text merge falls back to exact base replacement when no marker document is available (0.4226ms)
✔ order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam (3.1317ms)
✔ order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear (1.4608ms)
✔ order pdf merge support resolves clean detected regions without preserving stale manual leftovers (0.5868ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2014.4275

```

### [PASS] Order PDF PDF-render batch (canonical group)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-pdf-render`
- status: **passed**
- exit code: `0`
- duration: `2136ms`

#### stdout

```text
✔ [order-pdf] prepared details split can be painted without re-wrapping (3.046ms)
✔ [order-pdf] prepared layout preserves wrapped lines and visible max-line window (0.3398ms)
✔ [order-pdf] image-pdf details text uses the canonical touched semantics (0.2975ms)
✔ order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled (21.0619ms)
✔ order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled (5.9765ms)
✔ order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled (4.2231ms)
✔ order pdf pdf-import clears saved form text and stale widget appearances for editor background (14.8496ms)
✔ order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails (2.3768ms)
✔ order pdf pdf-import extracts generated field names through the canonical document-field runtime (16.6939ms)
✔ order pdf pdf-import reads bytes from file-like objects and tolerates read failures (0.3176ms)
✔ order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page (3.0588ms)
✔ order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime (0.9141ms)
✔ order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer (0.7357ms)
✔ order pdf image-pdf export writes hidden import fields that load back into the editor (7.3904ms)
✔ order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path (3.0965ms)
✔ order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup (0.5697ms)
✔ cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly (0.9126ms)
✔ loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document (0.5186ms)
✔ loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves (0.2763ms)
✔ order pdf render helpers treat destroyed/aborted worker errors as expected cancellations (3.0295ms)
✔ loadOrderPdfFirstPage clones source bytes before handing them to pdf.js (1.7539ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2028.4646

```

### [PASS] Order PDF sketch batch (canonical group)

- id: `order-pdf-sketch`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-sketch`
- status: **passed**
- exit code: `0`
- duration: `1850ms`

#### stdout

```text
✔ [history-ui] suspended history shortcuts are detected from the active overlay element (1.0594ms)
✔ [history-ui] suspended history shortcuts fall back to a document-level overlay marker (0.2172ms)
✔ [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags (3.8803ms)
✔ [order-pdf] refresh-auto preserves sketch annotations while refreshing project details (1.1356ms)
✔ [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport (0.7656ms)
✔ [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space (0.1178ms)
✔ [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot (0.6918ms)
✔ [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports (0.1132ms)
✔ [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes (0.134ms)
✔ [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads (0.3431ms)
✔ [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes (0.1253ms)
✔ [order-pdf] sketch canvas frame only commits once a real 2d context exists (0.3143ms)
✔ [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically (2.07ms)
✔ [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key (0.634ms)
✔ [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion (0.1731ms)
✔ [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect (0.1771ms)
✔ [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point (0.2268ms)
✔ [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths (0.997ms)
✔ [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history (0.2332ms)
✔ [order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts (0.4425ms)
✔ [order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically (0.3346ms)
✔ [order-pdf] sketch panel runtime reads drawing rects once from the measured host surface (0.2468ms)
✔ [order-pdf] sketch preview reveal scrolls the editor stage just enough to expose created images (0.1722ms)
✔ [order-pdf] sketch preview reveal does not scroll when the panel is already visible (0.0865ms)
✔ [order-pdf] sketch preview reveal uses the stage scroll container instead of the page window (0.196ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after success (1.0551ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after failure (1.215ms)
✔ [order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states (0.2668ms)
✔ [order-pdf] sketch preview session restores the original doors-open state after success (0.3125ms)
✔ [order-pdf] sketch preview session snapshot captures and restores the original camera pose (1.0162ms)
✔ [order-pdf] sketch preview session restores the original camera pose after success (0.3405ms)
✔ [order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z (1.0962ms)
✔ [order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew (0.2951ms)
✔ [order-pdf] sketch history shortcuts are always consumed while the sketch panel is open (0.2087ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1757.5323

```

### [PASS] Order PDF export overlay batch (canonical group)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-overlay`
- status: **passed**
- exit code: `0`
- duration: `1748ms`

#### stdout

```text
✔ loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data (1.7883ms)
✔ exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download (0.3537ms)
✔ exportOrderPdfImageWithDeps reports busy before building another image PDF (0.2134ms)
✔ exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing (0.1954ms)
✔ loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast (0.5014ms)
✔ exportOrderPdfInteractiveWithDeps preserves the real export failure detail (0.1937ms)
✔ loadOrderPdfIntoEditorWithDeps treats canonical html-only extracted details as found fields (0.3461ms)
✔ loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late (0.3583ms)
✔ order pdf overlay export ops fail fast when rasterization has no document seam (1.4567ms)
✔ order pdf overlay export ops build image attachments through the canonical attachment seam (3.7233ms)
✔ order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages (2.0242ms)
✔ order pdf overlay image rasterization restores first-page annotations clipped inside repainted PDF text boxes (1.5955ms)
✔ order pdf export single-flight reuses duplicate same-key work per app and clears after completion (1.5661ms)
✔ order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps (0.3359ms)
✔ order pdf export single-flight derives stable load keys and maps them back to action kinds (0.3484ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1643.1087

```

### [PASS] Order PDF export builders batch (canonical group)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-builders`
- status: **passed**
- exit code: `0`
- duration: `2185ms`

#### stdout

```text
✔ resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values (0.7266ms)
✔ resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so (0.2474ms)
✔ resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides (1.8983ms)
✔ buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable (398.7826ms)
✔ captureOrderPdfCompositeImages applies sketch annotations after base composite capture (2.9574ms)
✔ buildOrderPdfDocumentResult embeds the primary PDF page annotation layer at high raster density (1.8659ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2086.1529

```

### [PASS] Order PDF export capture batch (canonical group)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-capture`
- status: **passed**
- exit code: `0`
- duration: `1871ms`

#### stdout

```text
✔ order pdf capture cache signature falls back cleanly when state is missing or invalid (1.2949ms)
✔ order pdf capture cache returns cloned bytes instead of live cache buffers (0.9505ms)
✔ order pdf capture cache reuses sketch base assets while signature is unchanged (0.6839ms)
✔ order pdf capture cache ignores editor/runtime ephemera but invalidates on canonical config changes (0.3059ms)
✔ order pdf capture cache signature ignores sketch-only annotation changes (0.8491ms)
✔ export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas (2.2464ms)
✔ export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures (0.507ms)
✔ order PDF render/sketch composite preserves chest live viewport and screenshot note mapping (1.784ms)
✔ order PDF open/closed composite preserves corner live viewport and screenshot note mapping (0.8073ms)
✔ export order pdf ops factory exposes stable draft/export surface (2.4558ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1764.2263

```

### [PASS] Order PDF export text batch (canonical group)

- id: `order-pdf-export-text`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-text`
- status: **passed**
- exit code: `0`
- duration: `1810ms`

#### stdout

```text
✔ createOrderPdfRenderAnnotationLayerPngOp renders first-page PDF annotations to PNG bytes (2.0223ms)
✔ listOrderPdfSketchStrokes keeps only valid strokes for the requested page (0.1744ms)
✔ paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas (0.2641ms)
✔ paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser (0.148ms)
✔ compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer (0.4035ms)
✔ paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite (0.552ms)
✔ export order pdf text ops compose details, bidi, and layout behavior from one canonical seam (3.95ms)
✔ export order pdf text ops keep canonical draft defaults and bidi stabilization behavior (1.506ms)
✔ export order pdf text uses wardrobe-type depth fallback only when raw depth is missing (0.3323ms)
✔ export order pdf text includes classic cornice only when the main cornice flag is enabled (0.2043ms)
✔ export order pdf text omits cornice when the main cornice flag is disabled (0.2082ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1695.198

```

### [PASS] Sketch manual/hover (canonical group)

- id: `sketch-manual-hover`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-manual-hover`
- status: **passed**
- exit code: `0`
- duration: `1719ms`

#### stdout

```text
✔ drawer remove plan resolves exact typed targets and rejects ambiguous or cross-module hits (3.5225ms)
✔ drawer remove plan mutates only the resolved sketch external target (1.1734ms)
✔ drawer remove plan applies sketch internal and standard external mutations without cross-family spillover (0.7415ms)
✔ sketch internal removal uses exact IDs regardless of overlap, list order, or cassette slot (0.8725ms)
✔ sketch internal resolver rejects part identities that do not encode the exact module scope (0.283ms)
✔ sketch external removal never crosses module, box, or list scopes for duplicate IDs (0.3386ms)
✔ ambiguous duplicate records and duplicate box identities are rejected without mutation (0.1893ms)
✔ drawer remove commit owns the structural patch boundary and applies one immutable plan (0.4471ms)
✔ drawer remove commit reports false when the patch is skipped or no target changes (0.3636ms)
✔ manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner (3.4838ms)
✔ manual-layout flow skips auto-filled shelves colliding with sketch drawers and warns once (2.7599ms)
✔ manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata (0.672ms)
✔ manual-layout sketch hover match state accepts a recent matching hover snapshot (2.4397ms)
✔ manual-layout sketch hover match state rejects stale or mismatched hover snapshots (0.4907ms)
✔ manual-layout sketch hover match state rejects records that still carry retired host identity fields (0.502ms)
✔ manual-layout hover intent readers decode canonical versioned commands (3.1957ms)
✔ manual-layout hover intent readers reject malformed and non-exact command payloads (0.4168ms)
✔ manual-layout command decoder rejects missing, unknown, and extra fields for every mutation family (1.0154ms)
✔ manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides (4.7279ms)
✔ manual-layout hover module context falls back to the corner root config when no cell config exists (2.59ms)
✔ manual-layout hover base context rejects missing or invalid module bounds (0.8389ms)
✔ manual-layout hover base context preserves storage clamp pad and hit-Y bounds (2.59ms)
✔ manual-layout hover base context preserves box defaults, clamps, and positive overrides (0.728ms)
✔ manual-layout hover base context preserves shelf parsing and centimeter conversion (0.5356ms)
✔ manual-layout hover base context preserves storage defaults, minimum, span cap, and center clamp (0.4876ms)
✔ manual-layout module box preview routes shelf hover through the focused box owner (7.8944ms)
✔ manual-layout module stack preview routes ext drawers through the focused stack owner (5.2318ms)
✔ manual-layout shared remove eps exports retain number shape and focused-owner values (0.2296ms)
✔ manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools (8.5418ms)
✔ manual-layout sketch hover targets free-box content before a module selector behind it (4.0034ms)
✔ manual-layout sketch hover falls back to standalone free placement when no selector is hit (1.1877ms)
✔ manual-layout sketch external drawer hover marks standard external drawers for removal only (1.0733ms)
✔ manual-layout sketch internal drawer hover ignores standard external drawers (0.4386ms)
✔ manual-layout free-box external drawer hover prefers the drawer stack over a nearby shelf removal (4.1856ms)
✔ module surface hover writes shelf add intent so click follows the hover preview (5.8972ms)
✔ module surface hover writes rod add intent so stale shelf-remove hover cannot steal the click (1.0254ms)
✔ module preview flow probes existing shelf removal before drawer stack add previews (1.1119ms)
✔ existing vertical remove helper is a no-op when nothing removable is under the cursor (0.532ms)
✔ door action hover state resolves the nearest door leaf owner with metrics (0.5861ms)
✔ manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors (3.3647ms)
✔ manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool (3.7782ms)
✔ manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout (0.5676ms)
✔ recent sketch hover matching honors tool, age, free-placement, and host identity together (3.382ms)
✔ recent sketch hover matching rejects retired or malformed host identity records (0.5192ms)
✔ manual tool access prefers canonical mode-state value before runtime tools fallback (1.3236ms)
✔ manual tool access falls back to runtime tools when mode-state tool is absent (0.2934ms)
✔ sketch-free host falls back to internal grid maps before the zero-door hinged default host (2.1617ms)
✔ sketch-free host uses the hinged zero-door fallback only when no config or grid host exists (0.3008ms)
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1620.4619

```

### [PASS] Sketch box/hover (canonical group)

- id: `sketch-box-hover`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-box-hover`
- status: **passed**
- exit code: `0`
- duration: `1455ms`

#### stdout

```text
✔ sketch-box door preview stays inert for hinge toggles when the active segment has no door (2.5761ms)
✔ sketch-box door preview resolves canonical remove metadata for an existing double-door pair (19.0244ms)
✔ sketch-box door preview keeps explicit hinge/remove metadata for a single existing door (0.7529ms)
✔ sketch-box door preview preserves material fallback and edge-extension boundaries (1.6237ms)
✔ sketch-box door preview preserves focused depth, back-clearance, remove-offset, and command payloads (0.6028ms)
✔ sketch-box doors upsert single-door records through the canonical id factory and segment placement seam (2.7649ms)
✔ sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair (20.9166ms)
✔ sketch-box doors remove a focused segment door without disturbing the other segment (0.6517ms)
✔ sketch-box doors treat rows inside the same divided column as independent cells (2.6316ms)
✔ sketch-box doors preserve stored groove line counts when rewriting door records (1.4847ms)
✔ resolved module boxes ignore free-placement items and the requested ignoreBoxId (2.0379ms)
✔ resolved module boxes reject string-encoded live geometry (0.1661ms)
✔ vertical center clamp respects module bounds even when desired center is far outside range (0.1754ms)
✔ placement resolution can ignore the edited box id instead of blocking on itself (0.4798ms)
✔ placement reports blocked when overlap chain reaches the module ceiling and floor (0.7804ms)
✔ overlap primitive still allows exact edge contact without treating it as overlap (0.1185ms)
✔ placement resolution can be confined to the pointer slot instead of jumping across blockers (0.4796ms)
✔ placement resolution reports blocked when vertical content blockers leave no valid box slot (0.2264ms)
✔ sketch-box runtime parses width/depth overrides and rejects unrelated tools (2.8807ms)
✔ sketch-box runtime geometry center-snaps and width-clamps inside the module span (0.4868ms)
✔ sketch-box runtime geometry preserves shell minimums, center snap boundaries, and finite fallbacks (0.311ms)
✔ free-box geometry preserves fallback clamping without capping explicit dimensions (0.3456ms)
✔ sketch-box runtime geometry rejects string-encoded live overrides (0.1679ms)
✔ sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match (0.4822ms)
✔ sketch-box runtime hit scan rejects string-encoded live box geometry (0.2242ms)
✔ sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized (0.8374ms)
✔ sketch-box free-placement commit does not derive floorY from string measurements (0.3607ms)
✔ sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column (1.0191ms)
✔ sketch-box free-placement commit clears hover when the canonical commit finishes without next hover (0.4624ms)
✔ sketch-box free-placement commit stays inert when no canonical host is available (0.2248ms)
✔ sketch-box door visuals forward mirror state, mirror layout, effective frame style, and deep pick meta through the special visual path (12.2824ms)
✔ sketch-box door visuals use styled profile visuals for in-cabinet whole box doors (0.4489ms)
✔ free-box click uses canonical units and Shell Geometry minimums without changing numeric behavior (2.6338ms)
✔ free-box click preserves missing and invalid optional-dimension handling (0.5721ms)
✔ Interior-tab Sketch Box defaults remain plain integer centimeters with stable tool parsing (0.8623ms)
✔ free-box click fallback does not turn a module hit into a free-placement box (0.2005ms)
✔ free-box click fallback still creates a free-placement box when no module was hit (0.2998ms)
✔ free-box click fallback rejects string-encoded plane-hit geometry (0.1759ms)
✔ free-box click preserves a real recent free-placement hover even when a module is behind it (0.4418ms)
✔ sketch external drawers hover context loads persisted module stacks for remove/overlap handling (8.1038ms)
✔ free-box content click stays on the free box even when a wardrobe module is behind it (0.7958ms)
✔ free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks (3.0725ms)
✔ module sketch hover blocks collisions between internal and external drawer stacks (0.5625ms)
✔ free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind (0.7787ms)
✔ module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit (0.9676ms)
✔ module sketch external drawers preview reads the selector front envelope instead of the inner cavity only (0.5862ms)
ℹ tests 46
ℹ suites 0
ℹ pass 46
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1341.1337

```

### [PASS] Sketch free-boxes (canonical group)

- id: `sketch-free-boxes`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-free-boxes`
- status: **passed**
- exit code: `0`
- duration: `1647ms`

#### stdout

```text
✔ manual-layout free-box shelf grid scopes five shelves to the active split cell (2.5921ms)
✔ manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short (0.224ms)
✔ manual-layout free-box shelf grid commit writes shelves into the no-main free box (3.2598ms)
✔ manual-layout free-box shelf grid blocked commit consumes click without mutating (0.7561ms)
✔ manual-layout free-box shelf grid rejects partial hover records without mutating content (0.278ms)
✔ manual-layout free-box shelf grid blocks shelves that would collide with an existing rod (0.4785ms)
✔ manual-layout free-box rod hover can target an existing shelf for removal (1.2205ms)
✔ manual-layout free-box shelf edit can target an existing rod or storage barrier for removal (0.7951ms)
✔ manual-layout free-box commits cross-kind removal hovers from shelf and rod tools (1.6868ms)
✔ manual-layout free-box storage removal hover covers the whole existing barrier height (0.5503ms)
✔ manual-layout shelf-grid defaults and span boundary come from focused owners (0.5879ms)
✔ manual-layout preset defaults preserve focused grid, rod, storage and material geometry (0.7352ms)
✔ manual-layout brace plan keeps exact tolerance, nearest identity, cell filter and variant depth (0.5359ms)
✔ manual-layout content hover preserves default thickness, storage height and preview order (2.6824ms)
✔ manual-layout shelf-grid add remains a layout preview with canonical hide/set order (1.7041ms)
✔ brace hover preserves brace clearance and regular minimum-width branches (0.7957ms)
✔ manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it (0.629ms)
✔ preset layout free-box plan maps storage shortcut into active split cell contents (0.3194ms)
✔ preset layout shortcut hover and click target the free box instead of the wardrobe behind it (1.7414ms)
✔ brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe (0.6935ms)
✔ sketch-free box content preview short-circuits unsupported content kinds before target scanning (1.6097ms)
✔ sketch-free box content preview keeps door-hinge hover inert when the active segment has no door (2.5321ms)
✔ sketch-free box content preview returns canonical double-door removal metadata for an existing pair (12.7243ms)
✔ sketch-free external drawer preview blocks construction on existing free-box shelf content (4.4335ms)
✔ sketch-free vertical preview keeps removal hover available while the active tool is sketch external drawers (1.9563ms)
✔ sketch-free shelf removal accepts direct shelf-board hits with the same generous tolerance as wardrobe shelves (0.6166ms)
✔ sketch-free placement hover record keeps canonical host/free-placement fields (2.8847ms)
✔ sketch-free placement commit adds a free-placement box through the canonical modules patch seam (3.5713ms)
✔ sketch-free placement commit rejects string-encoded internal hover geometry (0.428ms)
✔ sketch-free placement remove fails closed when its target id is missing (0.3767ms)
✔ sketch-free placement content commit routes free-placement door removal through the canonical content seam (4.502ms)
✔ sketch-free placement content commit consumes blocked no-room hovers without mutating (2.2829ms)
✔ sketch-free placement ext-drawer removal also removes regular external drawers in the same free box (1.3901ms)
✔ sketch-free vertical tools commit cross-kind vertical-content removal hovers (1.8648ms)
✔ sketch-free stack tools commit existing vertical-content removal hovers before adding drawers (0.7532ms)
✔ sketch-free drawer commit consumes a room-column collision without mutating the free box (3.3574ms)
✔ sketch-free regular external drawers can add a shoe drawer without falling back to module drawers (2.933ms)
✔ sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top (1.3213ms)
✔ sketch-free regular external drawers update shoe and regular count independently in the same cell (1.2923ms)
✔ sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks (2.8773ms)
✔ sketch free surface target scan follows nearest ray intersection instead of free-box array order (0.6262ms)
✔ sketch free divider target scan projects fallback pointer to the box front plane (0.4343ms)
✔ side-wall free-box content target keeps the remapped rotated hit instead of projecting to a wardrobe Z plane (0.3676ms)
✔ sketch free surface target scan rejects string-encoded free-box geometry (0.315ms)
✔ sketch free content target scan projects profile-door hits to the canonical box front plane (0.455ms)
✔ sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry (2.1923ms)
✔ sketch free base adornment preview rejects string-encoded current base dimensions (2.4694ms)
✔ sketch free cornice adornment keeps toggle, fallback, focused geometr
...
[trimmed 4034 chars]
```

### [PASS] Sketch render/visuals (canonical group)

- id: `sketch-render-visuals`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-render-visuals`
- status: **passed**
- exit code: `0`
- duration: `1121ms`

#### stdout

```text
✔ render sketch box fronts reuses one mirror material across mirrored external drawers (6.9479ms)
✔ render sketch box fronts reject string-encoded live external drawer positions (0.2751ms)
✔ render sketch box fronts do not parse string-encoded live external drawer counts (0.61ms)
✔ render sketch box external drawers flush a top-anchored free-box stack to the box face edge (0.6299ms)
✔ interior sketch style, feature flags, and divider state read only canonical input fields (2.3719ms)
✔ interior sketch input contract fails fast when the config snapshot is missing (0.86ms)
✔ renderSketchFreeBoxDimensions keeps height on the right and depth on the left (1.9873ms)
✔ renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions (0.34ms)
✔ renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries (3.2962ms)
✔ renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths (2.017ms)
✔ renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label (0.47ms)
✔ dimension grouping applies focused X/Y adjacency and span-merge tolerance boundaries (0.651ms)
✔ grouped dimension rendering preserves call order, focused text scale and negative min-height label shift (2.3247ms)
✔ render interior sketch layout geometry clamps box size and center inside the internal span (1.27ms)
✔ render sketch box shell height preserves defaults, minimums, and regular/free caps (0.2278ms)
✔ render sketch box shell placement keeps min, ratio, and max clamp pads (0.8966ms)
✔ render sketch box shell geometry rejects string-encoded live box dimensions (0.1933ms)
✔ render interior sketch layout geometry rejects string-encoded live numeric overrides (0.2167ms)
✔ render interior sketch layout geometry rejects string-encoded runtime placement args (0.192ms)
✔ render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry (0.1543ms)
✔ render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks (1.4439ms)
✔ render interior sketch layout resolves content segments from divider-separated spans (1.467ms)
✔ render interior sketch support clamps placement, emits shelf pins, and keeps brace side seams disabled (2.2047ms)
✔ render interior sketch shelf pins omit only supports that collide with the room column liner cut (0.7349ms)
✔ render interior sketch support locator resolves the matching box by center span (0.7052ms)
✔ render interior sketch shelves emit folded contents with measured shelf clearance (0.7192ms)
✔ render interior sketch support rejects string-encoded shelf and storage geometry (0.5161ms)
✔ removed frame side sketch shelves preserve glass and double variants on forced brace geometry (0.3478ms)
✔ render interior sketch module shelves keep brace shelves on the brace material path (2.8541ms)
✔ render interior sketch rods use the installed rod owner when it succeeds and local visual rod when it rejects (0.6205ms)
✔ render interior sketch rods report per-item failures and continue rendering later rods (0.278ms)
✔ render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts (4.1206ms)
✔ render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists (0.452ms)
✔ render interior sketch visuals expose callable factories only for function inputs (0.331ms)
✔ sketch front visual state reuses canonical full-door mirror/glass maps for split door segments (4.2124ms)
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1018.614

```

### [PASS] Cloud sync lifecycle (canonical group)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-lifecycle`
- status: **passed**
- exit code: `0`
- duration: `6527ms`

#### stderr

```text
[serial-tests batch 1/6] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/6] ready
[serial-tests batch 1/6] ok (282ms)
[serial-tests batch 2/6] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/6] ready
[serial-tests batch 2/6] ok (2.1s)
[serial-tests batch 3/6] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/6] ready
[serial-tests batch 3/6] ok (568ms)
[serial-tests batch 4/6] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_realtime_runtime.test.ts)
[serial-tests batch 4/6] ready
[serial-tests batch 4/6] ok (704ms)
[serial-tests batch 5/6] 3 files (tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 5/6] ready
[serial-tests batch 5/6] ok (2.1s)
[serial-tests batch 6/6] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 6/6] ready
[serial-tests batch 6/6] ok (585ms)
[serial-tests] completed 16 files in 6.3s across 6 batches

```

#### stdout

```text
✔ cloud sync access reads canonical services panelApi and ignores legacy root alias (0.8441ms)
✔ cloud sync access ensures canonical service state on services root (0.2631ms)
✔ cloud sync access exposes test hooks through canonical service state only (0.2516ms)
✔ cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required (2.392ms)
✔ cloud sync feedback prefers preserved error messages when available (0.2161ms)
✔ cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller (67.3581ms)
✔ cloud sync panel actions fall back to derived status when panel snapshot api is unavailable (3.902ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 227.4209
✔ cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping (2.1171ms)
✔ cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly (1.1649ms)
✔ cloud sync install support preserves backward compatibility for untagged published dispose refs (0.955ms)
✔ cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose (1.3179ms)
✔ cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch (0.3594ms)
✔ cloud sync install support clears only canonical published slots and preserves unrelated state (1.0656ms)
✔ cloud sync install support can preserve deactivated stable surfaces across an owner replacement (0.3905ms)
✔ cloud sync install support preserves canonical test hooks by default while clearing published slots (0.2982ms)
✔ cloud sync install support drops test hooks when cleanup opts out of hook preservation (0.2923ms)
✔ cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/subscriptions (15.6065ms)
✔ cloud_sync lifecycle: no timer/listener leaks after dispose (1.7295ms)
✔ cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle (2.5283ms)
✔ cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose (2.2354ms)
✔ cloud_sync lifecycle: dispose clears published public state but preserves test hooks (1.2595ms)
✔ cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes (1.2819ms)
✔ cloud_sync lifecycle: stale held dispose refs do not clear newer public state (2.8793ms)
✔ cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap (1.8509ms)
✔ cloud_sync lifecycle: failed reinstall clears stale public state when config disappears (0.8502ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2006.9276
✔ owned cloud-sync family flight registers immediately for synchronous re-entry reuse (1.2365ms)
✔ owned cloud-sync family flight returns busy for synchronous conflicting re-entry (0.9756ms)
✔ runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work (0.2439ms)
✔ readCfg normalizes deps config and clamps site2 sketch max age (1.5772ms)
✔ cloud sync config browser helpers keep URL params and site2 detection canonical (0.9439ms)
✔ cloud sync config shared helpers keep gateway URL and headers canonical (0.1723ms)
✔ cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint (4.7431ms)
✔ cloud sync delete temp preserves a concurrent local mutation and queues push reconciliation (0.8664ms)
✔ cloud sync delete temp records a failed preflight attempt without stamping pull success (0.5481ms)
✔ cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors (0.4744ms)
✔ cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work (1.185ms)
✔ cloud sync delete-temp tracks preflight pull activity and settled push activity canonically (1.2451ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 521.9013
✔ cloud sync attention pulls still fire on focus when eligible (3.2514ms)
✔ cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown (0.412ms)
✔ cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return (0.4633ms)
✔ cloud sync attention online pull does not stay blocked by subscribed status without a live channel (0.5133ms)
✔ cloud sync attention online handler reports pull failures without breaking later attention events (0.8324ms)
✔ cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes (0.5155ms)
✔ cloud sync attention pulls stay inert after the lifecycle guard flips stale before cleanup
...
[trimmed 3417 chars]
```

### [PASS] Cloud sync main-row (canonical group)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-main-row`
- status: **passed**
- exit code: `0`
- duration: `4459ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ready
[serial-tests batch 1/3] ok (509ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_mutation_commands_runtime.test.ts … tests/cloud_sync_owner_context_runtime.test.ts)
[serial-tests batch 2/3] ready
[serial-tests batch 2/3] ok (1.8s)
[serial-tests batch 3/3] 2 files (tests/cloud_sync_room_transition_runtime.test.ts … tests/cloud_sync_status_install_runtime.test.ts)
[serial-tests batch 3/3] ready
[serial-tests batch 3/3] ok (2.0s)
[serial-tests] completed 8 files in 4.3s across 3 batches

```

#### stdout

```text
✔ cloud sync main row skips remote apply churn when newer rows carry the same payload (3.6945ms)
✔ cloud sync main row still applies remote payloads when the effective collections actually change (3.2829ms)
✔ cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged (0.6825ms)
✔ cloud sync main row seeds a missing row from local collections on the initial pull (6.9055ms)
✔ cloud sync main row never seeds local collections after a failed initial read (0.6233ms)
✔ cloud sync main row never seeds a retention-deleted room (0.4908ms)
✔ cloud sync main row preserves a local mutation made while a normal pull is in flight (2.85ms)
✔ cloud sync main row initial seed reuses returned representation when the upsert already returns the row (0.9997ms)
✔ cloud sync main row push publishes changed collections once and skips identical repeats (2.2206ms)
✔ cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch (0.7162ms)
✔ cloud sync main row reuses the same pending push promise for duplicate direct pushes (1.3767ms)
✔ cloud sync main row pull applies newer remote payloads into local storage (2.0393ms)
✔ cloud sync main row use-remote resolution adopts the verified row before reporting success (1.1812ms)
✔ cloud sync main row keep-local resolution adopts the server-confirmed row before reporting success (3.5783ms)
✔ cloud sync main row first remote pull hydrates app maps even when stored hash already matches remote (1.0832ms)
✔ cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull (0.9651ms)
✔ cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push (0.799ms)
✔ cloud sync main row push applies settled remote payload locally without forcing a follow-up pull (1.2244ms)
✔ cloud sync main row push settlement preserves a newer local revision and requeues that local state (0.8112ms)
✔ cloud sync main row collapses pull retries during a push into one post-push follow-up pull (0.9393ms)
✔ cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests (0.6943ms)
✔ cloud sync main row notifies push-settled listeners only after the push flight has cleared (0.6769ms)
✔ cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests (0.5579ms)
✔ cloud sync main row shares app-scoped push ownership across main-row instances for the same App (0.5982ms)
✔ cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run (0.206ms)
✔ cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up (0.6546ms)
✔ cloud sync main row preserves one follow-up push request raised while a push is already in flight (0.6512ms)
✔ cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first (0.9799ms)
✔ cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce (0.4773ms)
✔ cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull (0.6848ms)
✔ cloud sync main-row pull runs immediately and reports when timer scheduling is unavailable (0.219ms)
✔ cloud sync main-row pull reports scheduled rejections without leaking an unhandled promise (0.2184ms)
✔ cloud sync main-row pull keeps running when diagnostics or timer cleanup fail (0.2356ms)
✔ cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys (1.4557ms)
✔ cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner (0.3836ms)
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 460.2564
✔ cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results (2.3841ms)
✔ cloud sync mutation cleanup commands return cancelled when confirm is declined (0.322ms)
✔ cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel (0.3437ms)
✔ cloud sync delete-temp commands reuse one pending models cleanup flow per app (3.5805ms)
✔ cloud sync delete-temp commands block conflicting cleanup family actions while one is pending (0.7266ms)
✔ cloud sync owner context composes room helpers and per-tab client identity through dedicated seams (8.7806ms)
✔ cloud sync owner context uses the public room for gate rows when no room URL is selected (0.7203ms)
✔ cloud sync owner context migrates schema-1 private credentials to schema 2 with JWT expiry (0.8661ms)
✔ cloud sync owner context starts disabled realtime with an empty channel surface (0.5162ms)
✔ cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating (0.3191ms)
✔ cloud sync owner context memoizes runtime status publishes and keeps
...
[trimmed 1826 chars]
```

### [PASS] Cloud sync panel-install (canonical group)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-install`
- status: **passed**
- exit code: `0`
- duration: `1716ms`

#### stdout

```text
✔ cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall (4.9878ms)
✔ cloud sync panel api install heals legacy installed markers that only preserved stale public callables (0.2953ms)
✔ cloud sync panel api install ignores stale publication epochs (3.4373ms)
✔ cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch (0.8127ms)
✔ cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup (0.7129ms)
✔ cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation (0.5149ms)
✔ cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods (0.387ms)
✔ cloud sync panel api stable surface forwards the expected conflict identity (0.2191ms)
✔ cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots (5.943ms)
✔ cloud sync panel api runtime status clone strips drifted realtime/polling extras (0.5209ms)
✔ cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes (0.3415ms)
✔ cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged (0.5183ms)
✔ cloud sync room mode reports a failed owner transition instead of claiming the new room is active (0.6141ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1621.0181

```

### [PASS] Cloud sync panel-controller (canonical group)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-controller`
- status: **passed**
- exit code: `0`
- duration: `1982ms`

#### stdout

```text
✔ cloud sync panel api republishes panel snapshot even when floating pin command throws (3.7108ms)
✔ cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws (2.2034ms)
✔ cloud sync panel api preserves thrown messages for controller-facing commands (5.5539ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1869.5028

```

### [PASS] Cloud sync panel-subscriptions (canonical group)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-subscriptions`
- status: **passed**
- exit code: `0`
- duration: `2074ms`

#### stdout

```text
✔ cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets (8.858ms)
✔ cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App (1.2025ms)
✔ cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener (5.7186ms)
✔ cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles (0.9893ms)
✔ cloud sync async family runner blocks re-entrant conflicting targets before the first run settles (1.2445ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1949.6008

```

### [PASS] Cloud sync panel-snapshots (canonical group)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-snapshots`
- status: **passed**
- exit code: `0`
- duration: `2248ms`

#### stdout

```text
✔ cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors (2.9075ms)
✔ cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors (0.7207ms)
✔ cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths (4.6919ms)
✔ cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids deadline timer churn for unchanged snapshots (1.3218ms)
✔ cloud sync panel snapshot controller does not create deadline timer until a tabs-gate subscriber exists (0.5644ms)
✔ cloud sync panel snapshot controller uses timer-driven tabs-gate minute updates when no source subscription exists (5.7438ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2125.6449

```

### [PASS] Cloud sync sync-ops (canonical group)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-sync-ops`
- status: **passed**
- exit code: `0`
- duration: `4980ms`

#### stderr

```text
[serial-tests batch 1/5] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/5] ready
[serial-tests batch 1/5] ok (1.0s)
[serial-tests batch 2/5] 3 files (tests/cloud_sync_gateway_runtime.test.ts … tests/cloud_sync_room_scope_runtime.test.ts)
[serial-tests batch 2/5] ready
[serial-tests batch 2/5] ok (692ms)
[serial-tests batch 3/5] 3 files (tests/cloud_sync_owner_gateway_io_runtime.test.ts … tests/cloud_sync_room_commands_runtime.test.ts)
[serial-tests batch 3/5] ready
[serial-tests batch 3/5] ok (1.8s)
[serial-tests batch 4/5] 3 files (tests/cloud_sync_site2_sketch_behavior_runtime.test.ts … tests/cloud_sync_sketch_pull_load_runtime.test.ts)
[serial-tests batch 4/5] ready
[serial-tests batch 4/5] ok (790ms)
[serial-tests batch 5/5] 1 file (tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 5/5] ready
[serial-tests batch 5/5] ok (479ms)
[serial-tests] completed 13 files in 4.8s across 5 batches

```

#### stdout

```text
✔ cloud sync pull coalescer collapses burst triggers into one run and supports cancel (3.1672ms)
✔ cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels (0.4333ms)
✔ cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics (0.3103ms)
✔ cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers (0.9393ms)
✔ cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run (0.3106ms)
✔ cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles (0.5641ms)
✔ cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists (0.5925ms)
✔ cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse (0.5808ms)
✔ cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst (0.4602ms)
✔ cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles (0.6715ms)
✔ cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles (1.3769ms)
✔ cloud sync pull coalescer reports synchronous run failures and recovers for later work (0.5107ms)
✔ cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires (0.3087ms)
✔ cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run (0.4824ms)
✔ cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run (0.3357ms)
✔ cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted (0.2746ms)
✔ cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window (2.2332ms)
✔ cloud sync realtime connecting/failure/dispose markers share one canonical branch owner (1.248ms)
✔ cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner (0.3393ms)
✔ cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish (0.5217ms)
✔ cloud sync realtime subscribed marker only issues a gap pull after a resubscribe (1.0872ms)
✔ cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe (0.4376ms)
✔ cloud sync realtime beforeunload cleanup removes the current channel through the installed listener (0.3672ms)
✔ cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label (0.2658ms)
✔ cloud sync realtime disconnected marker can publish a preserved error in one canonical transition (0.2262ms)
✔ cloud sync realtime disposed marker clears stale errors from the final disabled snapshot (0.2721ms)
✔ cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains (0.2028ms)
✔ cloud sync realtime hint does not send when the subscribed status no longer has a live channel (0.1517ms)
✔ cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values (0.2432ms)
✔ cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets (4.1227ms)
✔ cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets (1.2796ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 947.9076
[WardrobePro][error] Error: offline
    at fetchFn (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_gateway_runtime.test.ts:235:13)
    at postGateway (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_gateway.ts:99:26)
    at getGatewayRow (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_gateway.ts:178:28)
    at TestContext.<anonymous> (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_gateway_runtime.test.ts:230:25)
    at async Test.run (node:internal/test_runner/test:1332:7)
    at async Test.processPendingSubtests (node:internal/test_runner/test:911:7)
✔ cloud sync gateway reads only through a signed room request and normalizes the row contract (2.1457ms)
✔ cloud sync gateway returns null for a missing room without exposing a table query (0.4805ms)
✔ cloud sync gateway writes with an expected revision and parses the committed revision (0.441ms)
✔ cloud sync gateway exposes a stale-write conflict as data for a bounded merge retry (0.3164ms)
✔ cloud sync gateway issues public and private signed credentials without accepting client room ids (0.4066ms)
✔ cloud sync gateway preserves auth expiry, rate-limit, and network failures (5.3394ms)
✔ cloud sync gateway renews a private room without allowing a room change (0.4207ms)
✔ signed-room SQL removes browser CRUD and requires tenant/st
...
[trimmed 14256 chars]
```

### [PASS] Cloud sync tabs-ui (canonical group)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-tabs-ui`
- status: **passed**
- exit code: `0`
- duration: `4301ms`

#### stdout

```text
✔ floating sketch sync pin command becomes a no-op when state is unchanged (5.5852ms)
✔ floating sketch sync pin command rolls back local state on push failure (0.6207ms)
✔ floating sketch sync pin toggle command flips the current state (0.457ms)
✔ floating sketch sync pin command preserves push failure message (0.44ms)
✔ floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets (0.5756ms)
✔ cloud sync tabs gate command skips redundant refreshes but extends stale opens (4.1917ms)
✔ cloud sync tabs gate command rolls back on push failure and reports final state (1.2705ms)
✔ cloud sync tabs gate toggle command flips the current ref state (0.4841ms)
✔ cloud sync tabs gate command preserves push failure message (0.4048ms)
✔ cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets (0.654ms)
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
✔ cloud sync tabs gate closes stale site2 UI on initial pull miss (7.3446ms)
✔ cloud sync tabs gate uses the current gate base room for push and pull (0.9199ms)
✔ cloud sync tabs gate defaults to the public room when no room URL is selected (0.551ms)
✔ cloud sync tabs gate public-room push is visible to site2 public-room pull (1.5771ms)
✔ cloud sync tabs gate site2 ignores local open fallback when cloud row is missing (0.4738ms)
✔ cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling (1.5577ms)
✔ cloud sync tabs gate direct push reports controller-only canonically on site2 (0.4162ms)
✔ cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App (0.7131ms)
✔ cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state (4.6369ms)
✔ [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam (3764.8942ms)
✔ [cloud-sync-ui-controller] conflict resolution uses the canonical command and reporter (1.8847ms)
✔ [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations (4.149ms)
✔ [cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads (1.8754ms)
✔ [cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation (0.8873ms)
ℹ tests 24
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4186.9692

```

### [PASS] Playwright browser preflight

- id: `e2e-preflight`
- category: `e2e`
- command: `npm run e2e:smoke:preflight`
- status: **passed**
- exit code: `0`
- duration: `1395ms`

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
- duration: `1079ms`

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
- duration: `206966ms`

#### stderr

```text
[WebServer] (node:28732) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:33944) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:37748) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:31912) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:40656) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:8600) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:31940) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)

```

#### stdout

```text

> e2e:smoke
> node tools/wp_playwright_preflight.js && playwright test -c playwright.config.ts

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

Running 35 tests using 4 workers

  ok  1 [setup] › tests\e2e\app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers (11.5s)
  ok  2 [chromium] › tests\e2e\canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical (20.2s)
  ok  5 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:31:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable (20.0s)
  ok  6 [chromium] › tests\e2e\html_sanitize_security.spec.ts:4:3 › HTML sanitizer browser security › sanitizes descendants moved out of disallowed wrappers and drops foreign namespaces (1.9s)
  ok  3 [chromium] › tests\e2e\authoring_builds.spec.ts:485:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical (33.7s)
  ok  7 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:57:3 › Cloud Sync browser reconnect smoke › switching from public to a newly created private room replaces the active owner without reload (13.7s)
  ok  4 [chromium] › tests\e2e\cloud_sync_conflict_resolution.spec.ts:48:3 › Cloud Sync conflict resolution contention › two browser contexts resolve the same remote entity conflict without a blind overwrite (38.1s)
  ok  8 [chromium] › tests\e2e\resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry (16.4s)
  ok  9 [chromium] › tests\e2e\authoring_builds.spec.ts:552:3 › Playwright authoring build coverage › manual groove controls keep independent dimensions and explicit orientation (15.6s)
  ok 10 [chromium] › tests\e2e\smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable @critical (18.7s)
  ok 12 [chromium] › tests\e2e\resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state (16.5s)
  ok 11 [chromium] › tests\e2e\user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics (27.9s)
  ok 14 [chromium] › tests\e2e\smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name @critical (13.9s)
  ok 15 [chromium] › tests\e2e\resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry (20.6s)
  ok 17 [chromium] › tests\e2e\smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly (12.8s)
  ok 13 [chromium] › tests\e2e\authoring_builds.spec.ts:614:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load (32.7s)
  ok 16 [chromium] › tests\e2e\user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state (22.5s)
  ok 18 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-desktop › shell, authoring and deterministic scene geometry stay valid @critical @matrix (19.2s)
  ok 19 [chromium] › tests\e2e\smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar @critical (19.3s)
  ok 20 [chromium] › tests\e2e\authoring_builds.spec.ts:677:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load (23.5s)
  ok 21 [chromium] › tests\e2e\user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip (22.3s)
  ok 23 [chromium] › tests\e2e\smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive (12.9s)
  ok 22 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-portrait › shell, authoring and deterministic scene geometry stay valid @critical @matrix (14.9s)
  ok 24 [chromium] › tests\e2e\authoring_builds.spec.ts:734:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load (16.9s)
  ok 26 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-landscape › shell, authoring and deterministic scene geometry stay valid @critical @matrix (13.5s)
  ok 25 [chromium] › tests\e2e\user_paths.spec.ts:274:3 › Playwright real user paths › cabinet authoring options survive project roundtrip (24.0s)
  ok 28 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted crit
...
[trimmed 1529 chars]
```

### [PASS] Browser dev regression performance evidence

- id: `browser-perf`
- category: `perf`
- command: `npm run perf:browser`
- status: **passed**
- exit code: `0`
- duration: `240030ms`

#### stderr

```text
[browser-perf][candidate] boot.app-shell exceeded budget (18311ms > 16939ms)
[browser-perf][candidate] LCP exceeded budget (17072ms > 15111ms)
[browser-perf][candidate] boot.browser.setup UX p95 exceeded budget (1981ms > 883ms)
[browser-perf][candidate] boot.browser.setup code-execution p95 exceeded budget (1981ms > 868ms)
[browser-perf][candidate] settingsBackup.import.commit sustained-use drift exceeded budget (143.43% > 45%)
[browser-perf][candidate] boot runtime domain code total exceeded budget (3976ms > 1777ms)
[browser-perf][candidate] settings-backup runtime domain drift exceeded budget (143.43% > 45%)
[browser-perf][candidate] cabinet-core.configure build pending-overwrite pressure exceeded budget (2 > 1)
[browser-perf][candidate] boot-and-shell customer journey total exceeded budget (19255ms > 17420ms)
[browser-perf] quantitative regression candidate; running one clean confirmation

```

#### stdout

```text

> perf:browser
> node tools/wp_browser_perf_smoke.mjs --target dev --enforce


> start:e2e
> vite --configLoader native --host 127.0.0.1 --port 5175 --strictPort


  VITE v8.2.1  ready in 257 ms

  ➜  Local:   http://127.0.0.1:5175/

> start:e2e
> vite --configLoader native --host 127.0.0.1 --port 5175 --strictPort


  VITE v8.2.1  ready in 225 ms

  ➜  Local:   http://127.0.0.1:5175/
[browser-perf] regression candidate was not reproduced by the confirmation run

```

### [PASS] Browser release UX performance evidence

- id: `browser-perf-release`
- category: `perf`
- command: `npm run perf:browser:release`
- status: **passed**
- exit code: `0`
- duration: `211828ms`

#### stderr

```text
[browser-perf][candidate] cabinet-door-drawer-authoring.configure exceeded budget (2838ms > 2683ms)
[browser-perf][candidate] Long Task total exceeded budget (8940ms > 8893ms)
[browser-perf][candidate] viewer.contents.visibility.toggle UX p95 exceeded budget (410ms > 332ms)
[browser-perf][candidate] viewer.contents.visibility.toggle code-execution p95 exceeded budget (410ms > 317ms)
[browser-perf][candidate] other runtime domain code total exceeded budget (1456ms > 1339ms)
[browser-perf][candidate] viewer.contents.visibility.roundtrip store source time exceeded budget (438ms > 375ms)
[browser-perf][candidate] cabinet-core-authoring customer journey store source time exceeded budget (596ms > 552ms)
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
