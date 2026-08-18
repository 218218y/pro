# Final Verification Summary

- schema_version: `1`
- run_id: `b5044ea9-2c12-4215-b2e3-ccc042aa9441`
- generated_at: 2026-08-18T09:00:12.732Z
- workspace: `C:\Users\יעקב\Downloads\pro\latestzip`
- source_digest: `sha256:e6185f48d86ba24f0d9c9ce2a034845f2d9e1e5cbd3e846fd94ea104730c4cbd`
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
- duration: `2040ms`

#### stdout

```text
✔ generated report catalog classifies source-derived reports separately from release evidence (2.6358ms)
✔ generated report default selection excludes release evidence while explicit selection stays strict (0.6423ms)
✔ generated report selection rejects unknown ids and preserves catalog order (0.4443ms)
✔ generated report comparison ignores timestamps but catches semantic drift (13.6638ms)
✔ source identity is deterministic and changes when owned source changes (144.2222ms)
✔ lane catalog identity covers lane execution and profile membership (0.8923ms)
✔ verification payload binds results to source lane catalog and explicit selection (84.2531ms)
✔ verification validation fails closed for source drift lane drift and summary tampering (184.6996ms)
✔ state compatibility rejects legacy or stale payloads with a reset instruction (121.8463ms)
✔ summary and final status preserve environment blockers without treating them as clean proof (0.2736ms)
✔ empty and partial selections cannot report a successful closeout (83.3681ms)
✔ verification summary contract derives markdown from one validated JSON payload (81.8157ms)
✔ verification summary contract refuses to canonize a stale report (93.9326ms)
✔ verification summary contract rejects a successful focused profile as final proof (82.7048ms)
✔ closeout resolves npm through its JS CLI without a shell command fallback (2.6483ms)
✔ closeout lanes keep stable ids and include critical families (0.1737ms)
✔ group-backed closeout lanes execute canonical test groups directly (3.1738ms)
✔ overlay export closeout lane stays direct and uses a live canonical typecheck mode (1.4832ms)
✔ closeout profiles stay stable and Order PDF remains fully catalog-backed (0.1964ms)
✔ normalize args collects profiles categories lane ids skips log dir and state options (0.3109ms)
✔ closeout CLI rejects unknown flags missing values and unknown selectors (0.7678ms)
✔ final report eligibility requires a complete clean default closeout (664.0449ms)
✔ select lanes respects profile resume and skip while preserving order (0.2314ms)
✔ environment classifier recognizes playwright/browser failures (0.1991ms)
✔ runner classifier recognizes wrapper and sandbox failures (0.1536ms)
✔ summary separates passed failures environment-blocked and runner-blocked lanes (0.1056ms)
✔ state helpers merge by lane id and preserve canonical order (0.1635ms)
✔ state helpers roundtrip versioned payloads and return null when the file is missing (443.9036ms)
✔ reset-style empty state is explicitly not-run rather than passed (542.9819ms)
✔ state file resolves to explicit flag or default artifact path (0.1463ms)
✔ browser-dependent lanes inherit environment-blocked from preflight (0.4612ms)
✔ closeout lane logs replace stale streams and grouped-step evidence (136.5492ms)
✔ report paths stay under docs and state path stays under artifacts (0.1017ms)
ℹ tests 33
ℹ suites 0
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1946.2154

```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `node tools/wp_test_group.mjs toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `8326ms`

#### stdout

```text
✔ [actions.patch types] fixture uses native @ts-expect-error contracts (3.2959ms)
✔ [actions.patch types] public/backend patch contract fixture typechecks through tsc (702.2328ms)
✔ [actions.patch types] fixture is safe if discovered by the generic runtime runner (521.4657ms)
✔ package-lock resolved tarballs stay on public registries (6.0108ms)
✔ ts runtime loader loads a plain TS module (200.5125ms)
✔ ts runtime loader resolves local .js imports to TS files (15.3686ms)
✔ ts runtime loader supports object mocks by exact specifier (9.7477ms)
✔ ts runtime loader supports dynamic mocks with loader context (15.2524ms)
✔ ts runtime loader cache returns the same module instance (17.1473ms)
✔ ts runtime loader transform errors include the fixture filename (6.9381ms)
✔ ts runtime loader evaluate errors include the fixture filename (8.3075ms)
✔ runtime tests do not reintroduce per-test TS VM loaders (163.7561ms)
✔ AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers (10.949ms)
✔ AST adapter preserves import, dynamic import, member, optional-chain, and meta-property shapes for callers (2.083ms)
✔ AST adapter keeps token/code-line metrics independent from tool callers (0.8782ms)
✔ AST adapter centralizes type-hardening AST counts (0.821ms)
✔ AST adapter exposes syntax error diagnostics without TypeScript compiler API (1.4829ms)
✔ no project tool/test/runtime source imports TypeScript directly (543.6276ms)
✔ AST adapter returns injected adapter instances without exposing TypeScript module wrapping (0.2853ms)
✔ build-dist args parsing keeps clean/assets/help/unknown policy (2.1413ms)
✔ build-dist path resolution stays rooted under project dist (0.5109ms)
✔ static asset copy mirrors html/runtime/public assets into dist (42.4972ms)
✔ static asset copy keeps repository tests out of dist outputs (11.7137ms)
✔ static asset copy fails when the canonical runtime config module is missing (3.5475ms)
✔ build-dist TypeScript resolver requires local TypeScript by default (3.5487ms)
✔ build-dist TypeScript resolver allows system tsc only in explicit manual mode (1.8463ms)
✔ build-dist flow fails clearly instead of using system tsc when local TypeScript is missing (2.517ms)
✔ build-dist rejects unknown options in CI/release mode (1.7356ms)
✔ build-dist retries once without tsbuildinfo when incremental build misses entry (11.6983ms)
✔ bundle arg parsing preserves out/sourcemap/minify/rebuild policy (3.1777ms)
✔ bundle path resolution derives out dir and stale tmp cleanup dir canonically (0.4252ms)
✔ bundle dist freshness requests rebuild when entry/build info are stale or missing (7.3764ms)
✔ bundle TypeScript resolver refuses system tsc unless manual fallback is explicit (9.1009ms)
✔ bundle dist build fails before probing system tsc when local TypeScript is missing (2.1397ms)
✔ bundle artifact cleanup removes numbered chunk wrappers only (2.8886ms)
✔ bundle emit writes entry code, sourcemap comment, and extra chunks canonically (36.3057ms)
✔ bundle build config keeps strict entry signatures and named chunk policy (1.287ms)
✔ bundle build config maps scheduler debug stats to full implementation outside client mode (6.656ms)
✔ bundle emit writes build-mode marker next to the entry bundle (7.7513ms)
✔ check arg parsing preserves baseline/json/gate/strict flags (2.1504ms)
✔ check mode detection prefers js first and falls back to esm (5.9007ms)
✔ check syntax runner reports malformed js files (111.571ms)
✔ check policy stats count legacy/root needles by directory (6.1681ms)
✔ check gate/strict results report regressions and clean strict state (0.4774ms)
✔ check json report preserves file and policy summary fields (0.2119ms)
✔ lint architecture contracts block new restricted imports, globals, and App bag access (12.1435ms)
✔ lint architecture contracts keep viewer measurement geometry behind capability DI (1.9892ms)
✔ lint architecture contracts keep viewer measurement flow and facade on the feature runtime boundary (7.6402ms)
✔ lint architecture contracts keep carcass shell geometry on the canonical typed IR boundary (1.2218ms)
✔ lint architecture contracts keep corner cornice planners on plan-first typed IR (0.6409ms)
✔ lint architecture contracts keep part-hover preview clients behind the typed protocol runtime (1.5057ms)
✔ lint architecture contracts keep planar reflector lifecycle ownership separated (1.1227ms)
✔ lint architecture contract has no unbaselined or stale violations in the current tree (6514.6446ms)
✔ lint architecture baseline count matches the json baseline file (0.8089ms)
✔ lint architecture contracts fail a new violation that is not in baseline (6.174ms)
✔ lint architecture contracts allow a violation only when it is explicitly baselined (3.8923ms)
✔ lint architecture contracts fail when a baseline entry is stale (3.7291ms)
✔ lint architecture baseline is loaded from json, not hardcoded in the tool (0.3797ms)
✔ JS-onl
...
[trimmed 15434 chars]
```

### [PASS] Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `4016ms`

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
- duration: `7362ms`

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] test-group:perf-toolchain-core
============================================================

✔ check arg parsing preserves baseline/json/gate/strict flags (1.9546ms)
✔ check mode detection prefers js first and falls back to esm (2.9119ms)
✔ check syntax runner reports malformed js files (63.6821ms)
✔ check policy stats count legacy/root needles by directory (3.5096ms)
✔ check gate/strict results report regressions and clean strict state (0.2943ms)
✔ check json report preserves file and policy summary fields (0.1376ms)
✔ perf smoke args parse lanes, scripts, baseline paths, and flags canonically (1.639ms)
✔ perf smoke help text advertises default lanes and baseline flags (0.2425ms)
✔ perf smoke planner resolves verify lanes and dedupes script overlap (0.5659ms)
✔ perf smoke resolves the stable Node-only profile directly and keeps other scripts on npm fallback (0.8586ms)
✔ perf smoke confirmation reuses the canonical entrypoint with one hidden confirmation flag (0.3475ms)
✔ perf smoke baseline evaluation detects regressions and profile drift (2.8844ms)
✔ perf smoke markdown report keeps durable tool-owned baseline anchors (0.755ms)
✔ perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow (8.9807ms)
✔ [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules (3.8094ms)
✔ [toolchain] bundle keeps one thin entrypoint plus canonical owner modules (0.9865ms)
✔ [toolchain] check keeps one thin entrypoint plus canonical owner modules (0.8739ms)
✔ [toolchain] release keeps one thin entrypoint plus canonical owner modules (1.2304ms)
✔ [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules (1.029ms)
✔ [toolchain] test keeps one thin entrypoint plus canonical owner modules (1.7406ms)
✔ [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules (0.9086ms)
✔ [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules (0.6867ms)
✔ [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules (0.721ms)
✔ [toolchain] verify keeps one thin entrypoint plus canonical owner modules (0.8588ms)
✔ [toolchain] verify-parallel keeps one thin entrypoint plus canonical owner modules (0.6157ms)
✔ verify lane state parses canonical lane names plus print/dry-run/no-dedupe flags (3.1359ms)
✔ verify lane catalog uses typed tasks and dedupes multi-lane plans (1.1485ms)
✔ verify lane planner reports canonical task order for single and multi-lane runs (0.4166ms)
✔ verify lane flow dispatches test groups directly and package scripts through npm (1.9504ms)
✔ verify lane flow dedupes overlapping typed tasks across multiple lanes by default (0.5483ms)
✔ verify lane help text advertises the canonical lane catalog and multi-lane support (0.414ms)

⚠️  Prettier check: formatting differences found (warning only).

❌ Prettier check failed in gate mode (formatting differences found).
✔ verify parallel args preserve verify flags and local concurrency controls (2.5895ms)
✔ verify parallel plan builds once and gives test shards isolated reports (1.0188ms)
✔ verify parallel flow treats prettier diffs as warnings outside gate mode (1.887ms)
✔ verify parallel flow fails prettier diffs in gate mode and skips bundle phase (0.868ms)

============================================================
[WardrobePro] build dist (no assets)
============================================================

✔ verify args parsing preserves gate/no-build/skip-bundle/soft-format policy (2.2078ms)
✔ format check classification warns in normal mode and fails in strict gate mode (0.5922ms)
✔ ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise (2.48ms)
✔ verify flow orders core checks and skips bundle commands when requested (2.4331ms)
✔ verify flow runs both client release bundle targets in order when bundling is enabled (1.9553ms)
ℹ tests 40
ℹ suites 0
ℹ pass 40
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 179.6767

============================================================
[WP Perf Smoke] test-group:ui-react-import-hardening-contracts
============================================================

✔ ui react import hardening removes legacy React namespace access from pure ts modules (23.715ms)
✔ ui react import hardening uses explicit named type imports for event-heavy contracts (0.235ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 109.2693

============================================================
[WP Perf Smoke] test-group:ui-react-jsx-hardening-contracts
============================================================

✔ ui react jsx import hardening removes legacy default React imports and namespace access from tsx modules (11.6609ms)
✔ ui rea
...
[trimmed 1356 chars]
```

