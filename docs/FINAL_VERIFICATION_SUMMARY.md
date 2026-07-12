# Final Verification Summary

- schema_version: `1`
- run_id: `365aeb39-cc8e-4390-9bb3-5e7074a7366a`
- generated_at: 2026-07-12T21:02:10.778Z
- workspace: `C:\Users\יעקב\Downloads\pro\latestzip`
- source_digest: `sha256:9203f994a61e3d20608492f1789f1e9b64b847cd38c005be98cad8dd4fe67ce8`
- source_files: **4206**
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
- duration: `3328ms`

#### stdout

```text

> test:verification-control-plane
> node tools/wp_test_group.mjs verification-control-plane

✔ generated report catalog classifies source-derived reports separately from release evidence (6.4454ms)
✔ generated report default selection excludes release evidence while explicit selection stays strict (1.1386ms)
✔ generated report selection rejects unknown ids and preserves catalog order (0.7882ms)
✔ generated report comparison ignores timestamps but catches semantic drift (19.7323ms)
✔ source identity is deterministic and changes when owned source changes (257.6974ms)
✔ lane catalog identity covers lane execution and profile membership (2.6863ms)
✔ verification payload binds results to source lane catalog and explicit selection (146.5277ms)
✔ verification validation fails closed for source drift lane drift and summary tampering (310.5493ms)
✔ state compatibility rejects legacy or stale payloads with a reset instruction (188.1961ms)
✔ summary and final status preserve environment blockers without treating them as clean proof (0.4787ms)
✔ empty and partial selections cannot report a successful closeout (113.8995ms)
✔ verification summary contract derives markdown from one validated JSON payload (170.5905ms)
✔ verification summary contract refuses to canonize a stale report (135.6482ms)
✔ verification summary contract rejects a successful focused profile as final proof (144.8549ms)
✔ closeout resolves npm through its JS CLI without a shell command fallback (6.9756ms)
✔ closeout lanes keep stable ids and include critical families (0.3811ms)
✔ group-backed closeout lanes delegate to canonical test-group package facades (4.64ms)
✔ overlay export closeout lane stays direct and grouped (0.3765ms)
✔ closeout profiles stay stable and Order PDF remains fully catalog-backed (0.4337ms)
✔ normalize args collects profiles categories lane ids skips log dir and state options (0.7435ms)
✔ closeout CLI rejects unknown flags missing values and unknown selectors (1.0527ms)
✔ final report eligibility requires a complete clean default closeout (1095.9989ms)
✔ select lanes respects profile resume and skip while preserving order (0.2975ms)
✔ environment classifier recognizes playwright/browser failures (0.2472ms)
✔ runner classifier recognizes wrapper and sandbox failures (0.194ms)
✔ summary separates passed failures environment-blocked and runner-blocked lanes (0.1355ms)
✔ state helpers merge by lane id and preserve canonical order (0.2246ms)
✔ state helpers roundtrip versioned payloads and return null when the file is missing (650.2784ms)
✔ reset-style empty state is explicitly not-run rather than passed (777.9002ms)
✔ state file resolves to explicit flag or default artifact path (0.3304ms)
✔ dependency-blocked lanes inherit environment-blocked from preflight (0.8054ms)
✔ report paths stay under docs and state path stays under artifacts (0.1137ms)
ℹ tests 32
ℹ suites 0
ℹ pass 32
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2769.1851

```

### [PASS] Toolchain surfaces (canonical group)

- id: `toolchain-surfaces`
- category: `toolchain`
- command: `npm run test:toolchain-surfaces`
- status: **passed**
- exit code: `0`
- duration: `14123ms`

#### stdout

```text

> test:toolchain-surfaces
> node tools/wp_test_group.mjs toolchain-surfaces

✔ [actions.patch types] fixture uses native @ts-expect-error contracts (7.434ms)
✔ [actions.patch types] public/backend patch contract fixture typechecks through tsc (2282.9788ms)
✔ [actions.patch types] fixture is safe if discovered by the generic runtime runner (702.249ms)
✔ package-lock resolved tarballs stay on public registries (19.5887ms)
✔ ts runtime loader loads a plain TS module (345.049ms)
✔ ts runtime loader resolves local .js imports to TS files (61.4164ms)
✔ ts runtime loader supports object mocks by exact specifier (25.3995ms)
✔ ts runtime loader supports dynamic mocks with loader context (79.4148ms)
✔ ts runtime loader cache returns the same module instance (56.0438ms)
✔ ts runtime loader transform errors include the fixture filename (31.6937ms)
✔ ts runtime loader evaluate errors include the fixture filename (24.4203ms)
✔ runtime tests do not reintroduce per-test TS VM loaders (363.473ms)
✔ AST adapter uses Oxc parser and parses TS/TSX through stable syntax helpers (13.3157ms)
✔ AST adapter preserves import, dynamic import, member, and optional-chain shapes for callers (2.6979ms)
✔ AST adapter keeps token/code-line metrics independent from tool callers (1.5858ms)
✔ AST adapter centralizes type-hardening AST counts (1.4709ms)
✔ AST adapter exposes syntax error diagnostics without TypeScript compiler API (1.0837ms)
✔ no project tool/test/runtime source imports TypeScript directly (899.9747ms)
✔ AST adapter returns injected adapter instances without exposing TypeScript module wrapping (0.5076ms)
✔ build-dist args parsing keeps clean/assets/help/unknown policy (3.1724ms)
✔ build-dist path resolution stays rooted under project dist (0.7067ms)
✔ static asset copy mirrors html/runtime/public assets into dist (89.0245ms)
✔ static asset copy keeps repository tests out of dist outputs (16.0605ms)
✔ static asset copy fails when the canonical runtime config module is missing (8.2284ms)
✔ build-dist TypeScript resolver requires local TypeScript by default (4.1243ms)
✔ build-dist TypeScript resolver allows system tsc only in explicit manual mode (2.13ms)
✔ build-dist flow fails clearly instead of using system tsc when local TypeScript is missing (2.9544ms)
✔ build-dist rejects unknown options in CI/release mode (4.0994ms)
✔ build-dist retries once without tsbuildinfo when incremental build misses entry (44.7193ms)
✔ bundle arg parsing preserves out/sourcemap/minify/rebuild policy (5.7474ms)
✔ bundle path resolution derives out dir and stale tmp cleanup dir canonically (0.6212ms)
✔ bundle dist freshness requests rebuild when entry/build info are stale or missing (12.9268ms)
✔ bundle TypeScript resolver refuses system tsc unless manual fallback is explicit (3.9894ms)
✔ bundle dist build fails before probing system tsc when local TypeScript is missing (2.9237ms)
✔ bundle artifact cleanup removes numbered chunk wrappers only (15.1879ms)
✔ bundle emit writes entry code, sourcemap comment, and extra chunks canonically (18.0563ms)
✔ bundle build config keeps strict entry signatures and named chunk policy (1.0473ms)
✔ bundle build config maps scheduler debug stats to full implementation outside client mode (0.5745ms)
✔ bundle emit writes build-mode marker next to the entry bundle (6.1031ms)
✔ check arg parsing preserves baseline/json/gate/strict flags (2.6561ms)
✔ check mode detection prefers js first and falls back to esm (1.9082ms)
✔ check syntax runner reports malformed js files (349.4688ms)
✔ check policy stats count legacy/root needles by directory (8.8267ms)
✔ check gate/strict results report regressions and clean strict state (0.8466ms)
✔ check json report preserves file and policy summary fields (0.3339ms)
✔ lint architecture contracts block new restricted imports, globals, and App bag access (22.6923ms)
✔ lint architecture contract has no unbaselined or stale violations in the current tree (12668.3317ms)
✔ lint architecture baseline count matches the json baseline file (1.4498ms)
✔ lint architecture contracts fail a new violation that is not in baseline (8.888ms)
✔ lint architecture contracts allow a violation only when it is explicitly baselined (5.4037ms)
✔ lint architecture contracts fail when a baseline entry is stale (4.5758ms)
✔ lint architecture baseline is loaded from json, not hardcoded in the tool (0.8919ms)
✔ JS-only profile is the canonical ESLint lane (6.2462ms)
✔ JS-only ESLint config omits TS/TSX files and custom parsers (4.7885ms)
✔ unsupported historical ESLint profiles are rejected (5.6819ms)
✔ JS-only keeps JS tools, tests, and config files under ESLint no-undef (4.516ms)
✔ wp_lint defaults target JS-only surfaces only (2.2547ms)
✔ modern readiness has a concrete owner for every lint matrix rule (52.1901ms)
✔ modern readiness blocks undecided manual-review targets (1.7958ms)
✔ modern readiness requires replace-by-oxlint rules to u
...
[trimmed 12677 chars]
```

