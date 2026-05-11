# Final Verification Summary

- generated_at: 2026-05-11T02:27:04.031Z
- workspace: `/mnt/data/stage9_work`
- total lanes: **25**
- passed: **23**
- environment-blocked: **2**
- runner-blocked: **0**
- failed: **0**
- selected profiles: `e2e`
- selected categories: `(all)`
- selected lanes: `(all)`
- skipped lanes: `(none)`
- resumed from: `(start)`
- state file: `.artifacts/stage9-closeout.json`

## Interpretation

כל ה־lanes שנבחרו לריצת closeout עברו או נחסמו סביבתית בלבד. כלומר אין כאן כשל verify פעיל ברמת הקוד בתוך סט הסגירה הזה.

יש גם lane אחד לפחות שנחסם סביבתית; הוא לא נספר ככשל קוד, אבל כן נשאר פתוח לסביבה מלאה עם browser/רשת זמינים.

לא זוהו חסימות runner בריצת closeout הזו.

## Lane results

### ✅ Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `13962ms`

#### stdout

```text

> build:dist
> node tools/wp_build_dist.js

[WP BuildDist] Building dist modules (tsc:local-node-modules)...
[WP BuildDist] Copying static assets to dist/...
[WP BuildDist] Done: dist/esm + dist/types + static assets

```

### ✅ Perf smoke baseline

- id: `perf-smoke`
- category: `perf`
- command: `npm run perf:smoke`
- status: **passed**
- exit code: `0`
- duration: `3857ms`

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] npm run test:perf-toolchain-core
============================================================


> test:perf-toolchain-core
> node --test tests/wp_perf_smoke_runtime.test.js tests/wp_toolchain_family_contracts.test.js tests/wp_check_runtime.test.js tests/wp_verify_runtime.test.js tests/wp_verify_lane_runtime.test.js

TAP version 13
# Subtest: check arg parsing preserves baseline/json/gate/strict flags
ok 1 - check arg parsing preserves baseline/json/gate/strict flags
  ---
  duration_ms: 1.430528
  type: 'test'
  ...
# Subtest: check mode detection prefers js first and falls back to esm
ok 2 - check mode detection prefers js first and falls back to esm
  ---
  duration_ms: 1.147994
  type: 'test'
  ...
# Subtest: check syntax runner reports malformed js files
ok 3 - check syntax runner reports malformed js files
  ---
  duration_ms: 106.471996
  type: 'test'
  ...
# Subtest: check policy stats count legacy/root needles by directory
ok 4 - check policy stats count legacy/root needles by directory
  ---
  duration_ms: 2.032686
  type: 'test'
  ...
# Subtest: check gate/strict results report regressions and clean strict state
ok 5 - check gate/strict results report regressions and clean strict state
  ---
  duration_ms: 1.906616
  type: 'test'
  ...
# Subtest: check json report preserves file and policy summary fields
ok 6 - check json report preserves file and policy summary fields
  ---
  duration_ms: 0.379263
  type: 'test'
  ...
# Subtest: perf smoke args parse lanes, scripts, baseline paths, and flags canonically
ok 7 - perf smoke args parse lanes, scripts, baseline paths, and flags canonically
  ---
  duration_ms: 1.62929
  type: 'test'
  ...
# Subtest: perf smoke help text advertises default lanes and baseline flags
ok 8 - perf smoke help text advertises default lanes and baseline flags
  ---
  duration_ms: 0.239464
  type: 'test'
  ...
# Subtest: perf smoke planner resolves verify lanes and dedupes script overlap
ok 9 - perf smoke planner resolves verify lanes and dedupes script overlap
  ---
  duration_ms: 0.491982
  type: 'test'
  ...
# Subtest: perf smoke baseline evaluation detects regressions and profile drift
ok 10 - perf smoke baseline evaluation detects regressions and profile drift
  ---
  duration_ms: 1.345841
  type: 'test'
  ...
# Subtest: perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow
ok 11 - perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow
  ---
  duration_ms: 45.259012
  type: 'test'
  ...