### [PASS] Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `6925ms`

#### steps

- [PASS] overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 152ms)
- [PASS] typecheck project: `node tools/wp_typecheck.js --mode project` (passed, 636ms)
- [PASS] layer contracts: `node tools/wp_layer_contract.js` (passed, 5114ms)
- [PASS] public api contracts: `node tools/wp_public_api_contract.js` (passed, 1023ms)

### [PASS] Order PDF overlay core (canonical group)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-overlay-core`
- status: **passed**
- exit code: `0`
- duration: `2296ms`

#### stdout

```text
✔ order pdf export actions honor image/gmail busy flags before starting another action (7.4365ms)
✔ order pdf interaction handlers report pointer-cancel failures instead of throwing (0.6125ms)
✔ order pdf export actions reuse cached interactive blob while draft signature is unchanged (1.3707ms)
✔ getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error (2.4027ms)
✔ getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess (0.3467ms)
✔ getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text (0.3243ms)
✔ applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists (0.4612ms)
✔ readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing (2.7308ms)
✔ loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state (2.9454ms)
✔ refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it (1.789ms)
✔ resolveOrderPdfInlineConfirmAction returns the selected follow-up draft (0.3238ms)
✔ order pdf draft effects preserves a canonical edited details pair (2.2742ms)
✔ order pdf draft effects derives the seed from canonical text when auto details are empty (0.2125ms)
✔ order PDF editor mode starts from externally-owned sketch visibility (1.8711ms)
✔ PDF annotation waits for an open sketch preview to close (0.3808ms)
✔ an externally opened sketch preview preempts PDF page annotation (0.2016ms)
✔ requesting sketch preview closes PDF annotation before the external toggle resolves (0.1753ms)
✔ canceling a pending PDF request does not reopen it after the sketch closes (0.2027ms)
✔ order pdf stage/file interactions keep close intent and PDF validation behavior canonical (2.6762ms)
✔ order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state (1.8781ms)
✔ getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes (1.0904ms)
✔ getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks (1.2339ms)
✔ bindExportApiFromModule captures the app once and returns null for missing module/app (0.4252ms)
✔ order pdf details line helpers parse and collect canonical keyed rows (2.854ms)
✔ order pdf details line helpers preserve inline tails and positioned extras (1.0323ms)
✔ order pdf text fallback html decoder preserves newlines and common entities without a document (0.9693ms)
✔ order pdf text public seam exposes the canonical empty draft defaults (0.652ms)
✔ order pdf text merge falls back to exact base replacement when no marker document is available (0.4241ms)
✔ order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam (3.449ms)
✔ order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear (1.5026ms)
✔ order pdf merge support resolves clean detected regions without preserving stale manual leftovers (0.568ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2199.9871

```

### [PASS] Order PDF PDF-render batch (canonical group)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-pdf-render`
- status: **passed**
- exit code: `0`
- duration: `2379ms`

#### stdout