### [PASS] Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `8885ms`

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
- duration: `5876ms`

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] npm run test:perf-toolchain-core
============================================================

✔ check arg parsing preserves baseline/json/gate/strict flags (2.5414ms)
✔ check mode detection prefers js first and falls back to esm (2.4214ms)
✔ check syntax runner reports malformed js files (222.3544ms)
✔ check policy stats count legacy/root needles by directory (8.1666ms)
✔ check gate/strict results report regressions and clean strict state (1.0614ms)
✔ check json report preserves file and policy summary fields (0.6447ms)
✔ perf smoke args parse lanes, scripts, baseline paths, and flags canonically (11.2375ms)
✔ perf smoke help text advertises default lanes and baseline flags (0.5275ms)
✔ perf smoke planner resolves verify lanes and dedupes script overlap (0.8366ms)
✔ perf smoke resolves the stable Node-only profile directly and keeps other scripts on npm fallback (1.5446ms)
✔ perf smoke baseline evaluation detects regressions and profile drift (3.18ms)
✔ perf smoke markdown report keeps durable tool-owned baseline anchors (2.0184ms)
✔ perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow (56.9526ms)
✔ [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules (4.9644ms)
✔ [toolchain] bundle keeps one thin entrypoint plus canonical owner modules (1.5192ms)
✔ [toolchain] check keeps one thin entrypoint plus canonical owner modules (1.1803ms)
✔ [toolchain] release keeps one thin entrypoint plus canonical owner modules (2.6182ms)
✔ [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules (2.0333ms)
✔ [toolchain] test keeps one thin entrypoint plus canonical owner modules (2.8731ms)
✔ [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules (1.3157ms)
✔ [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules (0.8774ms)
✔ [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules (0.8321ms)
✔ [toolchain] verify keeps one thin entrypoint plus canonical owner modules (0.9911ms)
✔ [toolchain] verify-parallel keeps one thin entrypoint plus canonical owner modules (0.9193ms)
✔ verify lane state parses multiple lane names plus print/dry-run/no-dedupe flags (2.8671ms)
✔ verify lane catalog lists stable lane names, flattens nested aliases, and dedupes multi-lane plans canonically (0.7842ms)
✔ verify lane planner reports the canonical script order for single and multi-lane runs (0.477ms)
✔ verify lane flow runs flattened scripts in order (0.5398ms)
✔ verify lane flow dedupes overlapping scripts across multiple lanes by default (0.3796ms)
✔ verify lane help text advertises the canonical lane catalog and multi-lane support (0.5242ms)

⚠️  Prettier check: formatting differences found (warning only).

❌ Prettier check failed in gate mode (formatting differences found).
✔ verify parallel args preserve verify flags and local concurrency controls (3.7225ms)
✔ verify parallel plan builds once and gives test shards isolated reports (1.3591ms)
✔ verify parallel flow treats prettier diffs as warnings outside gate mode (2.6912ms)
✔ verify parallel flow fails prettier diffs in gate mode and skips bundle phase (1.2796ms)

============================================================
[WardrobePro] build dist (no assets)
============================================================

✔ verify args parsing preserves gate/no-build/skip-bundle/soft-format policy (7.5015ms)
✔ format check classification warns in normal mode and fails in strict gate mode (0.7619ms)
✔ ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise (4.3483ms)
✔ verify flow orders core checks and skips bundle commands when requested (3.3073ms)
✔ verify flow runs both client release bundle targets in order when bundling is enabled (6.1484ms)
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 498.8323

============================================================
[WP Perf Smoke] npm run test:ui-react-import-hardening-contracts
============================================================

✔ ui react import hardening removes legacy React namespace access from pure ts modules (52.6048ms)
✔ ui react import hardening uses explicit named type imports for event-heavy contracts (0.7531ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 207.9338

============================================================
[WP Perf Smoke] npm run test:ui-react-jsx-hardening-contracts
============================================================

✔ ui react jsx import hardening removes legacy default React imports and namespace access from tsx modules (14.2033ms)
✔ ui react jsx import hardening uses explicit named imports in representative co
...
[trimmed 1285 chars]
```

### [PASS] Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `5559ms`

#### steps

- [PASS] overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 260ms)
- [PASS] typecheck platform: `node tools/wp_typecheck.js --mode platform` (passed, 384ms)
- [PASS] typecheck services: `node tools/wp_typecheck.js --mode services` (passed, 805ms)
- [PASS] typecheck runtime: `node tools/wp_typecheck.js --mode runtime` (passed, 413ms)
- [PASS] layer contracts: `node tools/wp_layer_contract.js` (passed, 1879ms)
- [PASS] public api contracts: `node tools/wp_public_api_contract.js` (passed, 1817ms)

### [PASS] Order PDF overlay core (canonical group)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:overlay-core`
- status: **passed**
- exit code: `0`
- duration: `5791ms`

#### stdout

```text

> test:order-pdf-surfaces:overlay-core
> node tools/wp_test_group.mjs order-pdf-overlay-core

✔ order pdf export actions honor image/gmail busy flags before starting another action (21.1692ms)
✔ order pdf interaction handlers report pointer-cancel failures instead of throwing (1.8448ms)
✔ order pdf export actions reuse cached interactive blob while draft signature is unchanged (2.7216ms)
✔ getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error (6.9418ms)
✔ getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess (0.363ms)
✔ getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text (0.2723ms)
✔ applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists (0.3967ms)
✔ readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing (2.1996ms)
✔ loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state (0.5817ms)
✔ refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it (0.6888ms)
✔ resolveOrderPdfInlineConfirmAction returns the selected follow-up draft (0.2943ms)
✔ order pdf draft effects preserves a canonical edited details pair (6.8857ms)
✔ order pdf draft effects derives the seed from canonical text when auto details are empty (0.6269ms)
✔ order PDF editor mode starts from externally-owned sketch visibility (2.3434ms)
✔ PDF annotation waits for an open sketch preview to close (0.6567ms)
✔ an externally opened sketch preview preempts PDF page annotation (0.3644ms)
✔ requesting sketch preview closes PDF annotation before the external toggle resolves (0.2926ms)
✔ canceling a pending PDF request does not reopen it after the sketch closes (0.3772ms)
✔ order pdf stage/file interactions keep close intent and PDF validation behavior canonical (3.4583ms)
✔ order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state (5.1874ms)
✔ getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes (2.3937ms)
✔ getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks (5.3843ms)
✔ bindExportApiFromModule captures the app once and returns null for missing module/app (0.7862ms)
✔ order pdf details line helpers parse and collect canonical keyed rows (6.0176ms)
✔ order pdf details line helpers preserve inline tails and positioned extras (4.4403ms)
✔ order pdf text fallback html decoder preserves newlines and common entities without a document (2.2639ms)
✔ order pdf text public seam exposes the canonical empty draft defaults (1.4106ms)
✔ order pdf text merge falls back to exact base replacement when no marker document is available (0.895ms)
✔ order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam (4.5203ms)
✔ order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear (1.9313ms)
✔ order pdf merge support resolves clean detected regions without preserving stale manual leftovers (1.0494ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5189.9194

```

### [PASS] Order PDF PDF-render batch (canonical group)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:pdf-render`
- status: **passed**
- exit code: `0`
- duration: `4823ms`

#### stdout

```text

> test:order-pdf-surfaces:pdf-render
> node tools/wp_test_group.mjs order-pdf-pdf-render

✔ [order-pdf] prepared details split can be painted without re-wrapping (16.5814ms)
✔ [order-pdf] prepared layout preserves wrapped lines and visible max-line window (0.4012ms)
✔ [order-pdf] image-pdf details text uses the canonical touched semantics (0.4966ms)
✔ order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled (33.0021ms)
✔ order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled (12.0369ms)
✔ order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled (5.5177ms)
✔ order pdf pdf-import clears saved form text and stale widget appearances for editor background (23.7003ms)
✔ order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails (3.9082ms)
✔ order pdf pdf-import extracts generated field names through the canonical document-field runtime (24.8549ms)
✔ order pdf pdf-import reads bytes from file-like objects and tolerates read failures (0.6153ms)
✔ order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page (15.3073ms)
✔ order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime (3.5691ms)
✔ order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer (1.9638ms)
✔ order pdf image-pdf export writes hidden import fields that load back into the editor (10.8902ms)
✔ order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path (4.9688ms)
✔ order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup (0.7753ms)
✔ cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly (1.7825ms)
✔ loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document (1.6128ms)
✔ loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves (0.6062ms)
✔ order pdf render helpers treat destroyed/aborted worker errors as expected cancellations (6.1337ms)
✔ loadOrderPdfFirstPage clones source bytes before handing them to pdf.js (2.1724ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4031.345

```

### [PASS] Order PDF sketch batch (canonical group)

- id: `order-pdf-sketch`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:sketch`
- status: **passed**
- exit code: `0`
- duration: `3659ms`

#### stdout

```text

> test:order-pdf-surfaces:sketch
> node tools/wp_test_group.mjs order-pdf-sketch

✔ [history-ui] suspended history shortcuts are detected from the active overlay element (1.4394ms)
✔ [history-ui] suspended history shortcuts fall back to a document-level overlay marker (0.6855ms)
✔ [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags (6.3107ms)
✔ [order-pdf] refresh-auto preserves sketch annotations while refreshing project details (1.6194ms)
✔ [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport (1.7472ms)
✔ [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space (0.2672ms)
✔ [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot (1.6776ms)
✔ [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports (0.2382ms)
✔ [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes (0.2422ms)
✔ [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads (0.5235ms)
✔ [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes (0.2184ms)
✔ [order-pdf] sketch canvas frame only commits once a real 2d context exists (0.6422ms)
✔ [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically (2.448ms)
✔ [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key (0.6394ms)
✔ [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion (0.2243ms)
✔ [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect (0.2851ms)
✔ [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point (0.3217ms)
✔ [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths (0.9051ms)
✔ [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history (0.1858ms)
✔ [order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts (0.3627ms)
✔ [order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically (0.4404ms)
✔ [order-pdf] sketch panel runtime reads drawing rects once from the measured host surface (0.2863ms)
✔ [order-pdf] sketch preview reveal scrolls the editor stage just enough to expose created images (0.2467ms)
✔ [order-pdf] sketch preview reveal does not scroll when the panel is already visible (0.1475ms)
✔ [order-pdf] sketch preview reveal uses the stage scroll container instead of the page window (0.2734ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after success (2.3206ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after failure (1.7528ms)
✔ [order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states (0.4761ms)
✔ [order-pdf] sketch preview session restores the original doors-open state after success (0.3868ms)
✔ [order-pdf] sketch preview session snapshot captures and restores the original camera pose (1.1595ms)
✔ [order-pdf] sketch preview session restores the original camera pose after success (0.4688ms)
✔ [order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z (1.5416ms)
✔ [order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew (0.445ms)
✔ [order-pdf] sketch history shortcuts are always consumed while the sketch panel is open (0.4965ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3267.8203

```

### [PASS] Order PDF export overlay batch (canonical group)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-overlay`
- status: **passed**
- exit code: `0`
- duration: `3432ms`

#### stdout

```text

> test:order-pdf-surfaces:export-overlay
> node tools/wp_test_group.mjs order-pdf-export-overlay

✔ loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data (2.2873ms)
✔ exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download (0.4579ms)
✔ exportOrderPdfImageWithDeps reports busy before building another image PDF (0.28ms)
✔ exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing (0.2553ms)
✔ loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast (0.6734ms)
✔ exportOrderPdfInteractiveWithDeps preserves the real export failure detail (0.2456ms)
✔ loadOrderPdfIntoEditorWithDeps treats canonical html-only extracted details as found fields (0.463ms)
✔ loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late (0.4974ms)
✔ order pdf overlay export ops fail fast when rasterization has no document seam (2.5288ms)
✔ order pdf overlay export ops build image attachments through the canonical attachment seam (5.4224ms)
✔ order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages (1.1996ms)
✔ order pdf overlay image rasterization restores first-page annotations clipped inside repainted PDF text boxes (1.4837ms)
✔ order pdf export single-flight reuses duplicate same-key work per app and clears after completion (3.1255ms)
✔ order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps (0.6987ms)
✔ order pdf export single-flight derives stable load keys and maps them back to action kinds (0.7005ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2872.1949

```

### [PASS] Order PDF export builders batch (canonical group)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-builders`
- status: **passed**
- exit code: `0`
- duration: `4320ms`

#### stdout

```text

> test:order-pdf-surfaces:export-builders
> node tools/wp_test_group.mjs order-pdf-export-builders

✔ resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values (1.0184ms)
✔ resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so (0.3411ms)
✔ resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides (2.2148ms)
✔ buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable (662.0037ms)
✔ captureOrderPdfCompositeImages applies sketch annotations after base composite capture (4.6875ms)
✔ buildOrderPdfDocumentResult embeds the primary PDF page annotation layer at high raster density (2.4994ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3862.6539

```

### [PASS] Order PDF export capture batch (canonical group)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-capture`
- status: **passed**
- exit code: `0`
- duration: `3567ms`

#### stdout

```text

> test:order-pdf-surfaces:export-capture
> node tools/wp_test_group.mjs order-pdf-export-capture

✔ order pdf capture cache signature falls back cleanly when state is missing or invalid (1.4707ms)
✔ order pdf capture cache returns cloned bytes instead of live cache buffers (1.0391ms)
✔ order pdf capture cache reuses sketch base assets while signature is unchanged (0.7624ms)
✔ order pdf capture cache ignores pdf editor draft changes but invalidates on build/config changes (0.4974ms)
✔ order pdf capture cache signature ignores sketch-only annotation changes (1.6013ms)
✔ export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas (5.3184ms)
✔ export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures (0.7465ms)
✔ order PDF render/sketch composite preserves chest live viewport and screenshot note mapping (2.3967ms)
✔ order PDF open/closed composite preserves corner live viewport and screenshot note mapping (1.1401ms)
✔ export order pdf ops factory exposes stable draft/export surface (5.665ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3126.4553

```

### [PASS] Order PDF export text batch (canonical group)

- id: `order-pdf-export-text`
- category: `verify`
- command: `npm run test:order-pdf-surfaces:export-text`
- status: **passed**
- exit code: `0`
- duration: `2731ms`

#### stdout

```text

> test:order-pdf-surfaces:export-text
> node tools/wp_test_group.mjs order-pdf-export-text

✔ createOrderPdfRenderAnnotationLayerPngOp renders first-page PDF annotations to PNG bytes (2.0015ms)
✔ listOrderPdfSketchStrokes keeps only valid strokes for the requested page (0.1801ms)
✔ paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas (0.2838ms)
✔ paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser (0.1701ms)
✔ compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer (0.4227ms)
✔ paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite (0.6552ms)
✔ export order pdf text ops compose details, bidi, and layout behavior from one canonical seam (2.6502ms)
✔ export order pdf text ops keep canonical draft defaults and bidi stabilization behavior (1.5357ms)
✔ export order pdf text uses wardrobe-type depth fallback only when raw depth is missing (0.3605ms)
✔ export order pdf text includes classic cornice only when the main cornice flag is enabled (0.2362ms)
✔ export order pdf text omits cornice when the main cornice flag is disabled (0.2457ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2287.209

```

### [PASS] Sketch manual/hover (canonical group)

- id: `sketch-manual-hover`
- category: `verify`
- command: `npm run test:sketch-surfaces:manual-hover`
- status: **passed**
- exit code: `0`
- duration: `3043ms`

#### stdout

```text

> test:sketch-surfaces:manual-hover
> node tools/wp_test_group.mjs sketch-manual-hover

✔ drawer remove plan resolves exact typed targets and rejects ambiguous or cross-module hits (4.9411ms)
✔ drawer remove plan mutates only the resolved sketch external target (1.0294ms)
✔ drawer remove plan applies sketch internal and standard external mutations without cross-family spillover (0.6137ms)
✔ sketch internal removal uses exact IDs regardless of overlap, list order, or cassette slot (0.926ms)
✔ sketch internal resolver rejects part identities that do not encode the exact module scope (0.3174ms)
✔ sketch external removal never crosses module, box, or list scopes for duplicate IDs (0.7775ms)
✔ ambiguous duplicate records and duplicate box identities are rejected without mutation (0.361ms)
✔ drawer remove commit owns the structural patch boundary and applies one immutable plan (0.4558ms)
✔ drawer remove commit reports false when the patch is skipped or no target changes (0.3184ms)
✔ manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner (6.8791ms)
✔ manual-layout flow skips auto-filled shelves colliding with sketch drawers and warns once (4.1083ms)
✔ manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata (1.1254ms)
✔ manual-layout sketch hover match state accepts a recent matching hover snapshot (2.4039ms)
✔ manual-layout sketch hover match state rejects stale or mismatched hover snapshots (0.5558ms)
✔ manual-layout sketch hover match state rejects records that still carry retired host identity fields (1.7019ms)
✔ manual-layout hover intent readers decode canonical versioned commands (3.5497ms)
✔ manual-layout hover intent readers reject malformed and non-exact command payloads (0.3952ms)
✔ manual-layout command decoder rejects missing, unknown, and extra fields for every mutation family (0.8244ms)
✔ manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides (4.826ms)
✔ manual-layout hover module context falls back to the corner root config when no cell config exists (1.9419ms)
✔ manual-layout module box preview routes shelf hover through the focused box owner (7.7433ms)
✔ manual-layout module stack preview routes ext drawers through the focused stack owner (6.545ms)
✔ manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools (8.4937ms)
✔ manual-layout sketch hover targets free-box content before a module selector behind it (3.4114ms)
✔ manual-layout sketch hover falls back to standalone free placement when no selector is hit (2.3492ms)
✔ manual-layout sketch external drawer hover marks standard external drawers for removal only (1.5823ms)
✔ manual-layout sketch internal drawer hover ignores standard external drawers (0.4586ms)
✔ manual-layout free-box external drawer hover prefers the drawer stack over a nearby shelf removal (3.8388ms)
✔ module surface hover writes shelf add intent so click follows the hover preview (8.5258ms)
✔ module surface hover writes rod add intent so stale shelf-remove hover cannot steal the click (2.1273ms)
✔ module preview flow probes existing shelf removal before drawer stack add previews (3.4389ms)
✔ existing vertical remove helper is a no-op when nothing removable is under the cursor (1.12ms)
✔ door action hover state resolves the nearest door leaf owner with metrics (1.0893ms)
✔ manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors (3.8737ms)
✔ manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool (4.1418ms)
✔ manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout (0.5354ms)
✔ recent sketch hover matching honors tool, age, free-placement, and host identity together (3.3525ms)
✔ recent sketch hover matching rejects retired or malformed host identity records (0.4946ms)
✔ manual tool access prefers canonical mode-state value before runtime tools fallback (1.5707ms)
✔ manual tool access falls back to runtime tools when mode-state tool is absent (0.3459ms)
✔ sketch-free host falls back to internal grid maps before the zero-door hinged default host (2.7831ms)
✔ sketch-free host uses the hinged zero-door fallback only when no config or grid host exists (0.5963ms)
ℹ tests 42
ℹ suites 0
ℹ pass 42
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2596.7383

```

### [PASS] Sketch box/hover (canonical group)

- id: `sketch-box-hover`
- category: `verify`
- command: `npm run test:sketch-surfaces:box-hover`
- status: **passed**
- exit code: `0`
- duration: `2003ms`

#### stdout

```text

> test:sketch-surfaces:box-hover
> node tools/wp_test_group.mjs sketch-box-hover

✔ sketch-box door preview stays inert for hinge toggles when the active segment has no door (2.4695ms)
✔ sketch-box door preview resolves canonical remove metadata for an existing double-door pair (24.6045ms)
✔ sketch-box door preview keeps explicit hinge/remove metadata for a single existing door (0.6746ms)
✔ sketch-box doors upsert single-door records through the canonical id factory and segment placement seam (2.9668ms)
✔ sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair (21.6835ms)
✔ sketch-box doors remove a focused segment door without disturbing the other segment (0.7468ms)
✔ sketch-box doors treat rows inside the same divided column as independent cells (2.5154ms)
✔ sketch-box doors preserve stored groove line counts when rewriting door records (1.6825ms)
✔ resolved module boxes ignore free-placement items and the requested ignoreBoxId (3.5244ms)
✔ resolved module boxes reject string-encoded live geometry (0.2316ms)
✔ vertical center clamp respects module bounds even when desired center is far outside range (0.2397ms)
✔ placement resolution can ignore the edited box id instead of blocking on itself (0.6973ms)
✔ placement reports blocked when overlap chain reaches the module ceiling and floor (0.9468ms)
✔ overlap primitive still allows exact edge contact without treating it as overlap (0.1383ms)
✔ placement resolution can be confined to the pointer slot instead of jumping across blockers (0.5699ms)
✔ placement resolution reports blocked when vertical content blockers leave no valid box slot (0.2511ms)
✔ sketch-box runtime parses width/depth overrides and rejects unrelated tools (2.163ms)
✔ sketch-box runtime geometry center-snaps and width-clamps inside the module span (0.7602ms)
✔ sketch-box runtime geometry rejects string-encoded live overrides (0.318ms)
✔ sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match (0.9187ms)
✔ sketch-box runtime hit scan rejects string-encoded live box geometry (0.4048ms)
✔ sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized (2.1725ms)
✔ sketch-box free-placement commit does not derive floorY from string measurements (0.574ms)
✔ sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column (0.9685ms)
✔ sketch-box free-placement commit clears hover when the canonical commit finishes without next hover (0.4471ms)
✔ sketch-box free-placement commit stays inert when no canonical host is available (0.5063ms)
✔ sketch-box door visuals forward mirror state, mirror layout, effective frame style, and deep pick meta through the special visual path (7.4073ms)
✔ sketch-box door visuals use styled profile visuals for in-cabinet whole box doors (2.2354ms)
✔ free-box click fallback does not turn a module hit into a free-placement box (1.7595ms)
✔ free-box click fallback still creates a free-placement box when no module was hit (1.4318ms)
✔ free-box click fallback rejects string-encoded plane-hit geometry (0.251ms)
✔ free-box click preserves a real recent free-placement hover even when a module is behind it (0.5335ms)
✔ sketch external drawers hover context loads persisted module stacks for remove/overlap handling (8.2275ms)
✔ free-box content click stays on the free box even when a wardrobe module is behind it (0.9402ms)
✔ free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks (2.9756ms)
✔ module sketch hover blocks collisions between internal and external drawer stacks (0.6801ms)
✔ free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind (1.6309ms)
✔ module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit (2.1556ms)
✔ module sketch external drawers preview reads the selector front envelope instead of the inner cavity only (1.144ms)
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1596.8519

```

### [PASS] Sketch free-boxes (canonical group)

- id: `sketch-free-boxes`
- category: `verify`
- command: `npm run test:sketch-surfaces:free-boxes`
- status: **passed**
- exit code: `0`
- duration: `2668ms`

#### stdout

```text

> test:sketch-surfaces:free-boxes
> node tools/wp_test_group.mjs sketch-free-boxes

✔ manual-layout free-box shelf grid scopes five shelves to the active split cell (3.4792ms)
✔ manual-layout free-box shelf grid marks grid-6 as blocked when the active cell is too short (0.2802ms)
✔ manual-layout free-box shelf grid commit writes shelves into the no-main free box (3.5074ms)
✔ manual-layout free-box shelf grid blocked commit consumes click without mutating (1.0106ms)
✔ manual-layout free-box shelf grid rejects partial hover records without mutating content (0.3766ms)
✔ manual-layout free-box shelf grid blocks shelves that would collide with an existing rod (0.6167ms)
✔ manual-layout free-box rod hover can target an existing shelf for removal (1.5194ms)
✔ manual-layout free-box shelf edit can target an existing rod or storage barrier for removal (1.5585ms)
✔ manual-layout free-box commits cross-kind removal hovers from shelf and rod tools (3.2693ms)
✔ manual-layout free-box storage removal hover covers the whole existing barrier height (1.1062ms)
✔ manual-layout regular shelf hover targets a free-box part hit before the wardrobe selector behind it (5.2343ms)
✔ preset layout free-box plan maps storage shortcut into active split cell contents (1.4289ms)
✔ preset layout shortcut hover and click target the free box instead of the wardrobe behind it (3.4038ms)
✔ brace-shelves shortcut toggles an existing free-box shelf instead of the main wardrobe (1.945ms)
✔ sketch-free box content preview short-circuits unsupported content kinds before target scanning (1.5294ms)
✔ sketch-free box content preview keeps door-hinge hover inert when the active segment has no door (3.2947ms)
✔ sketch-free box content preview returns canonical double-door removal metadata for an existing pair (16.6191ms)
✔ sketch-free external drawer preview blocks construction on existing free-box shelf content (5.2828ms)
✔ sketch-free vertical preview keeps removal hover available while the active tool is sketch external drawers (3.0826ms)
✔ sketch-free shelf removal accepts direct shelf-board hits with the same generous tolerance as wardrobe shelves (0.916ms)
✔ sketch-free placement hover record keeps canonical host/free-placement fields (3.0844ms)
✔ sketch-free placement commit adds a free-placement box through the canonical modules patch seam (3.0474ms)
✔ sketch-free placement commit rejects string-encoded internal hover geometry (0.5082ms)
✔ sketch-free placement remove fails closed when its target id is missing (0.4818ms)
✔ sketch-free placement content commit routes free-placement door removal through the canonical content seam (4.5195ms)
✔ sketch-free placement content commit consumes blocked no-room hovers without mutating (1.8311ms)
✔ sketch-free placement ext-drawer removal also removes regular external drawers in the same free box (1.0997ms)
✔ sketch-free vertical tools commit cross-kind vertical-content removal hovers (1.3932ms)
✔ sketch-free stack tools commit existing vertical-content removal hovers before adding drawers (0.5912ms)
✔ sketch-free regular external drawers can add a shoe drawer without falling back to module drawers (3.4069ms)
✔ sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top (2.4426ms)
✔ sketch-free regular external drawers update shoe and regular count independently in the same cell (0.9395ms)
✔ sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks (2.217ms)
✔ sketch free divider target scan projects fallback pointer to the box front plane (0.3757ms)
✔ sketch free surface target scan rejects string-encoded free-box geometry (0.2136ms)
✔ sketch free content target scan projects profile-door hits to the canonical box front plane (0.3044ms)
✔ sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry (1.3983ms)
✔ sketch free base adornment preview rejects string-encoded current base dimensions (1.7926ms)
✔ free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset (2.6936ms)
✔ free-box attach still prefers top/bottom when the cursor is only outside vertically (0.4366ms)
✔ free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right (0.4482ms)
✔ free-box attach below still allows a true staircase corner touch before detaching (0.3561ms)
✔ free-box attach still prefers side attachment when the cursor is clearly outside only on X (0.3381ms)
✔ free-box attach rejects string-encoded geometry inputs (0.2121ms)
✔ free-box hover attach below falls back to a valid floor-safe side placement when room floor blocks under-stack placement (7.0545ms)
✔ free-box hover attach above keeps plane X even when surface hit lands on the left wall of the target box (0.9035ms)
✔ free-box hover near lower corners stays symmetric wh
...
[trimmed 1941 chars]
```

### [PASS] Sketch render/visuals (canonical group)

- id: `sketch-render-visuals`
- category: `verify`
- command: `npm run test:sketch-surfaces:render-visuals`
- status: **passed**
- exit code: `0`
- duration: `1823ms`

#### stdout

```text

> test:sketch-surfaces:render-visuals
> node tools/wp_test_group.mjs sketch-render-visuals

✔ render sketch box fronts reuses one mirror material across mirrored external drawers (8.772ms)
✔ render sketch box fronts reject string-encoded live external drawer positions (0.4302ms)
✔ render sketch box fronts do not parse string-encoded live external drawer counts (1.0978ms)
✔ render sketch box external drawers flush a top-anchored free-box stack to the box face edge (5.0438ms)
✔ interior sketch style, feature flags, and divider state read only canonical input fields (3.5439ms)
✔ interior sketch input contract fails fast when the config snapshot is missing (1.0495ms)
✔ renderSketchFreeBoxDimensions keeps height on the right and depth on the left (2.5048ms)
✔ renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions (0.3299ms)
✔ renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries (1.9879ms)
✔ renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths (1.3347ms)
✔ renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label (0.5184ms)
✔ render interior sketch layout geometry clamps box size and center inside the internal span (2.463ms)
✔ render sketch box shell geometry rejects string-encoded live box dimensions (0.7731ms)
✔ render interior sketch layout geometry rejects string-encoded live numeric overrides (0.732ms)
✔ render interior sketch layout geometry rejects string-encoded runtime placement args (0.3698ms)
✔ render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry (0.3402ms)
✔ render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks (2.3156ms)
✔ render interior sketch layout resolves content segments from divider-separated spans (1.6776ms)
✔ render interior sketch support clamps placement, emits shelf pins, and keeps brace side seams disabled (1.7312ms)
✔ render interior sketch support locator resolves the matching box by center span (0.8724ms)
✔ render interior sketch shelves emit folded contents with measured shelf clearance (1.2353ms)
✔ render interior sketch support rejects string-encoded shelf and storage geometry (0.644ms)
✔ removed frame side sketch shelves preserve glass and double variants on forced brace geometry (0.592ms)
✔ render interior sketch module shelves keep brace shelves on the brace material path (4.3094ms)
✔ render interior sketch rods use the installed rod owner when it succeeds and local visual rod when it rejects (1.0757ms)
✔ render interior sketch rods report per-item failures and continue rendering later rods (0.303ms)
✔ render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts (5.3909ms)
✔ render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists (0.8541ms)
✔ render interior sketch visuals expose callable factories only for function inputs (0.4076ms)
✔ sketch front visual state reuses canonical full-door mirror/glass maps for split door segments (5.6251ms)
ℹ tests 30
ℹ suites 0
ℹ pass 30
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1388.8104

```

### [PASS] Cloud sync lifecycle (canonical group)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:lifecycle`
- status: **passed**
- exit code: `0`
- duration: `9623ms`

#### stderr

```text
[serial-tests batch 1/6] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/6] ok (385ms)
[serial-tests batch 2/6] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/6] ok (3.0s)
[serial-tests batch 3/6] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/6] ok (826ms)
[serial-tests batch 4/6] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_realtime_runtime.test.ts)
[serial-tests batch 4/6] ok (1.1s)
[serial-tests batch 5/6] 3 files (tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 5/6] ok (3.3s)
[serial-tests batch 6/6] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 6/6] ok (615ms)
[serial-tests] completed 16 files in 9.2s across 6 batches

```

#### stdout

```text

> test:cloud-sync-surfaces:lifecycle
> node tools/wp_test_group.mjs cloud-sync-lifecycle

✔ cloud sync access reads canonical services panelApi and ignores legacy root alias (1.0213ms)
✔ cloud sync access ensures canonical service state on services root (0.251ms)
✔ cloud sync access exposes test hooks through canonical service state only (0.2136ms)
✔ cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required (3.7755ms)
✔ cloud sync feedback prefers preserved error messages when available (0.4556ms)
✔ cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller (86.0674ms)
✔ cloud sync panel actions fall back to derived status when panel snapshot api is unavailable (3.5916ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 319.6036
✔ cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping (2.866ms)
✔ cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly (1.8455ms)
✔ cloud sync install support preserves backward compatibility for untagged published dispose refs (1.5473ms)
✔ cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose (1.9537ms)
✔ cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch (0.5671ms)
✔ cloud sync install support clears only canonical published slots and preserves unrelated state (1.4303ms)
✔ cloud sync install support preserves canonical test hooks by default while clearing published slots (0.2908ms)
✔ cloud sync install support drops test hooks when cleanup opts out of hook preservation (0.5058ms)
✔ cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/wrappers (25.691ms)
✔ cloud_sync lifecycle: no timer/listener leaks after dispose (2.2792ms)
✔ cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle (2.7219ms)
✔ cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose (3.3566ms)
✔ cloud_sync lifecycle: dispose clears published public state but preserves test hooks (2.4922ms)
✔ cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes (3.0963ms)
✔ cloud_sync lifecycle: stale held dispose refs do not clear newer public state (3.3126ms)
✔ cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap (2.0016ms)
✔ cloud_sync lifecycle: failed reinstall clears stale public state when config disappears (0.9988ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2911.6343
✔ owned cloud-sync family flight registers immediately for synchronous re-entry reuse (1.1552ms)
✔ owned cloud-sync family flight returns busy for synchronous conflicting re-entry (0.9689ms)
✔ runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work (0.3409ms)
✔ readCfg normalizes deps config and clamps site2 sketch max age (1.912ms)
✔ cloud sync config browser helpers keep URL params and site2 detection canonical (1.1049ms)
✔ cloud sync config shared helpers keep rest URL and headers canonical (0.2575ms)
✔ cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint (6.6106ms)
✔ cloud sync delete temp does not stamp pull activity when the preflight row read fails (1.188ms)
✔ cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors (0.6188ms)
✔ cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work (1.3011ms)
✔ cloud sync delete-temp tracks preflight pull activity and settled push activity canonically (1.3686ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 756.618
✔ cloud sync attention pulls still fire on focus when eligible (4.8273ms)
✔ cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown (1.054ms)
✔ cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return (2.2968ms)
✔ cloud sync attention online pull does not stay blocked by subscribed status without a live channel (0.6688ms)
✔ cloud sync attention online handler reports pull failures without breaking later attention events (2.1003ms)
✔ cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes (1.5032ms)
✔ cloud sync attention pulls stay inert after the lifecycle guard flips stale before cleanup (0.5875ms)
✔ cloud sync diagnostics storage listener stays inert after the lifecycle guard flips stale (0.3938ms)
✔ cloud sync realtime
...
[trimmed 3287 chars]
```

### [PASS] Cloud sync main-row (canonical group)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:main-row`
- status: **passed**
- exit code: `0`
- duration: `4193ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (689ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_mutation_commands_runtime.test.ts … tests/cloud_sync_owner_context_runtime.test.ts)
[serial-tests batch 2/3] ok (2.5s)
[serial-tests batch 3/3] 1 file (tests/cloud_sync_status_install_runtime.test.ts)
[serial-tests batch 3/3] ok (608ms)
[serial-tests] completed 7 files in 3.8s across 3 batches

```

#### stdout

```text

> test:cloud-sync-surfaces:main-row
> node tools/wp_test_group.mjs cloud-sync-main-row

✔ cloud sync main row skips remote apply churn when newer rows carry the same payload (3.3799ms)
✔ cloud sync main row still applies remote payloads when the effective collections actually change (1.5091ms)
✔ cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged (0.3977ms)
✔ cloud sync main row seeds a missing row from local collections on the initial pull (5.8918ms)
✔ cloud sync main row initial seed reuses returned representation when the upsert already returns the row (2.2194ms)
✔ cloud sync main row push publishes changed collections once and skips identical repeats (3.1033ms)
✔ cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch (0.8077ms)
✔ cloud sync main row reuses the same pending push promise for duplicate direct pushes (0.9983ms)
✔ cloud sync main row pull applies newer remote payloads into local storage (1.0211ms)
✔ cloud sync main row first remote pull hydrates app maps even when stored hash already matches remote (0.8324ms)
✔ cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull (0.7255ms)
✔ cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push (0.5823ms)
✔ cloud sync main row push applies settled remote payload locally without forcing a follow-up pull (0.8403ms)
✔ cloud sync main row collapses pull retries during a push into one post-push follow-up pull (0.981ms)
✔ cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests (0.7652ms)
✔ cloud sync main row notifies push-settled listeners only after the push flight has cleared (0.7337ms)
✔ cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests (0.5369ms)
✔ cloud sync main row shares app-scoped push ownership across main-row instances for the same App (0.6765ms)
✔ cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run (0.2443ms)
✔ cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up (0.6597ms)
✔ cloud sync main row preserves one follow-up push request raised while a push is already in flight (0.9579ms)
✔ cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first (1.6373ms)
✔ cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce (0.4998ms)
✔ cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull (0.7014ms)
✔ cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys (1.1868ms)
✔ cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner (0.3838ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 605.413
✔ cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results (2.4742ms)
✔ cloud sync mutation cleanup commands return cancelled when confirm is declined (0.333ms)
✔ cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel (0.3589ms)
✔ cloud sync delete-temp commands reuse one pending models cleanup flow per app (2.8616ms)
✔ cloud sync delete-temp commands block conflicting cleanup family actions while one is pending (0.6866ms)
✔ cloud sync owner context composes room helpers and per-tab client identity through dedicated seams (6.6166ms)
✔ cloud sync owner context uses the public room for gate rows when no room URL is selected (0.7311ms)
✔ cloud sync owner context starts disabled realtime with an empty channel surface (0.5202ms)
✔ cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating (0.219ms)
✔ cloud sync owner context memoizes runtime status publishes and keeps the canonical status surface live (0.8379ms)
✔ cloud sync owner context keeps held status refs alive across owner reinstall (1.6294ms)
✔ cloud sync owner context ignores stale status publishes after a newer owner takes over (1.0364ms)
✔ cloud sync owner context ignores late status publishes after publication teardown (1.0568ms)
✔ cloud sync owner context ignores stale publication cleanup after a newer owner takes over (0.8913ms)
✔ cloud sync owner context tombstones held status refs after published-state cleanup (0.6117ms)
✔ cloud sync owner context self-heals leaked enumerable status markers even when the runtime snapshot is unchanged (0.5108ms)
✔ cloud sync owner context self-heals drifted canonical status surfaces even when runtime snapshot is unchanged (0.5097ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2388.0198
✔ cloud sync status i
...
[trimmed 714 chars]
```

### [PASS] Cloud sync panel-install (canonical group)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-install`
- status: **passed**
- exit code: `0`
- duration: `2810ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-install
> node tools/wp_test_group.mjs cloud-sync-panel-install

✔ cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall (6.8389ms)
✔ cloud sync panel api install heals legacy installed markers that only preserved stale public callables (0.3625ms)
✔ cloud sync panel api install ignores stale publication epochs (0.4713ms)
✔ cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch (0.7871ms)
✔ cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup (0.6355ms)
✔ cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation (0.5491ms)
✔ cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods (0.3843ms)
✔ cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots (5.6663ms)
✔ cloud sync panel api runtime status clone strips drifted realtime/polling extras (0.5003ms)
✔ cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes (0.3542ms)
✔ cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged (0.5384ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2345.5375

```

### [PASS] Cloud sync panel-controller (canonical group)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-controller`
- status: **passed**
- exit code: `0`
- duration: `2985ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-controller
> node tools/wp_test_group.mjs cloud-sync-panel-controller

✔ cloud sync panel api republishes panel snapshot even when floating pin command throws (6.3203ms)
✔ cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws (2.4676ms)
✔ cloud sync panel api preserves thrown messages for controller-facing commands (9.137ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2473.3573

```

### [PASS] Cloud sync panel-subscriptions (canonical group)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-subscriptions`
- status: **passed**
- exit code: `0`
- duration: `2789ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-subscriptions
> node tools/wp_test_group.mjs cloud-sync-panel-subscriptions

✔ cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets (6.1845ms)
✔ cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App (2.2483ms)
✔ cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener (6.5399ms)
✔ cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles (1.4115ms)
✔ cloud sync async family runner blocks re-entrant conflicting targets before the first run settles (1.2791ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2361.7385

```

### [PASS] Cloud sync panel-snapshots (canonical group)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:panel-snapshots`
- status: **passed**
- exit code: `0`
- duration: `3414ms`

#### stdout

```text

> test:cloud-sync-surfaces:panel-snapshots
> node tools/wp_test_group.mjs cloud-sync-panel-snapshots

✔ cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors (3.0229ms)
✔ cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors (1.0607ms)
✔ cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths (3.5701ms)
✔ cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids deadline timer churn for unchanged snapshots (1.0708ms)
✔ cloud sync panel snapshot controller does not create deadline timer until a tabs-gate subscriber exists (0.6291ms)
✔ cloud sync panel snapshot controller uses timer-driven tabs-gate minute updates when no source subscription exists (2.976ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2911.285

```

### [PASS] Cloud sync sync-ops (canonical group)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:sync-ops`
- status: **passed**
- exit code: `0`
- duration: `4107ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (729ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_rest_runtime.test.ts … tests/cloud_sync_site2_sketch_behavior_runtime.test.ts)
[serial-tests batch 2/3] ok (2.2s)
[serial-tests batch 3/3] 3 files (tests/cloud_sync_sketch_ops_runtime.test.ts … tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 3/3] ok (728ms)
[serial-tests] completed 9 files in 3.7s across 3 batches

```

#### stdout

```text

> test:cloud-sync-surfaces:sync-ops
> node tools/wp_test_group.mjs cloud-sync-sync-ops

✔ cloud sync pull coalescer collapses burst triggers into one run and supports cancel (3.4514ms)
✔ cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels (0.3779ms)
✔ cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics (0.5009ms)
✔ cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers (1.4211ms)
✔ cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run (0.4635ms)
✔ cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles (0.6185ms)
✔ cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists (0.5895ms)
✔ cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse (0.6115ms)
✔ cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst (0.473ms)
✔ cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles (0.6215ms)
✔ cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles (0.6131ms)
✔ cloud sync pull coalescer reports synchronous run failures and recovers for later work (0.6259ms)
✔ cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires (0.3856ms)
✔ cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run (0.3969ms)
✔ cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run (0.5542ms)
✔ cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted (0.5754ms)
✔ cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window (2.3532ms)
✔ cloud sync realtime connecting/failure/dispose markers share one canonical branch owner (0.9796ms)
✔ cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner (0.5082ms)
✔ cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish (0.8314ms)
✔ cloud sync realtime subscribed marker only issues a gap pull after a resubscribe (1.4119ms)
✔ cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe (1.1186ms)
✔ cloud sync realtime beforeunload cleanup removes the current channel through the installed listener (1.0805ms)
✔ cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label (0.2755ms)
✔ cloud sync realtime disconnected marker can publish a preserved error in one canonical transition (0.4209ms)
✔ cloud sync realtime disposed marker clears stale errors from the final disabled snapshot (0.4321ms)
✔ cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains (0.2907ms)
✔ cloud sync realtime hint does not send when the subscribed status no longer has a live channel (0.1622ms)
✔ cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values (0.2342ms)
✔ cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets (4.2211ms)
✔ cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets (1.125ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 662.8911
✔ cloud sync rest preserves control-row payload fields on getRow (5.9977ms)
✔ cloud sync rest getRow accepts array responses and returns null for missing rows without object-only 406 semantics (0.6325ms)
✔ cloud sync rest getRow returns null for empty array responses (0.2328ms)
✔ cloud sync rest preserves tabs gate payload fields on upsert response (0.5448ms)
✔ cloud sync rest sanitizes saved collections while preserving control rows and extra payload fields (0.6122ms)
✔ cloud sync room commands derive status, private room targets, and share-link copy fallbacks canonically (3.0482ms)
✔ cloud sync room mode preserves thrown error messages (0.2653ms)
✔ cloud sync share-link copy preserves clipboard error messages when prompt fallback is unavailable (0.2618ms)
✔ cloud sync room/share-link commands normalize non-Error throwables into stable messages (0.3863ms)
✔ cloud sketch initial catchup is site2-only even when the remote row is fresh (6.9892ms)
✔ cloud sketch stale initial catchup does not block the next fresh site2 update (1.6951ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2153.1538
[toast] success סקיצה חדשה התעדכנה
[toast] success סקיצה חדשה התעדכנה
[toast] success סקיצה חדשה התעדכנה
✔ cloud sync s
...
[trimmed 2491 chars]
```

### [PASS] Cloud sync tabs-ui (canonical group)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `npm run test:cloud-sync-surfaces:tabs-ui`
- status: **passed**
- exit code: `0`
- duration: `4586ms`

#### stdout

```text

> test:cloud-sync-surfaces:tabs-ui
> node tools/wp_test_group.mjs cloud-sync-tabs-ui

✔ floating sketch sync pin command becomes a no-op when state is unchanged (5.2274ms)
✔ floating sketch sync pin command rolls back local state on push failure (0.6588ms)
✔ floating sketch sync pin toggle command flips the current state (0.9957ms)
✔ floating sketch sync pin command preserves push failure message (0.4461ms)
✔ floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets (1.2299ms)
✔ cloud sync tabs gate command skips redundant refreshes but extends stale opens (25.2639ms)
✔ cloud sync tabs gate command rolls back on push failure and reports final state (1.6126ms)
✔ cloud sync tabs gate toggle command flips the current ref state (0.5022ms)
✔ cloud sync tabs gate command preserves push failure message (0.524ms)
✔ cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets (3.3364ms)
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
✔ cloud sync tabs gate closes stale site2 UI on initial pull miss (12.6218ms)
✔ cloud sync tabs gate uses the current gate base room for push and pull (1.5676ms)
✔ cloud sync tabs gate defaults to the public room when no room URL is selected (1.0133ms)
✔ cloud sync tabs gate public-room push is visible to site2 public-room pull (4.4714ms)
✔ cloud sync tabs gate site2 ignores local open fallback when cloud row is missing (0.8578ms)
✔ cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling (2.0806ms)
✔ cloud sync tabs gate direct push reports controller-only canonically on site2 (0.3419ms)
✔ cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App (0.6554ms)
✔ cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state (7.281ms)
✔ [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam (3582.8927ms)
✔ [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations (2.9717ms)
✔ [cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads (1.6087ms)
✔ [cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation (0.3078ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4056.7439

```

### [PASS] Playwright smoke suite listing

- id: `e2e-list`
- category: `e2e`
- command: `npm run e2e:smoke:list`
- status: **passed**
- exit code: `0`
- duration: `1135ms`

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
- duration: `1607ms`

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
- duration: `164956ms`

#### stderr

```text
[WebServer] (node:79824) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
(node:76792) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:76876) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:77632) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:59224) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
(node:78784) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)

```

#### stdout

```text

> e2e:smoke
> node tools/wp_playwright_preflight.js && playwright test -c playwright.config.ts

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

Running 26 tests using 4 workers

  ok  1 [setup] › tests\e2e\app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers (10.5s)
  ok  2 [chromium] › tests\e2e\canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target @critical (18.4s)
  ok  5 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:29:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable (19.5s)
  ok  4 [chromium] › tests\e2e\resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry (20.2s)
  ok  3 [chromium] › tests\e2e\authoring_builds.spec.ts:478:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work @critical (29.8s)
  ok  8 [chromium] › tests\e2e\resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state (13.9s)
  ok  6 [chromium] › tests\e2e\smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable @critical (16.2s)
  ok  7 [chromium] › tests\e2e\user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics (28.7s)
  ok 11 [chromium] › tests\e2e\smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name @critical (14.5s)
  ok 10 [chromium] › tests\e2e\resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry (18.6s)
  ok 13 [chromium] › tests\e2e\smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly (10.6s)
  ok  9 [chromium] › tests\e2e\authoring_builds.spec.ts:545:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load (34.0s)
  ok 12 [chromium] › tests\e2e\user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state (18.6s)
  ok 14 [chromium] › tests\e2e\smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar @critical (11.6s)
  ok 15 [chromium] › tests\e2e\authoring_builds.spec.ts:608:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load (15.8s)
  ok 17 [chromium] › tests\e2e\smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive (8.4s)
  ok 16 [chromium] › tests\e2e\user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip (16.9s)
  ok 18 [chromium] › tests\e2e\authoring_builds.spec.ts:665:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load (9.7s)
  ok 20 [chromium] › tests\e2e\authoring_builds.spec.ts:720:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load (8.7s)
  ok 19 [chromium] › tests\e2e\user_paths.spec.ts:274:3 › Playwright real user paths › cabinet authoring options survive project roundtrip (14.8s)
  ok 21 [chromium] › tests\e2e\authoring_builds.spec.ts:775:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable (9.6s)
  ok 22 [chromium] › tests\e2e\user_paths.spec.ts:324:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout maps (9.8s)
  ok 24 [chromium] › tests\e2e\user_paths.spec.ts:366:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout scenario matrix (15.1s)
  ok 23 [chromium] › tests\e2e\authoring_builds.spec.ts:814:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load (18.8s)
  ok 26 [chromium] › tests\e2e\authoring_builds.spec.ts:880:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated (17.5s)
  ok 25 [chromium] › tests\e2e\user_paths.spec.ts:413:3 › Playwright real user paths › settings backup import and restore-last-session recover real user state (23.8s)

  26 passed (2.7m)

```