# Subtest: [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules
ok 12 - [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 4.129946
  type: 'test'
  ...
# Subtest: [toolchain] bundle keeps one thin entrypoint plus canonical owner modules
ok 13 - [toolchain] bundle keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 1.064998
  type: 'test'
  ...
# Subtest: [toolchain] check keeps one thin entrypoint plus canonical owner modules
ok 14 - [toolchain] check keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 0.551881
  type: 'test'
  ...
# Subtest: [toolchain] release keeps one thin entrypoint plus canonical owner modules
ok 15 - [toolchain] release keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 1.566893
  type: 'test'
  ...
# Subtest: [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules
ok 16 - [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 1.200953
  type: 'test'
  ...
# Subtest: [toolchain] test keeps one thin entrypoint plus canonical owner modules
ok 17 - [toolchain] test keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 38.874894
  type: 'test'
  ...
# Subtest: [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules
ok 18 - [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 0.765195
  type: 'test'
  ...
# Subtest: [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules
ok 19 - [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 1.915331
  type: 'test'
  ...
# Subtest: [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules
ok 20 - [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 0.688343
  type: 'test'
  ...
# Subtest: [toolchain] verify keeps one thin entrypoint plus canonical owner modules
ok 21 - [toolchain] verify keeps one thin entrypoint plus canonical owner modules
  ---
  duration_ms: 1.160783
  type: 'test'
  ...
# Subtest
...
[trimmed 6293 chars]
```

### ✅ Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `10958ms`

#### steps

- ✅ overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 194ms)
- ✅ typecheck platform: `tsc -p tsconfig.checkjs.platform.json` (passed, 2702ms)
- ✅ typecheck services: `tsc -p tsconfig.checkjs.services.json` (passed, 4202ms)
- ✅ typecheck runtime: `tsc -p tsconfig.checkjs.runtime.json` (passed, 2368ms)
- ✅ layer contracts: `node tools/wp_layer_contract.js` (passed, 808ms)
- ✅ public api contracts: `node tools/wp_public_api_contract.js` (passed, 684ms)

### ✅ Order PDF overlay core batch (direct)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_overlay_controller_actions_runtime.test.ts tests/order_pdf_overlay_draft_action_feedback_runtime.test.ts tests/order_pdf_overlay_draft_commands_runtime.test.ts tests/order_pdf_overlay_draft_effects_runtime.test.ts tests/order_pdf_overlay_interactions_runtime.test.ts tests/order_pdf_overlay_runtime_export_runtime.test.ts tests/order_pdf_overlay_text_details_lines_runtime.test.ts tests/order_pdf_overlay_text_runtime.test.ts tests/order_pdf_text_details_merge_support_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `5182ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/order_pdf_overlay_controller_actions_runtime.test.ts" "tests/order_pdf_overlay_draft_action_feedback_runtime.test.ts" "tests/order_pdf_overlay_draft_commands_runtime.test.ts" "tests/order_pdf_overlay_draft_effects_runtime.test.ts" "tests/order_pdf_overlay_interactions_runtime.test.ts" "tests/order_pdf_overlay_runtime_export_runtime.test.ts" "tests/order_pdf_overlay_text_details_lines_runtime.test.ts" "tests/order_pdf_overlay_text_runtime.test.ts" "tests/order_pdf_text_details_merge_support_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: order pdf export actions honor image/gmail busy flags before starting another action
ok 1 - order pdf export actions honor image/gmail busy flags before starting another action
  ---
  duration_ms: 7.998694
  type: 'test'
  ...
# Subtest: order pdf interaction handlers report pointer-cancel failures instead of throwing
ok 2 - order pdf interaction handlers report pointer-cancel failures instead of throwing
  ---
  duration_ms: 0.686359
  type: 'test'
  ...
# Subtest: order pdf export actions reuse cached interactive blob while draft signature is unchanged
ok 3 - order pdf export actions reuse cached interactive blob while draft signature is unchanged
  ---
  duration_ms: 1.558516
  type: 'test'
  ...
# Subtest: getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error
ok 4 - getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error
  ---
  duration_ms: 1.017308
  type: 'test'
  ...
# Subtest: getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess
ok 5 - getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess
  ---
  duration_ms: 0.109885
  type: 'test'
  ...
# Subtest: getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text
ok 6 - getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text
  ---
  duration_ms: 0.102573
  type: 'test'
  ...
# Subtest: applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists
ok 7 - applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists
  ---
  duration_ms: 0.209464
  type: 'test'
  ...
# Subtest: readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing
ok 8 - readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing
  ---
  duration_ms: 1.11762
  type: 'test'
  ...
# Subtest: loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state
ok 9 - loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state
  ---
  duration_ms: 0.32066
  type: 'test'
  ...
# Subtest: refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it
ok 10 - refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it
  ---
  duration_ms: 0.235402
  type: 'test'
  ...
# Subtest: resolveOrderPdfInlineConfirmAction returns the selected follow-up draft
ok 11 - resolveOrderPdfInlineConfirmAction returns the selected follow-up draft
  ---
  duration_ms: 0.201779
  type: 'test'
  ...
# Subtest: order pdf draft effects derives manual text from legacy manual HTML when detailsFull is false
ok 12 - order pdf draft effects derives manual text from legacy manual HTML when detailsFull is false
  ---
  duration_ms: 2.304704
  type: 'test'
  ...
# Subtest: order pdf draft effects derives text/seed from legacy manual HTML when detailsFull is already true
ok 13 - order pdf draft effects derives text/seed from legacy manual HTML when detailsFull is already true
  ---
  duration_ms: 1.10819
  type: 'test'
  ...
# Subtest: order pdf stage/file interactions keep close intent and PDF validation behavior canonical
ok 14 - order pdf stage/file interactions keep close intent and PDF validation behavior canonical
  ---
  duration_ms: 2.100719
  type: 'test'
  ...
# Subtest: order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state
ok 15 - order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state
  ---
  duration_ms: 1.186135
  type: 'test'
  ...
# Subtest: getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes
ok 16 - getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes
  ---
  duration_ms: 1.06275
  type: 'test'
  ...
# Subtest: getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks
ok 17 - getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks
  ---
  duration_ms: 0.938156
  type: 'test'
  ...
# Subtest: bindExportApiFromModule captures the app once and returns null for missing module/app
ok 18 - bindExportApiFromModule captures the app once and returns null for missing module/app
  ---
  duration_ms: 0.334193
  type: 'test'
  ...
# Subtest: order pdf details line helpers parse and collect canonical keyed rows
ok 19 - order pdf details line helpers parse and collect canonical keyed rows
  ---
  duration_ms: 1.297835
  type: 'test'
  ...
# Subtest: order pdf details line helpers preserve inline tails and positioned extras
ok 20 - order pdf details line helpers preserve inline tails and positioned extras
  ---
  duration_ms: 0.817502
  type: 'test'
  ...
# Subtest: order pdf text fallback html decoder preserves newlines and common entities without a document
ok 21 -
...
[trimmed 1426 chars]
```

### ✅ Order PDF PDF-render batch (direct)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_overlay_pdf_import_runtime.test.ts tests/order_pdf_overlay_pdf_render_canvas_runtime.test.ts tests/order_pdf_overlay_pdf_render_cleanup_runtime.test.ts tests/order_pdf_overlay_pdf_render_runtime.test.ts tests/order_pdf_image_pdf_text_layout_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `4853ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/order_pdf_overlay_pdf_import_runtime.test.ts" "tests/order_pdf_overlay_pdf_render_canvas_runtime.test.ts" "tests/order_pdf_overlay_pdf_render_cleanup_runtime.test.ts" "tests/order_pdf_overlay_pdf_render_runtime.test.ts" "tests/order_pdf_image_pdf_text_layout_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: [order-pdf] prepared details split can be painted without re-wrapping
ok 1 - [order-pdf] prepared details split can be painted without re-wrapping
  ---
  duration_ms: 1.798567
  type: 'test'
  ...
# Subtest: [order-pdf] prepared layout preserves wrapped lines and visible max-line window
ok 2 - [order-pdf] prepared layout preserves wrapped lines and visible max-line window
  ---
  duration_ms: 0.227846
  type: 'test'
  ...
# Subtest: [order-pdf] image-pdf details text uses the canonical full-details touched semantics
ok 3 - [order-pdf] image-pdf details text uses the canonical full-details touched semantics
  ---
  duration_ms: 0.193701
  type: 'test'
  ...
# Subtest: order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled
ok 4 - order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled
  ---
  duration_ms: 29.099893
  type: 'test'
  ...
# Subtest: order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled
ok 5 - order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled
  ---
  duration_ms: 12.44865
  type: 'test'
  ...
# Subtest: order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled
ok 6 - order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled
  ---
  duration_ms: 11.814659
  type: 'test'
  ...
# Subtest: order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails
ok 7 - order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails
  ---
  duration_ms: 5.973059
  type: 'test'
  ...
# Subtest: order pdf pdf-import extracts fallback field names through the canonical document-field runtime
ok 8 - order pdf pdf-import extracts fallback field names through the canonical document-field runtime
  ---
  duration_ms: 37.484613
  type: 'test'
  ...
# Subtest: order pdf pdf-import reads bytes from file-like objects and tolerates read failures
ok 9 - order pdf pdf-import reads bytes from file-like objects and tolerates read failures
  ---
  duration_ms: 0.353371
  type: 'test'
  ...
# Subtest: order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page
ok 10 - order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page
  ---
  duration_ms: 7.201949
  type: 'test'
  ...
# Subtest: order pdf pdf-import applies html-only legacy details and notes through the canonical imported-field runtime
ok 11 - order pdf pdf-import applies html-only legacy details and notes through the canonical imported-field runtime
  ---
  duration_ms: 1.576237
  type: 'test'
  ...
# Subtest: order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path
ok 12 - order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path
  ---
  duration_ms: 1.933241
  type: 'test'
  ...
# Subtest: order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup
ok 13 - order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup
  ---
  duration_ms: 0.282474
  type: 'test'
  ...
# Subtest: cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly
ok 14 - cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly
  ---
  duration_ms: 1.090876
  type: 'test'
  ...
# Subtest: loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document
ok 15 - loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document
  ---
  duration_ms: 0.589345
  type: 'test'
  ...
# Subtest: loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves
ok 16 - loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves
  ---
  duration_ms: 0.296461
  type: 'test'
  ...
# Subtest: order pdf render helpers treat destroyed/aborted worker errors as expected cancellations
ok 17 - order pdf render helpers treat destroyed/aborted worker errors as expected cancellations
  ---
  duration_ms: 2.026969
  type: 'test'
  ...
# Subtest: loadOrderPdfFirstPage clones source bytes before handing them to pdf.js
ok 18 - loadOrderPdfFirstPage clones source bytes before handing them to pdf.js
  ---
  duration_ms: 0.937894
  type: 'test'
  ...
1..18
# tests 18
# suites 0
# pass 18
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 4723.185015

```

### ✅ Order PDF sketch batch (direct)

- id: `order-pdf-sketch`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_history_shortcuts_runtime.test.ts tests/order_pdf_sketch_draft_persistence_runtime.test.ts tests/order_pdf_sketch_palette_placement_runtime.test.ts tests/order_pdf_sketch_panel_runtime.test.ts tests/order_pdf_sketch_preview_session_runtime.test.ts tests/order_pdf_sketch_shortcuts_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3533ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/order_pdf_history_shortcuts_runtime.test.ts" "tests/order_pdf_sketch_draft_persistence_runtime.test.ts" "tests/order_pdf_sketch_palette_placement_runtime.test.ts" "tests/order_pdf_sketch_panel_runtime.test.ts" "tests/order_pdf_sketch_preview_session_runtime.test.ts" "tests/order_pdf_sketch_shortcuts_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: [history-ui] suspended history shortcuts are detected from the active overlay element
ok 1 - [history-ui] suspended history shortcuts are detected from the active overlay element
  ---
  duration_ms: 0.750331
  type: 'test'
  ...
# Subtest: [history-ui] suspended history shortcuts fall back to a document-level overlay marker
ok 2 - [history-ui] suspended history shortcuts fall back to a document-level overlay marker
  ---
  duration_ms: 0.182533
  type: 'test'
  ...
# Subtest: [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags
ok 3 - [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags
  ---
  duration_ms: 3.786149
  type: 'test'
  ...
# Subtest: [order-pdf] refresh-auto preserves sketch annotations while refreshing project details
ok 4 - [order-pdf] refresh-auto preserves sketch annotations while refreshing project details
  ---
  duration_ms: 0.881778
  type: 'test'
  ...
# Subtest: [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport
ok 5 - [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport
  ---
  duration_ms: 0.807695
  type: 'test'
  ...
# Subtest: [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space
ok 6 - [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space
  ---
  duration_ms: 0.137411
  type: 'test'
  ...
# Subtest: [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot
ok 7 - [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot
  ---
  duration_ms: 0.694816
  type: 'test'
  ...
# Subtest: [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports
ok 8 - [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports
  ---
  duration_ms: 0.098739
  type: 'test'
  ...
# Subtest: [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes
ok 9 - [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes
  ---
  duration_ms: 0.099681
  type: 'test'
  ...
# Subtest: [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads
ok 10 - [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads
  ---
  duration_ms: 0.303932
  type: 'test'
  ...
# Subtest: [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes
ok 11 - [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes
  ---
  duration_ms: 0.099964
  type: 'test'
  ...
# Subtest: [order-pdf] sketch canvas frame only commits once a real 2d context exists
ok 12 - [order-pdf] sketch canvas frame only commits once a real 2d context exists
  ---
  duration_ms: 0.248251
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically
ok 13 - [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically
  ---
  duration_ms: 1.400994
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key
ok 14 - [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key
  ---
  duration_ms: 0.390428
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion
ok 15 - [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion
  ---
  duration_ms: 0.123425
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect
ok 16 - [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect
  ---
  duration_ms: 0.176972
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point
ok 17 - [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point
  ---
  duration_ms: 0.204935
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths
ok 18 - [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths
  ---
  duration_ms: 0.482375
  type: 'test'
  ...
# Subtest: [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history
ok 19 - [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain sta
...
[trimmed 3043 chars]
```

### ✅ Order PDF export overlay batch (direct)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_overlay_export_ops_runtime.test.ts tests/order_pdf_overlay_export_commands_runtime.test.ts tests/order_pdf_overlay_export_singleflight_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3368ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/order_pdf_overlay_export_ops_runtime.test.ts" "tests/order_pdf_overlay_export_commands_runtime.test.ts" "tests/order_pdf_overlay_export_singleflight_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data
ok 1 - loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data
  ---
  duration_ms: 1.891689
  type: 'test'
  ...
# Subtest: exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download
ok 2 - exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download
  ---
  duration_ms: 0.409574
  type: 'test'
  ...
# Subtest: exportOrderPdfImageWithDeps reports busy before building another image PDF
ok 3 - exportOrderPdfImageWithDeps reports busy before building another image PDF
  ---
  duration_ms: 0.307766
  type: 'test'
  ...
# Subtest: exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing
ok 4 - exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing
  ---
  duration_ms: 0.214611
  type: 'test'
  ...
# Subtest: loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast
ok 5 - loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast
  ---
  duration_ms: 0.495513
  type: 'test'
  ...
# Subtest: exportOrderPdfInteractiveWithDeps preserves the real export failure detail
ok 6 - exportOrderPdfInteractiveWithDeps preserves the real export failure detail
  ---
  duration_ms: 0.233192
  type: 'test'
  ...
# Subtest: loadOrderPdfIntoEditorWithDeps treats html-only extracted legacy details as found fields
ok 7 - loadOrderPdfIntoEditorWithDeps treats html-only extracted legacy details as found fields
  ---
  duration_ms: 0.512178
  type: 'test'
  ...
# Subtest: loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late
ok 8 - loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late
  ---
  duration_ms: 0.489601
  type: 'test'
  ...
# Subtest: order pdf overlay export ops fail fast when rasterization has no document seam
ok 9 - order pdf overlay export ops fail fast when rasterization has no document seam
  ---
  duration_ms: 1.40736
  type: 'test'
  ...
# Subtest: order pdf overlay export ops build image attachments through the canonical attachment seam
ok 10 - order pdf overlay export ops build image attachments through the canonical attachment seam
  ---
  duration_ms: 500.33372
  type: 'test'
  ...
# Subtest: order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages
ok 11 - order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages
  ---
  duration_ms: 1.424444
  type: 'test'
  ...
# Subtest: order pdf export single-flight reuses duplicate same-key work per app and clears after completion
ok 12 - order pdf export single-flight reuses duplicate same-key work per app and clears after completion
  ---
  duration_ms: 2.057678
  type: 'test'
  ...
# Subtest: order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps
ok 13 - order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps
  ---
  duration_ms: 0.339997
  type: 'test'
  ...
# Subtest: order pdf export single-flight derives stable load keys and maps them back to action kinds
ok 14 - order pdf export single-flight derives stable load keys and maps them back to action kinds
  ---
  duration_ms: 0.389825
  type: 'test'
  ...
1..14
# tests 14
# suites 0
# pass 14
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3253.239729

```

### ✅ Order PDF export builders batch (direct)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/export_order_pdf_builder_draft_runtime.test.ts tests/export_order_pdf_builder_runtime.test.ts tests/export_order_pdf_builder_sketch_annotations_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3980ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/export_order_pdf_builder_draft_runtime.test.ts" "tests/export_order_pdf_builder_runtime.test.ts" "tests/export_order_pdf_builder_sketch_annotations_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values
ok 1 - resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values
  ---
  duration_ms: 0.860691
  type: 'test'
  ...
# Subtest: resolveOrderPdfOrderDetails prefers manual details only when the draft semantics say so
ok 2 - resolveOrderPdfOrderDetails prefers manual details only when the draft semantics say so
  ---
  duration_ms: 0.291625
  type: 'test'
  ...
# Subtest: resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides
ok 3 - resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides
  ---
  duration_ms: 1.819055
  type: 'test'
  ...
# Subtest: buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable
ok 4 - buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable
  ---
  duration_ms: 709.230669
  type: 'test'
  ...
# Subtest: captureOrderPdfCompositeImages applies sketch annotations after base composite capture
ok 5 - captureOrderPdfCompositeImages applies sketch annotations after base composite capture
  ---
  duration_ms: 1.727063
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3863.936764

```

### ✅ Order PDF export capture batch (direct)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/export_order_pdf_capture_cache_runtime.test.ts tests/export_order_pdf_capture_runtime.test.ts tests/export_order_pdf_ops_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3069ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/export_order_pdf_capture_cache_runtime.test.ts" "tests/export_order_pdf_capture_runtime.test.ts" "tests/export_order_pdf_ops_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: order pdf capture cache signature falls back cleanly when state is missing or invalid
ok 1 - order pdf capture cache signature falls back cleanly when state is missing or invalid
  ---
  duration_ms: 1.589543
  type: 'test'
  ...
# Subtest: order pdf capture cache returns cloned bytes instead of live cache buffers
ok 2 - order pdf capture cache returns cloned bytes instead of live cache buffers
  ---
  duration_ms: 0.703512
  type: 'test'
  ...
# Subtest: order pdf capture cache reuses sketch base assets while signature is unchanged
ok 3 - order pdf capture cache reuses sketch base assets while signature is unchanged
  ---
  duration_ms: 0.573064
  type: 'test'
  ...
# Subtest: order pdf capture cache ignores pdf editor draft changes but invalidates on build/config changes
ok 4 - order pdf capture cache ignores pdf editor draft changes but invalidates on build/config changes
  ---
  duration_ms: 0.231975
  type: 'test'
  ...
# Subtest: order pdf capture cache signature ignores sketch-only annotation changes
ok 5 - order pdf capture cache signature ignores sketch-only annotation changes
  ---
  duration_ms: 0.961975
  type: 'test'
  ...
# Subtest: export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas
ok 6 - export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas
  ---
  duration_ms: 2.534265
  type: 'test'
  ...
# Subtest: export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures
ok 7 - export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures
  ---
  duration_ms: 0.572114
  type: 'test'
  ...
# Subtest: export order pdf ops factory exposes stable draft/export surface
ok 8 - export order pdf ops factory exposes stable draft/export surface
  ---
  duration_ms: 2.072035
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2940.957697

```

### ✅ Order PDF export text batch (direct)

- id: `order-pdf-export-text`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/export_order_pdf_sketch_annotations_runtime.test.ts tests/export_order_pdf_text_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `1970ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/export_order_pdf_sketch_annotations_runtime.test.ts" "tests/export_order_pdf_text_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: listOrderPdfSketchStrokes keeps only valid strokes for the requested page
ok 1 - listOrderPdfSketchStrokes keeps only valid strokes for the requested page
  ---
  duration_ms: 0.788819
  type: 'test'
  ...
# Subtest: paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas
ok 2 - paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas
  ---
  duration_ms: 0.991234
  type: 'test'
  ...
# Subtest: paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser
ok 3 - paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser
  ---
  duration_ms: 0.15273
  type: 'test'
  ...
# Subtest: compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer
ok 4 - compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer
  ---
  duration_ms: 0.397519
  type: 'test'
  ...
# Subtest: paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite
ok 5 - paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite
  ---
  duration_ms: 0.599336
  type: 'test'
  ...
# Subtest: export order pdf text ops compose details, bidi, and layout behavior from one canonical seam
ok 6 - export order pdf text ops compose details, bidi, and layout behavior from one canonical seam
  ---
  duration_ms: 2.191844
  type: 'test'
  ...
# Subtest: export order pdf text ops keep canonical draft defaults and bidi stabilization behavior
ok 7 - export order pdf text ops keep canonical draft defaults and bidi stabilization behavior
  ---
  duration_ms: 2.007091
  type: 'test'
  ...
# Subtest: export order pdf text uses wardrobe-type depth fallback only when raw depth is missing
ok 8 - export order pdf text uses wardrobe-type depth fallback only when raw depth is missing
  ---
  duration_ms: 0.352847
  type: 'test'
  ...
1..8
# tests 8
# suites 0
# pass 8
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1848.303937

```

### ✅ Sketch manual/hover batch (direct)

- id: `sketch-manual-hover`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/sketch_manual_tool_host_runtime.test.ts tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2606ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/sketch_manual_tool_host_runtime.test.ts" "tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner
ok 1 - manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner
  ---
  duration_ms: 34.444779
  type: 'test'
  ...
# Subtest: manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata
ok 2 - manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata
  ---
  duration_ms: 0.490753
  type: 'test'
  ...
# Subtest: manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides
ok 3 - manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides
  ---
  duration_ms: 2.247535
  type: 'test'
  ...
# Subtest: manual-layout hover module context falls back to the corner root config when no cell config exists
ok 4 - manual-layout hover module context falls back to the corner root config when no cell config exists
  ---
  duration_ms: 1.11631
  type: 'test'
  ...
# Subtest: manual-layout module box preview routes shelf hover through the focused box owner
ok 5 - manual-layout module box preview routes shelf hover through the focused box owner
  ---
  duration_ms: 2.845216
  type: 'test'
  ...
# Subtest: manual-layout module stack preview routes ext drawers through the focused stack owner
ok 6 - manual-layout module stack preview routes ext drawers through the focused stack owner
  ---
  duration_ms: 2.153934
  type: 'test'
  ...
# Subtest: manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools
ok 7 - manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools
  ---
  duration_ms: 5.757974
  type: 'test'
  ...
# Subtest: manual-layout sketch hover falls back to standalone free placement when no selector is hit
ok 8 - manual-layout sketch hover falls back to standalone free placement when no selector is hit
  ---
  duration_ms: 1.40185
  type: 'test'
  ...
# Subtest: module surface hover writes preview-only shelf add results instead of dropping them
ok 9 - module surface hover writes preview-only shelf add results instead of dropping them
  ---
  duration_ms: 4.406634
  type: 'test'
  ...
# Subtest: module preview flow probes existing shelf removal before drawer stack add previews
ok 10 - module preview flow probes existing shelf removal before drawer stack add previews
  ---
  duration_ms: 0.85688
  type: 'test'
  ...
# Subtest: existing vertical remove helper is a no-op when nothing removable is under the cursor
ok 11 - existing vertical remove helper is a no-op when nothing removable is under the cursor
  ---
  duration_ms: 0.485046
  type: 'test'
  ...
# Subtest: door action hover state resolves the nearest door leaf owner with metrics
ok 12 - door action hover state resolves the nearest door leaf owner with metrics
  ---
  duration_ms: 0.327651
  type: 'test'
  ...
# Subtest: manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors
ok 13 - manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors
  ---
  duration_ms: 1.09992
  type: 'test'
  ...
# Subtest: manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool
ok 14 - manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool
  ---
  duration_ms: 1.611908
  type: 'test'
  ...
# Subtest: manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout
ok 15 - manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout
  ---
  duration_ms: 0.298599
  type: 'test'
  ...
# Subtest: manual tool access prefers canonical mode-state value before runtime tools fallback
ok 16 - manual tool access prefers canonical mode-state value before runtime tools fallback
  ---
  duration_ms: 1.129041
  type: 'test'
  ...
# Subtest: manual tool access falls back to runtime tools when mode-state tool is absent
ok 17 - manual tool access falls back to runtime tools when mode-state tool is absent
  ---
  duration_ms: 0.184695
  type: 'test'
  ...
# Subtest: sketch-free host falls back to internal grid maps before the zero-door hinged default host
ok 18 - sketch-free host falls back to internal grid maps before the zero-door hinged default host
  ---
  duration_ms: 1.65888
  type: 'test'
  ...
# Subtest: sketch-free host uses the hinged zero-door fallback only when no config or grid host exists
ok 19 - sketch-free host uses the hinged zero-door fallback only when no config or grid host exists
  ---
  duration_ms: 0.195246
  type: 'test'
  ...
1..19
# tests 19
# suites 0
# pass 19
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2458.362059

```

### ✅ Sketch box/hover batch (direct)

- id: `sketch-box-hover`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/canvas_picking_sketch_box_runtime_runtime.test.ts tests/canvas_picking_sketch_box_door_preview_runtime.test.ts tests/canvas_picking_sketch_box_doors_runtime.test.ts tests/canvas_picking_sketch_box_overlap_runtime.test.ts tests/sketch_box_hover_click_runtime.test.ts tests/sketch_box_door_visuals_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2516ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/canvas_picking_sketch_box_runtime_runtime.test.ts" "tests/canvas_picking_sketch_box_door_preview_runtime.test.ts" "tests/canvas_picking_sketch_box_doors_runtime.test.ts" "tests/canvas_picking_sketch_box_overlap_runtime.test.ts" "tests/sketch_box_hover_click_runtime.test.ts" "tests/sketch_box_door_visuals_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: sketch-box door preview stays inert for hinge toggles when the active segment has no door
ok 1 - sketch-box door preview stays inert for hinge toggles when the active segment has no door
  ---
  duration_ms: 1.316428
  type: 'test'
  ...
# Subtest: sketch-box door preview resolves canonical remove metadata for an existing double-door pair
ok 2 - sketch-box door preview resolves canonical remove metadata for an existing double-door pair
  ---
  duration_ms: 7.807055
  type: 'test'
  ...
# Subtest: sketch-box door preview keeps explicit hinge/remove metadata for a single existing door
ok 3 - sketch-box door preview keeps explicit hinge/remove metadata for a single existing door
  ---
  duration_ms: 0.307815
  type: 'test'
  ...
# Subtest: sketch-box doors upsert single-door records through the canonical id factory and segment placement seam
ok 4 - sketch-box doors upsert single-door records through the canonical id factory and segment placement seam
  ---
  duration_ms: 1.596449
  type: 'test'
  ...
# Subtest: sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair
ok 5 - sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair
  ---
  duration_ms: 7.407844
  type: 'test'
  ...
# Subtest: sketch-box doors remove a focused segment door without disturbing the other segment
ok 6 - sketch-box doors remove a focused segment door without disturbing the other segment
  ---
  duration_ms: 0.373628
  type: 'test'
  ...
# Subtest: resolved module boxes ignore free-placement items and the requested ignoreBoxId
ok 7 - resolved module boxes ignore free-placement items and the requested ignoreBoxId
  ---
  duration_ms: 1.810301
  type: 'test'
  ...
# Subtest: vertical center clamp respects module bounds even when desired center is far outside range
ok 8 - vertical center clamp respects module bounds even when desired center is far outside range
  ---
  duration_ms: 0.16758
  type: 'test'
  ...
# Subtest: placement resolution can ignore the edited box id instead of blocking on itself
ok 9 - placement resolution can ignore the edited box id instead of blocking on itself
  ---
  duration_ms: 0.31832
  type: 'test'
  ...
# Subtest: placement reports blocked when overlap chain reaches the module ceiling and floor
ok 10 - placement reports blocked when overlap chain reaches the module ceiling and floor
  ---
  duration_ms: 0.675187
  type: 'test'
  ...
# Subtest: overlap primitive still allows exact edge contact without treating it as overlap
ok 11 - overlap primitive still allows exact edge contact without treating it as overlap
  ---
  duration_ms: 0.098659
  type: 'test'
  ...
# Subtest: sketch-box runtime parses width/depth overrides and rejects unrelated tools
ok 12 - sketch-box runtime parses width/depth overrides and rejects unrelated tools
  ---
  duration_ms: 1.421248
  type: 'test'
  ...
# Subtest: sketch-box runtime geometry center-snaps and width-clamps inside the module span
ok 13 - sketch-box runtime geometry center-snaps and width-clamps inside the module span
  ---
  duration_ms: 0.396297
  type: 'test'
  ...
# Subtest: sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match
ok 14 - sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match
  ---
  duration_ms: 0.39458
  type: 'test'
  ...
# Subtest: sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized
ok 15 - sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized
  ---
  duration_ms: 0.268247
  type: 'test'
  ...
# Subtest: sketch-box free-placement commit clears hover when the canonical commit finishes without next hover
ok 16 - sketch-box free-placement commit clears hover when the canonical commit finishes without next hover
  ---
  duration_ms: 0.190278
  type: 'test'
  ...
# Subtest: sketch-box free-placement commit stays inert when no canonical host is available
ok 17 - sketch-box free-placement commit stays inert when no canonical host is available
  ---
  duration_ms: 0.134917
  type: 'test'
  ...
# Subtest: sketch-box door visuals forward mirror state, mirror layout, and deep pick meta through the special visual path
ok 18 - sketch-box door visuals forward mirror state, mirror layout, and deep pick meta through the special visual path
  ---
  duration_ms: 58.714246
  type: 'test'
  ...
# Subtest: sketch external drawers hover context loads persisted module stacks for remove/overlap handling
ok 19 - sketch external drawers hover context loads persisted module stacks for remove/overlap handling
  ---
  duration_ms: 4.637177
  type: 'test'
  ...
# Subtest: free-box content click stays on the free box even when a wardrobe module is behind it
ok 20 - free-box content click stays on the free box even whe
...
[trimmed 1521 chars]
```

### ✅ Sketch free-box batch (direct)

- id: `sketch-free-boxes`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts tests/canvas_picking_sketch_free_commit_runtime.test.ts tests/sketch_free_boxes_attach_runtime.test.ts tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts tests/sketch_free_boxes_outside_attach_runtime.test.ts tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts tests/sketch_free_boxes_room_floor_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `1981ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts" "tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts" "tests/canvas_picking_sketch_free_commit_runtime.test.ts" "tests/sketch_free_boxes_attach_runtime.test.ts" "tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts" "tests/sketch_free_boxes_outside_attach_runtime.test.ts" "tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts" "tests/sketch_free_boxes_room_floor_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: sketch-free box content preview short-circuits unsupported content kinds before target scanning
ok 1 - sketch-free box content preview short-circuits unsupported content kinds before target scanning
  ---
  duration_ms: 0.744632
  type: 'test'
  ...
# Subtest: sketch-free box content preview keeps door-hinge hover inert when the active segment has no door
ok 2 - sketch-free box content preview keeps door-hinge hover inert when the active segment has no door
  ---
  duration_ms: 1.295491
  type: 'test'
  ...
# Subtest: sketch-free box content preview returns canonical double-door removal metadata for an existing pair
ok 3 - sketch-free box content preview returns canonical double-door removal metadata for an existing pair
  ---
  duration_ms: 7.660205
  type: 'test'
  ...
# Subtest: sketch-free placement hover record keeps canonical host/free-placement fields
ok 4 - sketch-free placement hover record keeps canonical host/free-placement fields
  ---
  duration_ms: 1.198258
  type: 'test'
  ...
# Subtest: sketch-free placement commit adds a free-placement box through the canonical modules patch seam
ok 5 - sketch-free placement commit adds a free-placement box through the canonical modules patch seam
  ---
  duration_ms: 0.875588
  type: 'test'
  ...
# Subtest: sketch-free placement content commit routes free-placement door removal through the canonical content seam
ok 6 - sketch-free placement content commit routes free-placement door removal through the canonical content seam
  ---
  duration_ms: 1.112928
  type: 'test'
  ...
# Subtest: sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks
ok 7 - sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks
  ---
  duration_ms: 1.135696
  type: 'test'
  ...
# Subtest: sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry
ok 8 - sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry
  ---
  duration_ms: 0.86216
  type: 'test'
  ...
# Subtest: free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset
ok 9 - free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset
  ---
  duration_ms: 1.069782
  type: 'test'
  ...
# Subtest: free-box attach still prefers top/bottom when the cursor is only outside vertically
ok 10 - free-box attach still prefers top/bottom when the cursor is only outside vertically
  ---
  duration_ms: 0.16252
  type: 'test'
  ...
# Subtest: free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right
ok 11 - free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right
  ---
  duration_ms: 0.18783
  type: 'test'
  ...
# Subtest: free-box attach below still allows a true staircase corner touch before detaching
ok 12 - free-box attach below still allows a true staircase corner touch before detaching
  ---
  duration_ms: 0.203643
  type: 'test'
  ...
# Subtest: free-box attach still prefers side attachment when the cursor is clearly outside only on X
ok 13 - free-box attach still prefers side attachment when the cursor is clearly outside only on X
  ---
  duration_ms: 0.149133
  type: 'test'
  ...
# Subtest: free-box hover attach below falls back to a valid floor-safe side placement when room floor blocks under-stack placement
ok 14 - free-box hover attach below falls back to a valid floor-safe side placement when room floor blocks under-stack placement
  ---
  duration_ms: 2.361261
  type: 'test'
  ...
# Subtest: free-box hover attach above keeps plane X even when surface hit lands on the left wall of the target box
ok 15 - free-box hover attach above keeps plane X even when surface hit lands on the left wall of the target box
  ---
  duration_ms: 0.312742
  type: 'test'
  ...
# Subtest: free-box hover near lower corners stays symmetric when room floor forces the fallback placement sideways
ok 16 - free-box hover near lower corners stays symmetric when room floor forces the fallback placement sideways
  ---
  duration_ms: 0.739367
  type: 'test'
  ...
# Subtest: free-box hover below at the outer edge still resolves to the floor-safe side placement
ok 17 - free-box hover below at the outer edge still resolves to the floor-safe side placement
  ---
  duration_ms: 0.35649
  type: 'test'
  ...
# Subtest: free-box hover between adjacent boxes keeps the gap column instead of snapping to an outer side wall
ok 18 - free-box hover between adjacent boxes keeps the gap column instead of snapping to an outer side wall
  ---
  duration_ms: 0.41182
  type: 'test'
  ...
# Subtest: free-box hover slightly off-center between adjacent boxes still stays in the gap column until a real sid
...
[trimmed 2590 chars]
```

### ✅ Sketch render/visuals batch (direct)

- id: `sketch-render-visuals`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/render_interior_sketch_visuals_runtime.test.ts tests/render_interior_sketch_fronts_runtime.test.ts tests/render_interior_sketch_layout_dimensions_runtime.test.ts tests/render_interior_sketch_layout_geometry_runtime.test.ts tests/sketch_front_visual_state_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `1357ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/render_interior_sketch_visuals_runtime.test.ts" "tests/render_interior_sketch_fronts_runtime.test.ts" "tests/render_interior_sketch_layout_dimensions_runtime.test.ts" "tests/render_interior_sketch_layout_geometry_runtime.test.ts" "tests/sketch_front_visual_state_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: render sketch box fronts reuses one mirror material across mirrored external drawers
ok 1 - render sketch box fronts reuses one mirror material across mirrored external drawers
  ---
  duration_ms: 3.93438
  type: 'test'
  ...
# Subtest: renderSketchFreeBoxDimensions keeps height on the right and depth on the left
ok 2 - renderSketchFreeBoxDimensions keeps height on the right and depth on the left
  ---
  duration_ms: 0.959419
  type: 'test'
  ...
# Subtest: renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths
ok 3 - renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths
  ---
  duration_ms: 1.150435
  type: 'test'
  ...
# Subtest: renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label
ok 4 - renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label
  ---
  duration_ms: 0.272151
  type: 'test'
  ...
# Subtest: render interior sketch layout geometry clamps box size and center inside the internal span
ok 5 - render interior sketch layout geometry clamps box size and center inside the internal span
  ---
  duration_ms: 0.779475
  type: 'test'
  ...
# Subtest: render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry
ok 6 - render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry
  ---
  duration_ms: 0.270991
  type: 'test'
  ...
# Subtest: render interior sketch layout dividers sort explicit dividers and still honor legacy centered fallbacks
ok 7 - render interior sketch layout dividers sort explicit dividers and still honor legacy centered fallbacks
  ---
  duration_ms: 0.689866
  type: 'test'
  ...
# Subtest: render interior sketch layout resolves content segments from divider-separated spans
ok 8 - render interior sketch layout resolves content segments from divider-separated spans
  ---
  duration_ms: 0.565269
  type: 'test'
  ...
# Subtest: render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts
ok 9 - render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts
  ---
  duration_ms: 1.562968
  type: 'test'
  ...
# Subtest: render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists
ok 10 - render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists
  ---
  duration_ms: 0.146306
  type: 'test'
  ...
# Subtest: render interior sketch visuals expose callable factories only for function inputs
ok 11 - render interior sketch visuals expose callable factories only for function inputs
  ---
  duration_ms: 0.111039
  type: 'test'
  ...
# Subtest: sketch front visual state reuses canonical full-door mirror/glass maps for split door segments
ok 12 - sketch front visual state reuses canonical full-door mirror/glass maps for split door segments
  ---
  duration_ms: 1.649128
  type: 'test'
  ...
1..12
# tests 12
# suites 0
# pass 12
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1228.322356

```

### ✅ Cloud sync lifecycle batch (direct)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `node tools/wp_serial_tests.mjs --batch-size 3 --heartbeat-ms 10000 --timeout-ms 120000 --failed-files-path .artifacts/cloud-sync-surfaces.lifecycle.failed.txt --timings-path .artifacts/cloud-sync-surfaces.lifecycle.timings.json tests/cloud_sync_panel_actions_runtime.test.js tests/cloud_sync_action_feedback_runtime.test.ts tests/cloud_sync_access_runtime.test.ts tests/cloud_sync_install_support_runtime.test.ts tests/cloud_sync_lifecycle_install_cleanup_runtime.test.js tests/cloud_sync_actions_runtime.test.ts tests/cloud_sync_async_singleflight_owner_runtime.test.ts tests/cloud_sync_config_runtime.test.ts tests/cloud_sync_delete_temp_runtime.test.ts tests/cloud_sync_lifecycle_attention_runtime.test.ts tests/cloud_sync_lifecycle_realtime_runtime.test.ts tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `9042ms`

#### stderr

```text
[serial-tests batch 1/5] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/5] ok (1.0s)
[serial-tests batch 2/5] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/5] ok (3.7s)
[serial-tests batch 3/5] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/5] ok (1.0s)
[serial-tests batch 4/5] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 4/5] ok (2.5s)
[serial-tests batch 5/5] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 5/5] ok (668ms)
[serial-tests] completed 13 files in 9.0s across 5 batches

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync access reads canonical services panelApi and ignores legacy root alias
ok 1 - cloud sync access reads canonical services panelApi and ignores legacy root alias
  ---
  duration_ms: 1.31503
  type: 'test'
  ...
# Subtest: cloud sync access ensures canonical service state on services root
ok 2 - cloud sync access ensures canonical service state on services root
  ---
  duration_ms: 0.208647
  type: 'test'
  ...
# Subtest: cloud sync access exposes test hooks through canonical service state only
ok 3 - cloud sync access exposes test hooks through canonical service state only
  ---
  duration_ms: 0.146498
  type: 'test'
  ...
# Subtest: cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required
ok 4 - cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required
  ---
  duration_ms: 26.000514
  type: 'test'
  ...
# Subtest: cloud sync feedback prefers preserved error messages when available
ok 5 - cloud sync feedback prefers preserved error messages when available
  ---
  duration_ms: 0.293589
  type: 'test'
  ...
# Subtest: cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller
ok 6 - cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller
  ---
  duration_ms: 74.623874
  type: 'test'
  ...
# Subtest: cloud sync panel actions fall back to derived status when panel snapshot api is unavailable
ok 7 - cloud sync panel actions fall back to derived status when panel snapshot api is unavailable
  ---
  duration_ms: 20.716064
  type: 'test'
  ...
1..7
# tests 7
# suites 0
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 935.727127
TAP version 13
# Subtest: cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping
ok 1 - cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping
  ---
  duration_ms: 2.236223
  type: 'test'
  ...
# Subtest: cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly
ok 2 - cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly
  ---
  duration_ms: 1.338874
  type: 'test'
  ...
# Subtest: cloud sync install support preserves backward compatibility for untagged published dispose refs
ok 3 - cloud sync install support preserves backward compatibility for untagged published dispose refs
  ---
  duration_ms: 0.852029
  type: 'test'
  ...
# Subtest: cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose
ok 4 - cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose
  ---
  duration_ms: 1.061837
  type: 'test'
  ...
# Subtest: cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch
ok 5 - cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch
  ---
  duration_ms: 0.333467
  type: 'test'
  ...
# Subtest: cloud sync install support clears only canonical published slots and preserves unrelated state
ok 6 - cloud sync install support clears only canonical published slots and preserves unrelated state
  ---
  duration_ms: 0.747342
  type: 'test'
  ...
# Subtest: cloud sync install support preserves canonical test hooks by default while clearing published slots
ok 7 - cloud sync install support preserves canonical test hooks by default while clearing published slots
  ---
  duration_ms: 0.311319
  type: 'test'
  ...
# Subtest: cloud sync install support drops test hooks when cleanup opts out of hook preservation
ok 8 - cloud sync install support drops test hooks when cleanup opts out of hook preservation
  ---
  duration_ms: 0.218694
  type: 'test'
  ...
# Subtest: cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/wrappers
ok 9 - cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/wrappers
  ---
  duration_ms: 14.161077
  type: 'test'
  ...
# Subtest: cloud_sync lifecycle: no timer/listener leaks after dispose
ok 10 - cloud_sync lifecycle: no timer/listener leaks after dispose
  ---
  duration_ms: 1.920968
  type: 'test'
  ...
# Subtest: cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle
ok 11 - cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle
  ---
  duration_ms: 3.071942
  type: 'test'
  ...
# Subtest: cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose
ok 12 - cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose
  ---
  duration_ms: 2.375305
  type: 'test'
  ...
# Subtest
...
[trimmed 12432 chars]
```

### ✅ Cloud sync main-row batch (direct)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `node tools/wp_serial_tests.mjs --batch-size 3 --heartbeat-ms 10000 --timeout-ms 120000 --failed-files-path .artifacts/cloud-sync-surfaces.main-row.failed.txt --timings-path .artifacts/cloud-sync-surfaces.main-row.timings.json tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts tests/cloud_sync_main_row_runtime.test.ts tests/cloud_sync_main_write_singleflight_runtime.test.ts tests/cloud_sync_mutation_commands_runtime.test.ts tests/cloud_sync_mutation_commands_singleflight_runtime.test.ts tests/cloud_sync_owner_context_runtime.test.ts tests/cloud_sync_status_install_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `4592ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (882ms)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_mutation_commands_runtime.test.ts … tests/cloud_sync_owner_context_runtime.test.ts)
[serial-tests batch 2/3] ok (2.9s)
[serial-tests batch 3/3] 1 file (tests/cloud_sync_status_install_runtime.test.ts)
[serial-tests batch 3/3] ok (742ms)
[serial-tests] completed 7 files in 4.5s across 3 batches

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync main row skips remote apply churn when newer rows carry the same payload
ok 1 - cloud sync main row skips remote apply churn when newer rows carry the same payload
  ---
  duration_ms: 2.205
  type: 'test'
  ...
# Subtest: cloud sync main row still applies remote payloads when the effective collections actually change
ok 2 - cloud sync main row still applies remote payloads when the effective collections actually change
  ---
  duration_ms: 1.115951
  type: 'test'
  ...
# Subtest: cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged
ok 3 - cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged
  ---
  duration_ms: 0.327265
  type: 'test'
  ...
# Subtest: cloud sync main row seeds a missing row from local collections on the initial pull
ok 4 - cloud sync main row seeds a missing row from local collections on the initial pull
  ---
  duration_ms: 3.117411
  type: 'test'
  ...
# Subtest: cloud sync main row initial seed reuses returned representation when the upsert already returns the row
ok 5 - cloud sync main row initial seed reuses returned representation when the upsert already returns the row
  ---
  duration_ms: 0.681468
  type: 'test'
  ...
# Subtest: cloud sync main row push publishes changed collections once and skips identical repeats
ok 6 - cloud sync main row push publishes changed collections once and skips identical repeats
  ---
  duration_ms: 1.463075
  type: 'test'
  ...
# Subtest: cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch
ok 7 - cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch
  ---
  duration_ms: 0.584702
  type: 'test'
  ...
# Subtest: cloud sync main row reuses the same pending push promise for duplicate direct pushes
ok 8 - cloud sync main row reuses the same pending push promise for duplicate direct pushes
  ---
  duration_ms: 0.781162
  type: 'test'
  ...
# Subtest: cloud sync main row pull applies newer remote payloads into local storage
ok 9 - cloud sync main row pull applies newer remote payloads into local storage
  ---
  duration_ms: 0.894353
  type: 'test'
  ...
# Subtest: cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull
ok 10 - cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull
  ---
  duration_ms: 0.7436
  type: 'test'
  ...
# Subtest: cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push
ok 11 - cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push
  ---
  duration_ms: 0.472935
  type: 'test'
  ...
# Subtest: cloud sync main row push applies settled remote payload locally without forcing a follow-up pull
ok 12 - cloud sync main row push applies settled remote payload locally without forcing a follow-up pull
  ---
  duration_ms: 0.792817
  type: 'test'
  ...
# Subtest: cloud sync main row collapses pull retries during a push into one post-push follow-up pull
ok 13 - cloud sync main row collapses pull retries during a push into one post-push follow-up pull
  ---
  duration_ms: 1.141211
  type: 'test'
  ...
# Subtest: cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests
ok 14 - cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests
  ---
  duration_ms: 1.520064
  type: 'test'
  ...
# Subtest: cloud sync main row notifies push-settled listeners only after the push flight has cleared
ok 15 - cloud sync main row notifies push-settled listeners only after the push flight has cleared
  ---
  duration_ms: 1.107376
  type: 'test'
  ...
# Subtest: cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests
ok 16 - cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests
  ---
  duration_ms: 0.898764
  type: 'test'
  ...
# Subtest: cloud sync main row shares app-scoped push ownership across main-row instances for the same App
ok 17 - cloud sync main row shares app-scoped push ownership across main-row instances for the same App
  ---
  duration_ms: 0.652505
  type: 'test'
  ...
# Subtest: cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run
ok 18 - cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run
  ---
  duration_ms: 0.303694
  type: 'test'
  ...
# Subtest: cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up
ok 19 - cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up
  ---
  dura
...
[trimmed 7923 chars]
```

### ✅ Cloud sync panel-install batch (direct)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_api_install_healing_runtime.test.ts tests/cloud_sync_panel_api_surface_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2432ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/cloud_sync_panel_api_install_healing_runtime.test.ts" "tests/cloud_sync_panel_api_surface_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall
ok 1 - cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall
  ---
  duration_ms: 5.763501
  type: 'test'
  ...
# Subtest: cloud sync panel api install heals legacy installed markers that only preserved stale public callables
ok 2 - cloud sync panel api install heals legacy installed markers that only preserved stale public callables
  ---
  duration_ms: 0.333174
  type: 'test'
  ...
# Subtest: cloud sync panel api install ignores stale publication epochs
ok 3 - cloud sync panel api install ignores stale publication epochs
  ---
  duration_ms: 0.401107
  type: 'test'
  ...
# Subtest: cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch
ok 4 - cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch
  ---
  duration_ms: 0.680277
  type: 'test'
  ...
# Subtest: cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup
ok 5 - cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup
  ---
  duration_ms: 0.587786
  type: 'test'
  ...
# Subtest: cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation
ok 6 - cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation
  ---
  duration_ms: 1.002476
  type: 'test'
  ...
# Subtest: cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods
ok 7 - cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods
  ---
  duration_ms: 0.502336
  type: 'test'
  ...
# Subtest: cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots
ok 8 - cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots
  ---
  duration_ms: 5.011935
  type: 'test'
  ...
# Subtest: cloud sync panel api runtime status clone strips drifted realtime/polling extras
ok 9 - cloud sync panel api runtime status clone strips drifted realtime/polling extras
  ---
  duration_ms: 0.487495
  type: 'test'
  ...
# Subtest: cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes
ok 10 - cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes
  ---
  duration_ms: 0.282291
  type: 'test'
  ...
# Subtest: cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged
ok 11 - cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged
  ---
  duration_ms: 0.430763
  type: 'test'
  ...
1..11
# tests 11
# suites 0
# pass 11
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2284.821942

```

### ✅ Cloud sync panel-controller batch (direct)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts tests/cloud_sync_panel_api_failures_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2143ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts" "tests/cloud_sync_panel_api_failures_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync panel api republishes panel snapshot even when floating pin command throws
ok 1 - cloud sync panel api republishes panel snapshot even when floating pin command throws
  ---
  duration_ms: 3.40533
  type: 'test'
  ...
# Subtest: cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws
ok 2 - cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws
  ---
  duration_ms: 1.235433
  type: 'test'
  ...
# Subtest: cloud sync panel api preserves thrown messages for controller-facing commands
ok 3 - cloud sync panel api preserves thrown messages for controller-facing commands
  ---
  duration_ms: 4.766947
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2020.659094

```

### ✅ Cloud sync panel-subscriptions batch (direct)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_api_singleflight_runtime.test.ts tests/cloud_sync_panel_api_subscriptions_runtime.test.ts tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2450ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/cloud_sync_panel_api_singleflight_runtime.test.ts" "tests/cloud_sync_panel_api_subscriptions_runtime.test.ts" "tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets
ok 1 - cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets
  ---
  duration_ms: 4.561133
  type: 'test'
  ...
# Subtest: cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App
ok 2 - cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App
  ---
  duration_ms: 1.302954
  type: 'test'
  ...
# Subtest: cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener
ok 3 - cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener
  ---
  duration_ms: 3.587931
  type: 'test'
  ...
# Subtest: cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles
ok 4 - cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles
  ---
  duration_ms: 0.670396
  type: 'test'
  ...
# Subtest: cloud sync async family runner blocks re-entrant conflicting targets before the first run settles
ok 5 - cloud sync async family runner blocks re-entrant conflicting targets before the first run settles
  ---
  duration_ms: 0.81406
  type: 'test'
  ...
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 2330.970221

```

### ✅ Cloud sync panel-snapshots batch (direct)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_snapshot_controller_runtime.test.ts tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3427ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/cloud_sync_panel_snapshot_controller_runtime.test.ts" "tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts" "tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts"

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors
ok 1 - cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors
  ---
  duration_ms: 2.65394
  type: 'test'
  ...
# Subtest: cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors
ok 2 - cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors
  ---
  duration_ms: 0.681366
  type: 'test'
  ...
# Subtest: cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths
ok 3 - cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths
  ---
  duration_ms: 2.049573
  type: 'test'
  ...
# Subtest: cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids fallback timer churn for unchanged snapshots
ok 4 - cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids fallback timer churn for unchanged snapshots
  ---
  duration_ms: 0.770106
  type: 'test'
  ...
# Subtest: cloud sync panel snapshot controller does not create fallback timer until a tabs-gate subscriber exists
ok 5 - cloud sync panel snapshot controller does not create fallback timer until a tabs-gate subscriber exists
  ---
  duration_ms: 0.286964
  type: 'test'
  ...
# Subtest: cloud sync panel snapshot controller falls back to timer-driven tabs-gate minute updates when no source subscription exists
ok 6 - cloud sync panel snapshot controller falls back to timer-driven tabs-gate minute updates when no source subscription exists
  ---
  duration_ms: 2.407303
  type: 'test'
  ...
1..6
# tests 6
# suites 0
# pass 6
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3294.743271

```

### ✅ Cloud sync sync-ops batch (direct)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `node tools/wp_serial_tests.mjs --batch-size 3 --heartbeat-ms 10000 --timeout-ms 120000 --failed-files-path .artifacts/cloud-sync-surfaces.sync-ops.failed.txt --timings-path .artifacts/cloud-sync-surfaces.sync-ops.timings.json tests/cloud_sync_pull_coalescer_runtime.test.ts tests/cloud_sync_realtime_support_runtime.test.ts tests/cloud_sync_remote_push_singleflight_runtime.test.ts tests/cloud_sync_rest_runtime.test.ts tests/cloud_sync_room_commands_runtime.test.ts tests/cloud_sync_site2_sketch_behavior_runtime.test.ts tests/cloud_sync_sketch_ops_runtime.test.ts tests/cloud_sync_sketch_pull_load_runtime.test.ts tests/cloud_sync_support_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `4269ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (1.2s)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_rest_runtime.test.ts … tests/cloud_sync_site2_sketch_behavior_runtime.test.ts)
[serial-tests batch 2/3] ok (1.9s)
[serial-tests batch 3/3] 3 files (tests/cloud_sync_sketch_ops_runtime.test.ts … tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 3/3] ok (1.0s)
[serial-tests] completed 9 files in 4.2s across 3 batches

```

#### stdout

```text
TAP version 13
# Subtest: cloud sync pull coalescer collapses burst triggers into one run and supports cancel
ok 1 - cloud sync pull coalescer collapses burst triggers into one run and supports cancel
  ---
  duration_ms: 2.466707
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels
ok 2 - cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels
  ---
  duration_ms: 0.472513
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics
ok 3 - cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics
  ---
  duration_ms: 0.349181
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers
ok 4 - cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers
  ---
  duration_ms: 0.970222
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run
ok 5 - cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run
  ---
  duration_ms: 0.302153
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles
ok 6 - cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles
  ---
  duration_ms: 0.401535
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists
ok 7 - cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists
  ---
  duration_ms: 0.473574
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse
ok 8 - cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse
  ---
  duration_ms: 0.504168
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst
ok 9 - cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst
  ---
  duration_ms: 0.503329
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles
ok 10 - cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles
  ---
  duration_ms: 0.671224
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles
ok 11 - cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles
  ---
  duration_ms: 0.602954
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer reports synchronous run failures and recovers for later work
ok 12 - cloud sync pull coalescer reports synchronous run failures and recovers for later work
  ---
  duration_ms: 0.368736
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires
ok 13 - cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires
  ---
  duration_ms: 0.199477
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run
ok 14 - cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run
  ---
  duration_ms: 0.252703
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run
ok 15 - cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run
  ---
  duration_ms: 0.224808
  type: 'test'
  ...
# Subtest: cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted
ok 16 - cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted
  ---
  duration_ms: 0.192954
  type: 'test'
  ...
# Subtest: cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window
ok 17 - cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window
  ---
  duration_ms: 2.088977
  type: 'test'
  ...
# Subtest: cloud sync realtime connecting/failure/dispose markers share one canonical branch owner
ok 18 - cloud sync realtime connecting/failure/dispose markers share one canonical branch owner
  ---
  duration_ms: 0.957216
  type: 'test'
  ...
# Subtest: cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner
ok 19 - cloud sync realtime tim
...
[trimmed 11108 chars]
```

### ✅ Cloud sync tabs-ui batch (direct)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_sync_pin_command_runtime.test.ts tests/cloud_sync_tabs_gate_command_runtime.test.ts tests/cloud_sync_tabs_gate_runtime.test.ts tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts tests/cloud_sync_ui_action_controller_runtime.test.js`
- status: **passed**
- exit code: `0`
- duration: `4608ms`

#### stderr

```text
[run-tsx-tests] /opt/nvm/versions/node/v22.16.0/bin/node --import tsx --test "tests/cloud_sync_sync_pin_command_runtime.test.ts" "tests/cloud_sync_tabs_gate_command_runtime.test.ts" "tests/cloud_sync_tabs_gate_runtime.test.ts" "tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts" "tests/cloud_sync_ui_action_controller_runtime.test.js"

```

#### stdout

```text
TAP version 13
# Subtest: floating sketch sync pin command becomes a no-op when state is unchanged
ok 1 - floating sketch sync pin command becomes a no-op when state is unchanged
  ---
  duration_ms: 1.77875
  type: 'test'
  ...
# Subtest: floating sketch sync pin command rolls back local state on push failure
ok 2 - floating sketch sync pin command rolls back local state on push failure
  ---
  duration_ms: 0.36229
  type: 'test'
  ...
# Subtest: floating sketch sync pin toggle command flips the current state
ok 3 - floating sketch sync pin toggle command flips the current state
  ---
  duration_ms: 0.405634
  type: 'test'
  ...
# Subtest: floating sketch sync pin command preserves push failure message
ok 4 - floating sketch sync pin command preserves push failure message
  ---
  duration_ms: 0.349223
  type: 'test'
  ...
# Subtest: floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets
ok 5 - floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets
  ---
  duration_ms: 0.322587
  type: 'test'
  ...
# Subtest: cloud sync tabs gate command skips redundant refreshes but extends stale opens
ok 6 - cloud sync tabs gate command skips redundant refreshes but extends stale opens
  ---
  duration_ms: 1.333222
  type: 'test'
  ...
# Subtest: cloud sync tabs gate command rolls back on push failure and reports final state
ok 7 - cloud sync tabs gate command rolls back on push failure and reports final state
  ---
  duration_ms: 0.656392
  type: 'test'
  ...
# Subtest: cloud sync tabs gate toggle command flips the current ref state
ok 8 - cloud sync tabs gate toggle command flips the current ref state
  ---
  duration_ms: 0.211538
  type: 'test'
  ...
# Subtest: cloud sync tabs gate command preserves push failure message
ok 9 - cloud sync tabs gate command preserves push failure message
  ---
  duration_ms: 0.317804
  type: 'test'
  ...
# Subtest: cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets
ok 10 - cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets
  ---
  duration_ms: 0.405713
  type: 'test'
  ...
# Subtest: cloud sync tabs gate closes stale site2 UI on initial pull miss
ok 11 - cloud sync tabs gate closes stale site2 UI on initial pull miss
  ---
  duration_ms: 2.961698
  type: 'test'
  ...
# Subtest: cloud sync tabs gate uses the current gate base room for push and pull
ok 12 - cloud sync tabs gate uses the current gate base room for push and pull
  ---
  duration_ms: 1.032098
  type: 'test'
  ...
# Subtest: cloud sync tabs gate defaults to the public room when no room URL is selected
ok 13 - cloud sync tabs gate defaults to the public room when no room URL is selected
  ---
  duration_ms: 0.721754
  type: 'test'
  ...
# Subtest: cloud sync tabs gate public-room push is visible to site2 public-room pull
ok 14 - cloud sync tabs gate public-room push is visible to site2 public-room pull
  ---
  duration_ms: 1.439485
  type: 'test'
  ...
# Subtest: cloud sync tabs gate site2 ignores local open fallback when cloud row is missing
ok 15 - cloud sync tabs gate site2 ignores local open fallback when cloud row is missing
  ---
  duration_ms: 0.502239
  type: 'test'
  ...
# Subtest: cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling
ok 16 - cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling
  ---
  duration_ms: 1.167635
  type: 'test'
  ...
# Subtest: cloud sync tabs gate direct push reports controller-only canonically on site2
ok 17 - cloud sync tabs gate direct push reports controller-only canonically on site2
  ---
  duration_ms: 0.225801
  type: 'test'
  ...
# Subtest: cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App
ok 18 - cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App
  ---
  duration_ms: 0.631701
  type: 'test'
  ...
# Subtest: cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state
ok 19 - cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state
  ---
  duration_ms: 3.252451
  type: 'test'
  ...
# Subtest: [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam
ok 20 - [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam
  ---
  duration_ms: 2945.621579
  type: 'test'
  ...
# Subtest: [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations
ok 21 - [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on co
...
[trimmed 574 chars]
```

### ✅ Playwright smoke suite listing

- id: `e2e-list`
- category: `e2e`
- command: `npm run e2e:smoke:list`
- status: **passed**
- exit code: `0`
- duration: `1733ms`

#### stdout

```text

> e2e:smoke:list
> playwright test -c playwright.config.ts --list

Listing tests:
  [setup] › app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers
  [chromium] › authoring_builds.spec.ts:477:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work
  [chromium] › authoring_builds.spec.ts:544:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:607:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:664:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:719:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:774:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable
  [chromium] › authoring_builds.spec.ts:813:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:879:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated
  [chromium] › canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target
  [chromium] › cloud_sync_reconnect.spec.ts:29:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable
  [chromium] › resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry
  [chromium] › resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state
  [chromium] › resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry
  [chromium] › smoke.spec.ts:24:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable
  [chromium] › smoke.spec.ts:50:3 › Playwright smoke flows › header save-load roundtrip restores project name
  [chromium] › smoke.spec.ts:71:3 › Playwright smoke flows › header reset default replaces the current project cleanly
  [chromium] › smoke.spec.ts:82:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar
  [chromium] › smoke.spec.ts:98:3 › Playwright smoke flows › export tab keeps cloud-sync surface interactive
  [chromium] › user_paths.spec.ts:113:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics
  [chromium] › user_paths.spec.ts:175:3 › Playwright real user paths › repeated export and pdf pressure preserves user state
  [chromium] › user_paths.spec.ts:213:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip
  [chromium] › user_paths.spec.ts:261:3 › Playwright real user paths › cabinet authoring options survive project roundtrip
  [chromium] › user_paths.spec.ts:311:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout maps
  [chromium] › user_paths.spec.ts:353:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout scenario matrix
  [chromium] › user_paths.spec.ts:400:3 › Playwright real user paths › settings backup import and restore-last-session recover real user state
Total: 26 tests in 7 files

```

### ⚠️ Playwright browser preflight

- id: `e2e-preflight`
- category: `e2e`
- command: `npm run e2e:smoke:preflight`
- status: **environment-blocked**
- exit code: `1`
- duration: `1638ms`

#### stderr

```text
[WardrobePro] Playwright Chromium preflight failed.
Browser target: system Chromium at /usr/bin/chromium
Browser launch succeeded, but real navigation is blocked by environment or browser policy.

Original error:
page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR at http://127.0.0.1:32957/
Call log:
  - navigating to "http://127.0.0.1:32957/", waiting until "domcontentloaded"

Recommended next steps:
  1. Run: npm run e2e:install
  2. Re-run: npm run e2e:smoke:preflight
  3. If bundled browsers are unavailable, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH or rely on a detected system Chromium
  4. If system Chromium launches but blocks navigation, use bundled Playwright browsers in a less restricted environment
  5. As a fallback sanity check, use: npm run e2e:smoke:list

```

#### stdout

```text

> e2e:smoke:preflight
> node tools/wp_playwright_preflight.js


```

### ⚠️ Playwright smoke run

- id: `e2e-smoke-run`
- category: `e2e`
- command: `npm run e2e:smoke`
- status: **environment-blocked**
- exit code: `1`
- duration: `0ms`

#### stderr

```text
Skipped because dependency e2e-preflight resolved to environment-blocked.
```