```text
✔ [order-pdf] prepared details split can be painted without re-wrapping (3.1046ms)
✔ [order-pdf] prepared layout preserves wrapped lines and visible max-line window (0.375ms)
✔ [order-pdf] image-pdf details text uses the canonical touched semantics (0.2891ms)
✔ order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled (21.1564ms)
✔ order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled (5.7757ms)
✔ order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled (4.4412ms)
✔ order pdf pdf-import clears saved form text and stale widget appearances for editor background (15.2852ms)
✔ order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails (2.4866ms)
✔ order pdf pdf-import extracts generated field names through the canonical document-field runtime (16.4336ms)
✔ order pdf pdf-import reads bytes from file-like objects and tolerates read failures (0.5034ms)
✔ order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page (4.4402ms)
✔ order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime (1.0163ms)
✔ order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer (0.7467ms)
✔ order pdf image-pdf export writes hidden import fields that load back into the editor (8.1948ms)
✔ order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path (2.2369ms)
✔ order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup (0.3334ms)
✔ cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly (0.871ms)
✔ loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document (0.4708ms)
✔ loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves (0.2493ms)
✔ order pdf render helpers treat destroyed/aborted worker errors as expected cancellations (2.4072ms)
✔ loadOrderPdfFirstPage clones source bytes before handing them to pdf.js (1.1815ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2280.132

```

### [PASS] Order PDF sketch batch (canonical group)

- id: `order-pdf-sketch`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-sketch`
- status: **passed**
- exit code: `0`
- duration: `1759ms`

#### stdout

```text
✔ [history-ui] suspended history shortcuts are detected from the active overlay element (1.1209ms)
✔ [history-ui] suspended history shortcuts fall back to a document-level overlay marker (0.253ms)
✔ [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags (3.6732ms)
✔ [order-pdf] refresh-auto preserves sketch annotations while refreshing project details (0.9317ms)
✔ [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport (0.8303ms)
✔ [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space (0.1263ms)
✔ [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot (0.7281ms)
✔ [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports (0.1653ms)
✔ [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes (0.1334ms)
✔ [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads (0.3565ms)
✔ [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes (0.1293ms)
✔ [order-pdf] sketch canvas frame only commits once a real 2d context exists (0.3129ms)
✔ [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically (1.8924ms)
✔ [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key (0.4467ms)
✔ [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion (0.1651ms)
✔ [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect (0.1825ms)
✔ [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point (0.2248ms)
✔ [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths (0.6183ms)
✔ [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history (0.1546ms)
✔ [order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts (0.2772ms)
✔ [order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically (0.3463ms)
✔ [order-pdf] sketch panel runtime reads drawing rects once from the measured host surface (0.354ms)
✔ [order-pdf] sketch preview reveal scrolls the editor stage just enough to expose created images (0.24ms)
✔ [order-pdf] sketch preview reveal does not scroll when the panel is already visible (0.0853ms)
✔ [order-pdf] sketch preview reveal uses the stage scroll container instead of the page window (0.2157ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after success (1.4322ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after failure (0.9434ms)
✔ [order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states (0.3629ms)
✔ [order-pdf] sketch preview session restores the original doors-open state after success (0.2916ms)
✔ [order-pdf] sketch preview session snapshot captures and restores the original camera pose (2.1934ms)
✔ [order-pdf] sketch preview session restores the original camera pose after success (0.3891ms)
✔ [order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z (0.9694ms)
✔ [order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew (0.2042ms)
✔ [order-pdf] sketch history shortcuts are always consumed while the sketch panel is open (0.1297ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1657.2843

```

### [PASS] Order PDF export overlay batch (canonical group)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-overlay`
- status: **passed**
- exit code: `0`
- duration: `1726ms`

#### stdout

```text
✔ loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data (1.7706ms)
✔ exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download (0.341ms)
✔ exportOrderPdfImageWithDeps reports busy before building another image PDF (0.2056ms)
✔ exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing (0.19ms)
✔ loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast (0.5072ms)
✔ exportOrderPdfInteractiveWithDeps preserves the real export failure detail (0.1924ms)
✔ loadOrderPdfIntoEditorWithDeps treats canonical html-only extracted details as found fields (0.3517ms)
✔ loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late (0.3385ms)
✔ order pdf overlay export ops fail fast when rasterization has no document seam (1.3597ms)
✔ order pdf overlay export ops build image attachments through the canonical attachment seam (2.6263ms)
✔ order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages (0.8868ms)
✔ order pdf overlay image rasterization restores first-page annotations clipped inside repainted PDF text boxes (1.1431ms)
✔ order pdf export single-flight reuses duplicate same-key work per app and clears after completion (1.6282ms)
✔ order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps (0.3355ms)
✔ order pdf export single-flight derives stable load keys and maps them back to action kinds (0.3551ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1620.368

```

### [PASS] Order PDF export builders batch (canonical group)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-builders`
- status: **passed**
- exit code: `0`
- duration: `2145ms`

#### stdout

```text
✔ resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values (1.1961ms)
✔ resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so (0.3438ms)
✔ resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides (1.8084ms)
✔ buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable (355.7678ms)
✔ captureOrderPdfCompositeImages applies sketch annotations after base composite capture (1.9637ms)
✔ buildOrderPdfDocumentResult embeds the primary PDF page annotation layer at high raster density (1.4564ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2044.1323

```

### [PASS] Order PDF export capture batch (canonical group)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-capture`
- status: **passed**
- exit code: `0`
- duration: `1732ms`

#### stdout

```text
✔ order pdf capture cache signature falls back cleanly when state is missing or invalid (2.2845ms)
✔ order pdf capture cache returns cloned bytes instead of live cache buffers (1.1696ms)
✔ order pdf capture cache reuses sketch base assets while signature is unchanged (0.8136ms)
✔ order pdf capture cache ignores editor/runtime ephemera but invalidates on canonical config changes (0.4373ms)
✔ order pdf capture cache signature ignores sketch-only annotation changes (0.8754ms)
✔ export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas (2.4025ms)
✔ export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures (0.4219ms)
✔ order PDF render/sketch composite preserves chest live viewport and screenshot note mapping (1.556ms)
✔ order PDF open/closed composite preserves corner live viewport and screenshot note mapping (0.7126ms)
✔ export order pdf ops factory exposes stable draft/export surface (2.1002ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1635.4165

```

### [PASS] Order PDF export text batch (canonical group)

- id: `order-pdf-export-text`
- category: `verify`
- command: `node tools/wp_test_group.mjs order-pdf-export-text`
- status: **passed**
- exit code: `0`
- duration: `1624ms`

#### stdout

```text
✔ createOrderPdfRenderAnnotationLayerPngOp renders first-page PDF annotations to PNG bytes (1.7064ms)
✔ listOrderPdfSketchStrokes keeps only valid strokes for the requested page (0.1623ms)
✔ paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas (0.2689ms)
✔ paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser (0.1264ms)
✔ compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer (0.3647ms)
✔ paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite (0.5086ms)
✔ export order pdf text ops compose details, bidi, and layout behavior from one canonical seam (2.1378ms)
✔ export order pdf text ops keep canonical draft defaults and bidi stabilization behavior (1.4091ms)
✔ export order pdf text uses wardrobe-type depth fallback only when raw depth is missing (0.3237ms)
✔ export order pdf text includes classic cornice only when the main cornice flag is enabled (0.2302ms)
✔ export order pdf text omits cornice when the main cornice flag is disabled (0.2219ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1526.325

```

### [PASS] Sketch manual/hover (canonical group)

- id: `sketch-manual-hover`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-manual-hover`
- status: **passed**
- exit code: `0`
- duration: `1445ms`

#### stdout

```text
✔ drawer remove plan resolves exact typed targets and rejects ambiguous or cross-module hits (3.3056ms)
✔ drawer remove plan mutates only the resolved sketch external target (0.8024ms)
✔ drawer remove plan applies sketch internal and standard external mutations without cross-family spillover (0.4994ms)
✔ sketch internal removal uses exact IDs regardless of overlap, list order, or cassette slot (0.808ms)
✔ sketch internal resolver rejects part identities that do not encode the exact module scope (0.322ms)
✔ sketch external removal never crosses module, box, or list scopes for duplicate IDs (0.4644ms)
✔ ambiguous duplicate records and duplicate box identities are rejected without mutation (0.2411ms)
✔ drawer remove commit owns the structural patch boundary and applies one immutable plan (0.3859ms)
✔ drawer remove commit reports false when the patch is skipped or no target changes (0.419ms)
✔ manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner (3.3469ms)
✔ manual-layout flow skips auto-filled shelves colliding with sketch drawers and warns once (3.3906ms)
✔ manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata (0.712ms)
✔ manual-layout sketch hover match state accepts a recent matching hover snapshot (1.7962ms)
✔ manual-layout sketch hover match state rejects stale or mismatched hover snapshots (0.3567ms)
✔ manual-layout sketch hover match state rejects records that still carry retired host identity fields (0.284ms)
✔ manual-layout hover intent readers decode canonical versioned commands (2.8103ms)
✔ manual-layout hover intent readers reject malformed and non-exact command payloads (0.3932ms)
✔ manual-layout command decoder rejects missing, unknown, and extra fields for every mutation family (0.7018ms)
✔ manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides (4.6596ms)
✔ manual-layout hover module context falls back to the corner root config when no cell config exists (1.7056ms)
✔ manual-layout hover base context rejects missing or invalid module bounds (0.7312ms)
✔ manual-layout hover base context preserves storage clamp pad and hit-Y bounds (2.514ms)
✔ manual-layout hover base context preserves box defaults, clamps, and positive overrides (0.689ms)
✔ manual-layout hover base context preserves shelf parsing and centimeter conversion (0.3982ms)
✔ manual-layout hover base context preserves storage defaults, minimum, span cap, and center clamp (0.4868ms)
✔ manual-layout module box preview routes shelf hover through the focused box owner (7.3123ms)
✔ manual-layout module stack preview routes ext drawers through the focused stack owner (4.304ms)
✔ manual-layout shared remove eps exports retain number shape and focused-owner values (0.2405ms)
✔ manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools (6.9156ms)
✔ manual-layout sketch hover targets free-box content before a module selector behind it (3.2604ms)
✔ manual-layout sketch hover falls back to standalone free placement when no selector is hit (0.9501ms)
✔ manual-layout sketch external drawer hover marks standard external drawers for removal only (0.8647ms)
✔ manual-layout sketch internal drawer hover ignores standard external drawers (0.4037ms)
✔ manual-layout free-box external drawer hover prefers the drawer stack over a nearby shelf removal (3.372ms)
✔ module surface hover writes shelf add intent so click follows the hover preview (3.7327ms)
✔ module surface hover writes rod add intent so stale shelf-remove hover cannot steal the click (0.7446ms)
✔ module preview flow probes existing shelf removal before drawer stack add previews (0.8542ms)
✔ existing vertical remove helper is a no-op when nothing removable is under the cursor (0.4586ms)
✔ door action hover state resolves the nearest door leaf owner with metrics (0.4474ms)
✔ manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors (2.2269ms)
✔ manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool (2.4348ms)
✔ manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout (0.4541ms)
✔ recent sketch hover matching honors tool, age, free-placement, and host identity together (2.7888ms)
✔ recent sketch hover matching rejects retired or malformed host identity records (0.4523ms)
✔ manual tool access prefers canonical mode-state value before runtime tools fallback (1.351ms)
✔ manual tool access falls back to runtime tools when mode-state tool is absent (0.25ms)
✔ sketch-free host falls back to internal grid maps before the zero-door hinged default host (2.2839ms)
✔ sketch-free host uses the hinged zero-door fallback only when no config or grid host exists (0.3027ms)
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1350.734

```

### [PASS] Sketch box/hover (canonical group)

- id: `sketch-box-hover`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-box-hover`
- status: **passed**
- exit code: `0`
- duration: `1198ms`

#### stdout

```text
✔ sketch-box door preview stays inert for hinge toggles when the active segment has no door (2.0222ms)
✔ sketch-box door preview resolves canonical remove metadata for an existing double-door pair (17.9456ms)
✔ sketch-box door preview keeps explicit hinge/remove metadata for a single existing door (0.6001ms)
✔ sketch-box door preview preserves material fallback and edge-extension boundaries (1.4238ms)
✔ sketch-box door preview preserves focused depth, back-clearance, remove-offset, and command payloads (0.7858ms)
✔ sketch-box doors upsert single-door records through the canonical id factory and segment placement seam (2.5608ms)
✔ sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair (17.41ms)
✔ sketch-box doors remove a focused segment door without disturbing the other segment (1.0932ms)
✔ sketch-box doors treat rows inside the same divided column as independent cells (1.7962ms)
✔ sketch-box doors preserve stored groove line counts when rewriting door records (1.3474ms)
✔ resolved module boxes ignore free-placement items and the requested ignoreBoxId (1.7734ms)
✔ resolved module boxes reject string-encoded live geometry (0.1597ms)
✔ vertical center clamp respects module bounds even when desired center is far outside range (0.1571ms)
✔ placement resolution can ignore the edited box id instead of blocking on itself (0.4048ms)
✔ placement reports blocked when overlap chain reaches the module ceiling and floor (0.7968ms)
✔ overlap primitive still allows exact edge contact without treating it as overlap (0.1657ms)
✔ placement resolution can be confined to the pointer slot instead of jumping across blockers (0.4377ms)
✔ placement resolution reports blocked when vertical content blockers leave no valid box slot (0.1936ms)
✔ sketch-box runtime parses width/depth overrides and rejects unrelated tools (1.6418ms)
✔ sketch-box runtime geometry center-snaps and width-clamps inside the module span (0.6399ms)
✔ sketch-box runtime geometry preserves shell minimums, center snap boundaries, and finite fallbacks (0.2942ms)
✔ free-box geometry preserves fallback clamping without capping explicit dimensions (0.279ms)
✔ sketch-box runtime geometry rejects string-encoded live overrides (0.1919ms)
✔ sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match (0.5495ms)
✔ sketch-box runtime hit scan rejects string-encoded live box geometry (0.1229ms)
✔ sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized (0.6868ms)
✔ sketch-box free-placement commit does not derive floorY from string measurements (0.3263ms)
✔ sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column (0.6368ms)
✔ sketch-box free-placement commit clears hover when the canonical commit finishes without next hover (0.3619ms)
✔ sketch-box free-placement commit stays inert when no canonical host is available (0.145ms)
✔ sketch-box door visuals forward mirror state, mirror layout, effective frame style, and deep pick meta through the special visual path (6.7447ms)
✔ sketch-box door visuals use styled profile visuals for in-cabinet whole box doors (0.3808ms)
✔ free-box click uses canonical units and Shell Geometry minimums without changing numeric behavior (2.6032ms)
✔ free-box click preserves missing and invalid optional-dimension handling (0.5505ms)
✔ Interior-tab Sketch Box defaults remain plain integer centimeters with stable tool parsing (0.7212ms)
✔ free-box click fallback does not turn a module hit into a free-placement box (0.133ms)
✔ free-box click fallback still creates a free-placement box when no module was hit (0.2308ms)
✔ free-box click fallback rejects string-encoded plane-hit geometry (0.1645ms)
✔ free-box click preserves a real recent free-placement hover even when a module is behind it (0.3307ms)
✔ sketch external drawers hover context loads persisted module stacks for remove/overlap handling (8.3604ms)
✔ free-box content click stays on the free box even when a wardrobe module is behind it (0.7525ms)
✔ free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks (2.953ms)
✔ module sketch hover blocks collisions between internal and external drawer stacks (0.5298ms)
✔ free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind (0.8452ms)
✔ module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit (0.9236ms)
✔ module sketch external drawers preview reads the selector front envelope instead of the inner cavity only (0.5558ms)
ℹ tests 46
ℹ suites 0
ℹ pass 46
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1101.9613

```

### [PASS] Sketch free-boxes (canonical group)

- id: `sketch-free-boxes`
- category: `verify`
- command: `node tools/wp_test_group.mjs sketch-free-boxes`
- status: **passed**
- exit code: `0`
- duration: `1270ms`

#### stdout

```text
✔ manual-layout free-box shelf grid scopes five shelves to the active split cell (2.5346ms)
✔ manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short (0.214ms)
✔ manual-layout free-box shelf grid commit writes shelves into the no-main free box (3.1126ms)
✔ manual-layout free-box shelf grid blocked commit consumes click without mutating (0.7384ms)
✔ manual-layout free-box shelf grid rejects partial hover records without mutating content (0.2751ms)
✔ manual-layout free-box shelf grid blocks shelves that would collide with an existing rod (0.4732ms)
✔ manual-layout free-box rod hover can target an existing shelf for removal (1.1943ms)
✔ manual-layout free-box shelf edit can target an existing rod or storage barrier for removal (0.7158ms)
✔ manual-layout free-box commits cross-kind removal hovers from shelf and rod tools (1.5782ms)
✔ manual-layout free-box storage removal hover covers the whole existing barrier height (0.5361ms)
✔ manual-layout shelf-grid defaults and span boundary come from focused owners (0.5533ms)
✔ manual-layout preset defaults preserve focused grid, rod, storage and material geometry (0.694ms)
✔ manual-layout brace plan keeps exact tolerance, nearest identity, cell filter and variant depth (0.5294ms)
✔ manual-layout content hover preserves default thickness, storage height and preview order (2.6701ms)
✔ manual-layout shelf-grid add remains a layout preview with canonical hide/set order (1.6781ms)
✔ brace hover preserves brace clearance and regular minimum-width branches (0.8099ms)
✔ manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it (0.6086ms)
✔ preset layout free-box plan maps storage shortcut into active split cell contents (0.3162ms)
✔ preset layout shortcut hover and click target the free box instead of the wardrobe behind it (1.742ms)
✔ brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe (0.7056ms)
✔ sketch-free box content preview short-circuits unsupported content kinds before target scanning (0.915ms)
✔ sketch-free box content preview keeps door-hinge hover inert when the active segment has no door (1.5741ms)
✔ sketch-free box content preview returns canonical double-door removal metadata for an existing pair (8.7336ms)
✔ sketch-free external drawer preview blocks construction on existing free-box shelf content (3.5959ms)
✔ sketch-free vertical preview keeps removal hover available while the active tool is sketch external drawers (1.6086ms)
✔ sketch-free shelf removal accepts direct shelf-board hits with the same generous tolerance as wardrobe shelves (0.8211ms)
✔ sketch-free placement hover record keeps canonical host/free-placement fields (2.7383ms)
✔ sketch-free placement commit adds a free-placement box through the canonical modules patch seam (3.7706ms)
✔ sketch-free placement commit rejects string-encoded internal hover geometry (0.3526ms)
✔ sketch-free placement remove fails closed when its target id is missing (0.2447ms)
✔ sketch-free placement content commit routes free-placement door removal through the canonical content seam (3.8331ms)
✔ sketch-free placement content commit consumes blocked no-room hovers without mutating (1.8994ms)
✔ sketch-free placement ext-drawer removal also removes regular external drawers in the same free box (1.1521ms)
✔ sketch-free vertical tools commit cross-kind vertical-content removal hovers (1.4637ms)
✔ sketch-free stack tools commit existing vertical-content removal hovers before adding drawers (0.5807ms)
✔ sketch-free drawer commit consumes a room-column collision without mutating the free box (2.945ms)
✔ sketch-free regular external drawers can add a shoe drawer without falling back to module drawers (2.2418ms)
✔ sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top (1.1434ms)
✔ sketch-free regular external drawers update shoe and regular count independently in the same cell (0.8173ms)
✔ sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks (2.0303ms)
✔ sketch free surface target scan follows nearest ray intersection instead of free-box array order (0.4888ms)
✔ sketch free divider target scan projects fallback pointer to the box front plane (0.376ms)
✔ side-wall free-box content target keeps the remapped rotated hit instead of projecting to a wardrobe Z plane (0.299ms)
✔ sketch free surface target scan rejects string-encoded free-box geometry (0.1957ms)
✔ sketch free content target scan projects profile-door hits to the canonical box front plane (0.2258ms)
✔ sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry (1.0674ms)
✔ sketch free base adornment preview rejects string-encoded current base dimensions (1.3471ms)
✔ sketch free cornice adornment keeps toggle, fallback, focused geometr
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
✔ render sketch box fronts reuses one mirror material across mirrored external drawers (6.5843ms)
✔ render sketch box fronts reject string-encoded live external drawer positions (0.2426ms)
✔ render sketch box fronts do not parse string-encoded live external drawer counts (0.506ms)
✔ render sketch box external drawers flush a top-anchored free-box stack to the box face edge (0.4851ms)
✔ interior sketch style, feature flags, and divider state read only canonical input fields (1.7411ms)
✔ interior sketch input contract fails fast when the config snapshot is missing (0.6363ms)
✔ renderSketchFreeBoxDimensions keeps height on the right and depth on the left (2.1309ms)
✔ renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions (0.8626ms)
✔ renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries (7.5495ms)
✔ renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths (2.2093ms)
✔ renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label (0.6425ms)
✔ dimension grouping applies focused X/Y adjacency and span-merge tolerance boundaries (1.9751ms)
✔ grouped dimension rendering preserves call order, focused text scale and negative min-height label shift (0.8823ms)
✔ render interior sketch layout geometry clamps box size and center inside the internal span (1.4562ms)
✔ render sketch box shell height preserves defaults, minimums, and regular/free caps (0.1879ms)
✔ render sketch box shell placement keeps min, ratio, and max clamp pads (0.7372ms)
✔ render sketch box shell geometry rejects string-encoded live box dimensions (0.2414ms)
✔ render interior sketch layout geometry rejects string-encoded live numeric overrides (0.2233ms)
✔ render interior sketch layout geometry rejects string-encoded runtime placement args (0.2261ms)
✔ render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry (0.2203ms)
✔ render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks (1.3983ms)
✔ render interior sketch layout resolves content segments from divider-separated spans (0.7662ms)
✔ render interior sketch support clamps placement, emits shelf pins, and keeps brace side seams disabled (2.0759ms)
✔ render interior sketch shelf pins omit only supports that collide with the room column liner cut (0.7165ms)
✔ render interior sketch support locator resolves the matching box by center span (0.6425ms)
✔ render interior sketch shelves emit folded contents with measured shelf clearance (0.6995ms)
✔ render interior sketch support rejects string-encoded shelf and storage geometry (0.4837ms)
✔ removed frame side sketch shelves preserve glass and double variants on forced brace geometry (0.3249ms)
✔ render interior sketch module shelves keep brace shelves on the brace material path (2.6908ms)
✔ render interior sketch rods use the installed rod owner when it succeeds and local visual rod when it rejects (0.578ms)
✔ render interior sketch rods report per-item failures and continue rendering later rods (0.2263ms)
✔ render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts (2.7385ms)
✔ render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists (0.3292ms)
✔ render interior sketch visuals expose callable factories only for function inputs (0.2073ms)
✔ sketch front visual state reuses canonical full-door mirror/glass maps for split door segments (3.1362ms)
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 858.1391

```

### [PASS] Cloud sync lifecycle (canonical group)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-lifecycle`
- status: **passed**
- exit code: `0`
- duration: `5852ms`

#### stderr

```text
[serial-tests batch 1/6] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/6] ready
[serial-tests batch 1/6] ok (272ms)
[serial-tests batch 2/6] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/6] ready
[serial-tests batch 2/6] ok (1.9s)
[serial-tests batch 3/6] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/6] ready
[serial-tests batch 3/6] ok (550ms)
[serial-tests batch 4/6] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_realtime_runtime.test.ts)
[serial-tests batch 4/6] ready
[serial-tests batch 4/6] ok (667ms)
[serial-tests batch 5/6] 3 files (tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 5/6] ready
[serial-tests batch 5/6] ok (1.8s)
[serial-tests batch 6/6] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 6/6] ready
[serial-tests batch 6/6] ok (514ms)
[serial-tests] completed 16 files in 5.7s across 6 batches

```

#### stdout

```text
✔ cloud sync access reads canonical services panelApi and ignores legacy root alias (1.0229ms)
✔ cloud sync access ensures canonical service state on services root (0.2655ms)
✔ cloud sync access exposes test hooks through canonical service state only (0.1958ms)
✔ cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required (2.2703ms)
✔ cloud sync feedback prefers preserved error messages when available (0.2018ms)
✔ cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller (56.2948ms)
✔ cloud sync panel actions fall back to derived status when panel snapshot api is unavailable (3.9029ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 225.7782
✔ cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping (2.7962ms)
✔ cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly (1.1159ms)
✔ cloud sync install support preserves backward compatibility for untagged published dispose refs (0.781ms)
✔ cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose (1.0554ms)
✔ cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch (0.312ms)
✔ cloud sync install support clears only canonical published slots and preserves unrelated state (0.7919ms)
✔ cloud sync install support can preserve deactivated stable surfaces across an owner replacement (0.32ms)
✔ cloud sync install support preserves canonical test hooks by default while clearing published slots (0.1694ms)
✔ cloud sync install support drops test hooks when cleanup opts out of hook preservation (0.1581ms)
✔ cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/subscriptions (15.7574ms)
✔ cloud_sync lifecycle: no timer/listener leaks after dispose (1.7428ms)
✔ cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle (2.6284ms)
✔ cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose (2.5747ms)
✔ cloud_sync lifecycle: dispose clears published public state but preserves test hooks (1.493ms)
✔ cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes (1.5035ms)
✔ cloud_sync lifecycle: stale held dispose refs do not clear newer public state (3.0357ms)
✔ cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap (2.0031ms)
✔ cloud_sync lifecycle: failed reinstall clears stale public state when config disappears (1.0033ms)
ℹ tests 18
ℹ suites 0
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1830.5428
✔ owned cloud-sync family flight registers immediately for synchronous re-entry reuse (0.9215ms)
✔ owned cloud-sync family flight returns busy for synchronous conflicting re-entry (0.7837ms)
✔ runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work (0.2293ms)
✔ readCfg normalizes deps config and clamps site2 sketch max age (3.5001ms)
✔ cloud sync config browser helpers keep URL params and site2 detection canonical (0.9114ms)
✔ cloud sync config shared helpers keep gateway URL and headers canonical (0.1732ms)
✔ cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint (4.5489ms)
✔ cloud sync delete temp preserves a concurrent local mutation and queues push reconciliation (0.8339ms)
✔ cloud sync delete temp records a failed preflight attempt without stamping pull success (0.5308ms)
✔ cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors (0.4323ms)
✔ cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work (0.8774ms)
✔ cloud sync delete-temp tracks preflight pull activity and settled push activity canonically (0.8485ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 504.2413
✔ cloud sync attention pulls still fire on focus when eligible (2.7739ms)
✔ cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown (0.5417ms)
✔ cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return (0.4967ms)
✔ cloud sync attention online pull does not stay blocked by subscribed status without a live channel (0.3079ms)
✔ cloud sync attention online handler reports pull failures without breaking later attention events (0.6308ms)
✔ cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes (0.3064ms)
✔ cloud sync attention pulls stay inert after the lifecycle guard flips stale before cleanup
...
[trimmed 3420 chars]
```

### [PASS] Cloud sync main-row (canonical group)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-main-row`
- status: **passed**
- exit code: `0`
- duration: `4060ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ready
[serial-tests batch 1/3] ok (477ms)
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
✔ cloud sync main row skips remote apply churn when newer rows carry the same payload (3.5319ms)
✔ cloud sync main row still applies remote payloads when the effective collections actually change (2.0683ms)
✔ cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged (0.4151ms)
✔ cloud sync main row seeds a missing row from local collections on the initial pull (4.1628ms)
✔ cloud sync main row never seeds local collections after a failed initial read (0.4003ms)
✔ cloud sync main row never seeds a retention-deleted room (0.3221ms)
✔ cloud sync main row preserves a local mutation made while a normal pull is in flight (1.9626ms)
✔ cloud sync main row initial seed reuses returned representation when the upsert already returns the row (0.7663ms)
✔ cloud sync main row push publishes changed collections once and skips identical repeats (2.5435ms)
✔ cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch (1.1613ms)
✔ cloud sync main row reuses the same pending push promise for duplicate direct pushes (1.2955ms)
✔ cloud sync main row pull applies newer remote payloads into local storage (1.4577ms)
✔ cloud sync main row use-remote resolution adopts the verified row before reporting success (0.7515ms)
✔ cloud sync main row keep-local resolution adopts the server-confirmed row before reporting success (0.6179ms)
✔ cloud sync main row first remote pull hydrates app maps even when stored hash already matches remote (1.1318ms)
✔ cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull (1.0578ms)
✔ cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push (0.8042ms)
✔ cloud sync main row push applies settled remote payload locally without forcing a follow-up pull (1.1923ms)
✔ cloud sync main row push settlement preserves a newer local revision and requeues that local state (1.339ms)
✔ cloud sync main row collapses pull retries during a push into one post-push follow-up pull (1.3387ms)
✔ cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests (0.894ms)
✔ cloud sync main row notifies push-settled listeners only after the push flight has cleared (0.7458ms)
✔ cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests (0.6143ms)
✔ cloud sync main row shares app-scoped push ownership across main-row instances for the same App (2.1515ms)
✔ cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run (0.3547ms)
✔ cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up (0.9677ms)
✔ cloud sync main row preserves one follow-up push request raised while a push is already in flight (1.2106ms)
✔ cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first (3.0496ms)
✔ cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce (0.4846ms)
✔ cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull (0.7479ms)
✔ cloud sync main-row pull runs immediately and reports when timer scheduling is unavailable (0.2171ms)
✔ cloud sync main-row pull reports scheduled rejections without leaking an unhandled promise (0.1806ms)
✔ cloud sync main-row pull keeps running when diagnostics or timer cleanup fail (0.1977ms)
✔ cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys (0.9315ms)
✔ cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner (0.4421ms)
ℹ tests 35
ℹ suites 0
ℹ pass 35
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 432.1301
✔ cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results (2.2634ms)
✔ cloud sync mutation cleanup commands return cancelled when confirm is declined (0.2822ms)
✔ cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel (0.3313ms)
✔ cloud sync delete-temp commands reuse one pending models cleanup flow per app (2.1663ms)
✔ cloud sync delete-temp commands block conflicting cleanup family actions while one is pending (0.3763ms)
✔ cloud sync owner context composes room helpers and per-tab client identity through dedicated seams (7.3778ms)
✔ cloud sync owner context uses the public room for gate rows when no room URL is selected (0.6361ms)
✔ cloud sync owner context migrates schema-1 private credentials to schema 2 with JWT expiry (0.7835ms)
✔ cloud sync owner context starts disabled realtime with an empty channel surface (0.4121ms)
✔ cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating (0.2122ms)
✔ cloud sync owner context memoizes runtime status publishes and ke
...
[trimmed 1829 chars]
```

### [PASS] Cloud sync panel-install (canonical group)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-install`
- status: **passed**
- exit code: `0`
- duration: `1678ms`

#### stdout

```text
✔ cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall (4.7937ms)
✔ cloud sync panel api install heals legacy installed markers that only preserved stale public callables (0.2886ms)
✔ cloud sync panel api install ignores stale publication epochs (3.0019ms)
✔ cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch (0.6781ms)
✔ cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup (0.6555ms)
✔ cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation (0.4925ms)
✔ cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods (0.3793ms)
✔ cloud sync panel api stable surface forwards the expected conflict identity (0.2256ms)
✔ cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots (5.6081ms)
✔ cloud sync panel api runtime status clone strips drifted realtime/polling extras (0.5025ms)
✔ cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes (0.3096ms)
✔ cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged (0.4704ms)
✔ cloud sync room mode reports a failed owner transition instead of claiming the new room is active (0.5485ms)
ℹ tests 13
ℹ suites 0
ℹ pass 13
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1576.5121

```

### [PASS] Cloud sync panel-controller (canonical group)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-controller`
- status: **passed**
- exit code: `0`
- duration: `1596ms`

#### stdout

```text
✔ cloud sync panel api republishes panel snapshot even when floating pin command throws (3.4479ms)
✔ cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws (1.2236ms)
✔ cloud sync panel api preserves thrown messages for controller-facing commands (4.704ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1500.2623

```

### [PASS] Cloud sync panel-subscriptions (canonical group)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-subscriptions`
- status: **passed**
- exit code: `0`
- duration: `1593ms`

#### stdout

```text
✔ cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets (5.0595ms)
✔ cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App (1.1912ms)
✔ cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener (4.9228ms)
✔ cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles (0.8991ms)
✔ cloud sync async family runner blocks re-entrant conflicting targets before the first run settles (0.9282ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1496.5892

```

### [PASS] Cloud sync panel-snapshots (canonical group)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-panel-snapshots`
- status: **passed**
- exit code: `0`
- duration: `1680ms`

#### stdout

```text
✔ cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors (2.5665ms)
✔ cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors (0.6321ms)
✔ cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths (3.4592ms)
✔ cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids deadline timer churn for unchanged snapshots (0.9552ms)
✔ cloud sync panel snapshot controller does not create deadline timer until a tabs-gate subscriber exists (0.4366ms)
✔ cloud sync panel snapshot controller uses timer-driven tabs-gate minute updates when no source subscription exists (5.7927ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1585.7853

```

### [PASS] Cloud sync sync-ops (canonical group)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-sync-ops`
- status: **passed**
- exit code: `0`
- duration: `3817ms`

#### stderr

```text
[serial-tests batch 1/5] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/5] ready
[serial-tests batch 1/5] ok (610ms)
[serial-tests batch 2/5] 3 files (tests/cloud_sync_gateway_runtime.test.ts … tests/cloud_sync_room_scope_runtime.test.ts)
[serial-tests batch 2/5] ready
[serial-tests batch 2/5] ok (557ms)
[serial-tests batch 3/5] 3 files (tests/cloud_sync_owner_gateway_io_runtime.test.ts … tests/cloud_sync_room_commands_runtime.test.ts)
[serial-tests batch 3/5] ready
[serial-tests batch 3/5] ok (1.5s)
[serial-tests batch 4/5] 3 files (tests/cloud_sync_site2_sketch_behavior_runtime.test.ts … tests/cloud_sync_sketch_pull_load_runtime.test.ts)
[serial-tests batch 4/5] ready
[serial-tests batch 4/5] ok (617ms)
[serial-tests batch 5/5] 1 file (tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 5/5] ready
[serial-tests batch 5/5] ok (365ms)
[serial-tests] completed 13 files in 3.6s across 5 batches

```

#### stdout

```text
✔ cloud sync pull coalescer collapses burst triggers into one run and supports cancel (3.3222ms)
✔ cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels (0.5319ms)
✔ cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics (0.2919ms)
✔ cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers (0.8973ms)
✔ cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run (0.4651ms)
✔ cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles (0.5113ms)
✔ cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists (0.4668ms)
✔ cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse (0.3798ms)
✔ cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst (0.3708ms)
✔ cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles (0.5497ms)
✔ cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles (0.4798ms)
✔ cloud sync pull coalescer reports synchronous run failures and recovers for later work (0.3422ms)
✔ cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires (0.161ms)
✔ cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run (0.1996ms)
✔ cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run (0.1848ms)
✔ cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted (0.1849ms)
✔ cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window (1.4702ms)
✔ cloud sync realtime connecting/failure/dispose markers share one canonical branch owner (0.7132ms)
✔ cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner (0.2534ms)
✔ cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish (0.4088ms)
✔ cloud sync realtime subscribed marker only issues a gap pull after a resubscribe (0.6809ms)
✔ cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe (0.3325ms)
✔ cloud sync realtime beforeunload cleanup removes the current channel through the installed listener (0.298ms)
✔ cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label (0.244ms)
✔ cloud sync realtime disconnected marker can publish a preserved error in one canonical transition (0.2711ms)
✔ cloud sync realtime disposed marker clears stale errors from the final disabled snapshot (0.2682ms)
✔ cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains (0.1576ms)
✔ cloud sync realtime hint does not send when the subscribed status no longer has a live channel (0.1069ms)
✔ cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values (0.1805ms)
✔ cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets (1.9511ms)
✔ cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets (0.5746ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 559.8831
[WardrobePro][error] Error: offline
    at fetchFn (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_gateway_runtime.test.ts:235:13)
    at postGateway (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_gateway.ts:99:26)
    at getGatewayRow (C:\Users\יעקב\Downloads\pro\latestzip\esm\native\services\cloud_sync_gateway.ts:178:28)
    at TestContext.<anonymous> (C:\Users\יעקב\Downloads\pro\latestzip\tests\cloud_sync_gateway_runtime.test.ts:230:25)
    at async Test.run (node:internal/test_runner/test:1332:7)
    at async Test.processPendingSubtests (node:internal/test_runner/test:911:7)
✔ cloud sync gateway reads only through a signed room request and normalizes the row contract (2.2855ms)
✔ cloud sync gateway returns null for a missing room without exposing a table query (0.2217ms)
✔ cloud sync gateway writes with an expected revision and parses the committed revision (0.2763ms)
✔ cloud sync gateway exposes a stale-write conflict as data for a bounded merge retry (0.2788ms)
✔ cloud sync gateway issues public and private signed credentials without accepting client room ids (0.3573ms)
✔ cloud sync gateway preserves auth expiry, rate-limit, and network failures (3.3067ms)
✔ cloud sync gateway renews a private room without allowing a room change (0.3567ms)
✔ signed-room SQL removes browser CRUD and requires tenant/sto
...
[trimmed 14256 chars]
```

### [PASS] Cloud sync tabs-ui (canonical group)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `node tools/wp_test_group.mjs cloud-sync-tabs-ui`
- status: **passed**
- exit code: `0`
- duration: `2690ms`

#### stdout

```text
✔ floating sketch sync pin command becomes a no-op when state is unchanged (2.6155ms)
✔ floating sketch sync pin command rolls back local state on push failure (0.5015ms)
✔ floating sketch sync pin toggle command flips the current state (0.3449ms)
✔ floating sketch sync pin command preserves push failure message (0.3577ms)
✔ floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets (0.452ms)
✔ cloud sync tabs gate command skips redundant refreshes but extends stale opens (1.7061ms)
✔ cloud sync tabs gate command rolls back on push failure and reports final state (1.1131ms)
✔ cloud sync tabs gate toggle command flips the current ref state (0.4053ms)
✔ cloud sync tabs gate command preserves push failure message (0.2968ms)
✔ cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets (0.4739ms)
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
✔ cloud sync tabs gate closes stale site2 UI on initial pull miss (7.6275ms)
✔ cloud sync tabs gate uses the current gate base room for push and pull (1.4224ms)
✔ cloud sync tabs gate defaults to the public room when no room URL is selected (0.8506ms)
✔ cloud sync tabs gate public-room push is visible to site2 public-room pull (2.0864ms)
✔ cloud sync tabs gate site2 ignores local open fallback when cloud row is missing (0.6968ms)
✔ cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling (1.9509ms)
✔ cloud sync tabs gate direct push reports controller-only canonically on site2 (0.3903ms)
✔ cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App (0.8132ms)
✔ cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state (5.5053ms)
✔ [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam (2342.7801ms)
✔ [cloud-sync-ui-controller] conflict resolution uses the canonical command and reporter (0.9292ms)
✔ [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations (1.9626ms)
✔ [cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads (1.3632ms)
✔ [cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation (0.9277ms)
ℹ tests 24
ℹ suites 0
ℹ pass 24
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2590.7573

```

### [PASS] Playwright browser preflight

- id: `e2e-preflight`
- category: `e2e`
- command: `npm run e2e:smoke:preflight`
- status: **passed**
- exit code: `0`
- duration: `1240ms`

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
- duration: `1389ms`

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
- duration: `152690ms`

#### stdout

```text

> e2e:smoke
> node tools/wp_playwright_preflight.js && playwright test -c playwright.config.ts

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

Running 35 tests using 4 workers

  ✓   1 [setup] › tests\e2e\app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers (8.3s)
  ✓   4 [chromium] › tests\e2e\canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical (13.1s)
  ✓   2 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:31:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable (13.9s)
  ✓   6 [chromium] › tests\e2e\html_sanitize_security.spec.ts:4:3 › HTML sanitizer browser security › sanitizes descendants moved out of disallowed wrappers and drops foreign namespaces (2.0s)
  ✓   5 [chromium] › tests\e2e\authoring_builds.spec.ts:485:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical (22.6s)
  ✓   7 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:57:3 › Cloud Sync browser reconnect smoke › switching from public to a newly created private room replaces the active owner without reload (9.9s)
  ✓   3 [chromium] › tests\e2e\cloud_sync_conflict_resolution.spec.ts:48:3 › Cloud Sync conflict resolution contention › two browser contexts resolve the same remote entity conflict without a blind overwrite (27.6s)
  ✓   8 [chromium] › tests\e2e\resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry (14.0s)
  ✓   9 [chromium] › tests\e2e\authoring_builds.spec.ts:552:3 › Playwright authoring build coverage › manual groove controls keep independent dimensions and explicit orientation (11.2s)
  ✓  10 [chromium] › tests\e2e\smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable @critical (14.4s)
  ✓  12 [chromium] › tests\e2e\resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state (11.4s)
  ✓  14 [chromium] › tests\e2e\smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name @critical (9.0s)
  ✓  11 [chromium] › tests\e2e\user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics (21.0s)
  ✓  15 [chromium] › tests\e2e\resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry (14.0s)
  ✓  16 [chromium] › tests\e2e\smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly (8.6s)
  ✓  13 [chromium] › tests\e2e\authoring_builds.spec.ts:614:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load (23.1s)
  ✓  18 [chromium] › tests\e2e\smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar @critical (12.0s)
  ✓  17 [chromium] › tests\e2e\user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state (19.5s)
  ✓  19 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-desktop › shell, authoring and deterministic scene geometry stay valid @critical @matrix (12.6s)
  ✓  20 [chromium] › tests\e2e\authoring_builds.spec.ts:677:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load (18.0s)
  ✓  21 [chromium] › tests\e2e\smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive (10.0s)
  ✓  23 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-portrait › shell, authoring and deterministic scene geometry stay valid @critical @matrix (10.8s)
  ✓  22 [chromium] › tests\e2e\user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip (16.8s)
  ✓  24 [chromium] › tests\e2e\authoring_builds.spec.ts:734:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load (11.5s)
  ✓  25 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-xs-landscape › shell, authoring and deterministic scene geometry stay valid @critical @matrix (9.0s)
  ✓  28 [matrix] › tests\e2e\critical_matrix.spec.ts:31:7 › Targeted critical browser matrix › matrix-touch-dpr2 › shell, authoring and deterministic scene geometry stay valid @critical @matrix (8.3s)
  ✓  27 [chromium] › tes
...
[trimmed 1521 chars]
```

### [PASS] Browser dev regression performance evidence

- id: `browser-perf`
- category: `perf`
- command: `npm run perf:browser`
- status: **passed**
- exit code: `0`
- duration: `219548ms`

#### stderr

```text
[browser-perf][candidate] export.settings-tab.open exceeded budget (1047ms > 873ms)
[browser-perf][candidate] Long Task count exceeded budget (202 > 141)
[browser-perf][candidate] Long Task total exceeded budget (17725ms > 12229ms)
[browser-perf][candidate] viewer.contents.visibility.toggle UX p95 exceeded budget (446ms > 349ms)
[browser-perf][candidate] export.snapshot UX p95 exceeded budget (341ms > 300ms)
[browser-perf][candidate] export.renderSketch UX p95 exceeded budget (237ms > 187ms)
[browser-perf][candidate] viewer.contents.visibility.toggle code-execution p95 exceeded budget (446ms > 334ms)
[browser-perf][candidate] export.snapshot code-execution p95 exceeded budget (341ms > 285ms)
[browser-perf][candidate] export.renderSketch code-execution p95 exceeded budget (237ms > 172ms)
[browser-perf][candidate] settingsBackup.import.commit sustained-use drift exceeded budget (120.62% > 45%)
[browser-perf][candidate] export runtime domain code total exceeded budget (2666ms > 2240ms)
[browser-perf][candidate] other runtime domain code total exceeded budget (1579ms > 1383ms)
[browser-perf][candidate] settings-backup runtime domain drift exceeded budget (120.62% > 45%)
[browser-perf][candidate] viewer.contents.visibility.roundtrip store source time exceeded budget (467ms > 394ms)
[browser-perf][candidate] cabinet-core-authoring customer journey store source time exceeded budget (674ms > 530ms)
[browser-perf] quantitative regression candidate; running one clean confirmation

```

#### stdout

```text

> perf:browser
> node tools/wp_browser_perf_smoke.mjs --target dev --enforce


> start:e2e
> vite --configLoader native --host 127.0.0.1 --port 5175 --strictPort


  [32m[1mVITE[22m v8.2.1[39m  [2mready in [0m[1m255[22m[2m[0m ms[22m

  [32m➜[39m  [1mLocal[22m:   [36mhttp://127.0.0.1:[1m5175[22m/[39m

> start:e2e
> vite --configLoader native --host 127.0.0.1 --port 5175 --strictPort


  [32m[1mVITE[22m v8.2.1[39m  [2mready in [0m[1m250[22m[2m[0m ms[22m

  [32m➜[39m  [1mLocal[22m:   [36mhttp://127.0.0.1:[1m5175[22m/[39m
[browser-perf] regression candidate was not reproduced by the confirmation run

```

### [PASS] Browser release UX performance evidence

- id: `browser-perf-release`
- category: `perf`
- command: `npm run perf:browser:release`
- status: **passed**
- exit code: `0`
- duration: `101271ms`

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

```
