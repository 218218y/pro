# Final Verification Summary

- generated_at: 2026-07-08T07:42:12.375Z
- workspace: `C:\pro\pro`
- total lanes: **25**
- passed: **24**
- environment-blocked: **0**
- runner-blocked: **0**
- failed: **1**
- selected profiles: `default`
- selected categories: `(all)`
- selected lanes: `(all)`
- skipped lanes: `(none)`
- resumed from: `(start)`
- state file: `.artifacts/closeout-state.json`

## Interpretation

At least one lane failed at the verify/command level, so this closeout is not complete yet.

No environment blockers were detected in this closeout run.

No runner blockers were detected in this closeout run.

## Lane results

### [PASS] Build dist bundle

- id: `build-dist`
- category: `build`
- command: `npm run build:dist`
- status: **passed**
- exit code: `0`
- duration: `26016ms`

#### stdout

```text

> build:dist
> node tools/wp_build_dist.js

[WP BuildDist] Building dist modules (tsc:local-node-modules)...
[WP BuildDist] Copying static assets to dist/...
[WP BuildDist] Done: dist/esm + dist/types + static assets

```

### [FAIL] Perf smoke baseline

- id: `perf-smoke`
- category: `perf`
- command: `npm run perf:smoke`
- status: **failed**
- exit code: `1`
- duration: `8511ms`

#### stderr

```text
[WP Perf Smoke] performance budget regression detected.

```

#### stdout

```text

> perf:smoke
> node tools/wp_perf_smoke.mjs --enforce


============================================================
[WP Perf Smoke] npm run test:perf-toolchain-core
============================================================


> test:perf-toolchain-core
> node --test tests/wp_perf_smoke_runtime.test.js tests/wp_toolchain_family_contracts.test.js tests/wp_check_runtime.test.js tests/wp_verify_runtime.test.js tests/wp_verify_lane_runtime.test.js tests/wp_verify_parallel_runtime.test.js

✔ check arg parsing preserves baseline/json/gate/strict flags (3.1406ms)
✔ check mode detection prefers js first and falls back to esm (2.5104ms)
✔ check syntax runner reports malformed js files (106.4299ms)
✔ check policy stats count legacy/root needles by directory (6.8437ms)
✔ check gate/strict results report regressions and clean strict state (0.5197ms)
✔ check json report preserves file and policy summary fields (0.2471ms)
✔ perf smoke args parse lanes, scripts, baseline paths, and flags canonically (3.3545ms)
✔ perf smoke help text advertises default lanes and baseline flags (0.5368ms)
✔ perf smoke planner resolves verify lanes and dedupes script overlap (1.0852ms)
✔ perf smoke baseline evaluation detects regressions and profile drift (2.8303ms)
✔ perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow (18.8522ms)
✔ [toolchain] build-dist keeps one thin entrypoint plus canonical owner modules (5.6574ms)
✔ [toolchain] bundle keeps one thin entrypoint plus canonical owner modules (1.4975ms)
✔ [toolchain] check keeps one thin entrypoint plus canonical owner modules (1.4207ms)
✔ [toolchain] release keeps one thin entrypoint plus canonical owner modules (2.023ms)
✔ [toolchain] release-parity keeps one thin entrypoint plus canonical owner modules (1.6499ms)
✔ [toolchain] test keeps one thin entrypoint plus canonical owner modules (1.206ms)
✔ [toolchain] typecheck keeps one thin entrypoint plus canonical owner modules (1.1747ms)
✔ [toolchain] verify-lane keeps one thin entrypoint plus canonical owner modules (3.3887ms)
✔ [toolchain] perf-smoke keeps one thin entrypoint plus canonical owner modules (1.1321ms)
✔ [toolchain] verify keeps one thin entrypoint plus canonical owner modules (1.2776ms)
✔ [toolchain] verify-parallel keeps one thin entrypoint plus canonical owner modules (1.0044ms)
✔ verify lane state parses multiple lane names plus print/dry-run/no-dedupe flags (3.0024ms)
✔ verify lane catalog lists stable lane names, flattens nested aliases, and dedupes multi-lane plans canonically (0.8942ms)
✔ verify lane planner reports the canonical script order for single and multi-lane runs (0.6422ms)
✔ verify lane flow runs flattened scripts in order (0.7662ms)
✔ verify lane flow dedupes overlapping scripts across multiple lanes by default (0.4852ms)
✔ verify lane help text advertises the canonical lane catalog and multi-lane support (0.6494ms)

⚠️  Prettier check: formatting differences found (warning only).

❌ Prettier check failed in gate mode (formatting differences found).
✔ verify parallel args preserve verify flags and local concurrency controls (5.2572ms)
✔ verify parallel plan builds once and gives test shards isolated reports (2.5543ms)
✔ verify parallel flow treats prettier diffs as warnings outside gate mode (4.5212ms)
✔ verify parallel flow fails prettier diffs in gate mode and skips bundle phase (3.8958ms)

============================================================
[WardrobePro] build dist (no assets)
============================================================

✔ verify args parsing preserves gate/no-build/skip-bundle/soft-format policy (4.2565ms)
✔ format check classification warns in normal mode and fails in strict gate mode (0.8266ms)
✔ ensureDistBuilt refuses missing dist in no-build mode and requests build otherwise (4.6742ms)
✔ verify flow orders core checks and skips bundle commands when requested (3.63ms)
✔ verify flow runs both client release bundle targets in order when bundling is enabled (3.5222ms)
ℹ tests 37
ℹ suites 0
ℹ pass 37
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 300.8789

============================================================
[WP Perf Smoke] npm run test:ui-react-import-hardening-contracts
============================================================


> test:ui-react-import-hardening-contracts
> node --test tests/ui_react_import_hardening_contracts.test.js

✔ ui react import hardening removes legacy React namespace access from pure ts modules (38.6309ms)
✔ ui react import hardening uses explicit named type imports for event-heavy contracts (0.3248ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 154.2659

============================================================
[WP Perf Smoke] npm run test:ui-react-jsx-hardening-contracts
============================================================


> test:ui-react-jsx-
...
[trimmed 1530 chars]
```

### [PASS] Overlay/export family core verify (direct)

- id: `overlay-export-core`
- category: `verify`
- command: `(grouped steps)`
- status: **passed**
- exit code: `0`
- duration: `16298ms`

#### steps

- [PASS] overlay/export contracts: `node --test tests/export_overlay_errors_family_contracts.test.js` (passed, 301ms)
- [PASS] typecheck platform: `node tools/wp_typecheck.js --mode platform` (passed, 3221ms)
- [PASS] typecheck services: `node tools/wp_typecheck.js --mode services` (passed, 6252ms)
- [PASS] typecheck runtime: `node tools/wp_typecheck.js --mode runtime` (passed, 2704ms)
- [PASS] layer contracts: `node tools/wp_layer_contract.js` (passed, 1773ms)
- [PASS] public api contracts: `node tools/wp_public_api_contract.js` (passed, 2047ms)

### [PASS] Order PDF overlay core batch (direct)

- id: `order-pdf-overlay-core`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_overlay_controller_actions_runtime.test.ts tests/order_pdf_overlay_draft_action_feedback_runtime.test.ts tests/order_pdf_overlay_draft_commands_runtime.test.ts tests/order_pdf_overlay_draft_effects_runtime.test.ts tests/order_pdf_overlay_interactions_runtime.test.ts tests/order_pdf_overlay_runtime_export_runtime.test.ts tests/order_pdf_overlay_text_details_lines_runtime.test.ts tests/order_pdf_overlay_text_runtime.test.ts tests/order_pdf_text_details_merge_support_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `5185ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/order_pdf_overlay_controller_actions_runtime.test.ts" "tests/order_pdf_overlay_draft_action_feedback_runtime.test.ts" "tests/order_pdf_overlay_draft_commands_runtime.test.ts" "tests/order_pdf_overlay_draft_effects_runtime.test.ts" "tests/order_pdf_overlay_interactions_runtime.test.ts" "tests/order_pdf_overlay_runtime_export_runtime.test.ts" "tests/order_pdf_overlay_text_details_lines_runtime.test.ts" "tests/order_pdf_overlay_text_runtime.test.ts" "tests/order_pdf_text_details_merge_support_runtime.test.ts"

```

#### stdout

```text
✔ order pdf export actions honor image/gmail busy flags before starting another action (12.3487ms)
✔ order pdf interaction handlers report pointer-cancel failures instead of throwing (0.8921ms)
✔ order pdf export actions reuse cached interactive blob while draft signature is unchanged (2.0227ms)
✔ getOrderPdfOverlayDraftActionToast maps initial-load not-ready to a clear error (2.8111ms)
✔ getOrderPdfOverlayDraftActionToast keeps refresh confirm pending without a toast guess (0.3519ms)
✔ getOrderPdfOverlayDraftActionToast prefers configured inline-confirm success text (0.3658ms)
✔ applyOrderPdfOverlayDraftActionToast emits fallback cancel info when no next draft exists (5.7391ms)
✔ readOrderPdfDraftSeedFromProjectWithDeps reports not-ready when export API is missing (7.4985ms)
✔ loadOrderPdfInitialDraftWithDeps returns seeded draft and detailsDirty state (0.8563ms)
✔ refreshOrderPdfDraftFromProjectWithDeps returns pending confirm when merge policy requires it (1.0414ms)
✔ resolveOrderPdfInlineConfirmAction returns the selected follow-up draft (3.3727ms)
✔ order pdf draft effects preserves a canonical edited details pair (5.2799ms)
✔ order pdf draft effects derives the seed from canonical text when auto details are empty (0.3411ms)
✔ order pdf stage/file interactions keep close intent and PDF validation behavior canonical (3.5059ms)
✔ order pdf focus trap cleanup cancels late initial-focus raf work and keyboard guards respect modal state (3.0793ms)
✔ getPdfJsLibFromModule accepts either direct or default PDF.js-like module shapes (2.7003ms)
✔ getOrderPdfDraftFn and asExportApiLike only expose callable PDF export hooks (5.4675ms)
✔ bindExportApiFromModule captures the app once and returns null for missing module/app (1.0846ms)
✔ order pdf details line helpers parse and collect canonical keyed rows (3.3917ms)
✔ order pdf details line helpers preserve inline tails and positioned extras (1.8478ms)
✔ order pdf text fallback html decoder preserves newlines and common entities without a document (2.6992ms)
✔ order pdf text public seam exposes the canonical empty draft defaults (1.7007ms)
✔ order pdf text merge falls back to exact base replacement when no marker document is available (1.3815ms)
✔ order pdf merge support keeps inline suffixes and positioned extras through the canonical support seam (5.0513ms)
✔ order pdf merge support marks ambiguous line merges unsafe when new keyed rows appear (2.1484ms)
✔ order pdf merge support resolves clean detected regions without preserving stale manual leftovers (0.818ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4983.1098

```

### [PASS] Order PDF PDF-render batch (direct)

- id: `order-pdf-pdf-render`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_overlay_pdf_import_runtime.test.ts tests/order_pdf_overlay_pdf_render_canvas_runtime.test.ts tests/order_pdf_overlay_pdf_render_cleanup_runtime.test.ts tests/order_pdf_overlay_pdf_render_runtime.test.ts tests/order_pdf_image_pdf_text_layout_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `4578ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/order_pdf_overlay_pdf_import_runtime.test.ts" "tests/order_pdf_overlay_pdf_render_canvas_runtime.test.ts" "tests/order_pdf_overlay_pdf_render_cleanup_runtime.test.ts" "tests/order_pdf_overlay_pdf_render_runtime.test.ts" "tests/order_pdf_image_pdf_text_layout_runtime.test.ts"

```

#### stdout

```text
✔ [order-pdf] prepared details split can be painted without re-wrapping (6.0037ms)
✔ [order-pdf] prepared layout preserves wrapped lines and visible max-line window (0.5731ms)
✔ [order-pdf] image-pdf details text uses the canonical touched semantics (1.0334ms)
✔ order pdf pdf-import keeps only imported tail pages when both sketch exports are disabled (34.7109ms)
✔ order pdf pdf-import keeps built render page and imported open page when only open-closed export is disabled (10.1421ms)
✔ order pdf pdf-import does not duplicate imported tail pages when both sketch exports stay enabled (13.0819ms)
✔ order pdf pdf-import clears saved form text and stale widget appearances for editor background (29.8848ms)
✔ order pdf pdf-import detects trailing non-form pages and keeps extracted draft flags aligned with imported tails (4.2564ms)
✔ order pdf pdf-import extracts generated field names through the canonical document-field runtime (30.6559ms)
✔ order pdf pdf-import reads bytes from file-like objects and tolerates read failures (0.6892ms)
✔ order pdf pdf-import falls back to imported open-closed page when the built pdf only contains one generated tail page (5.9455ms)
✔ order pdf pdf-import applies canonical html-only details and notes through the imported-field runtime (1.4209ms)
✔ order pdf pdf-import extracts editor fields from an existing PDF text/OCR layer (2.2487ms)
✔ order pdf image-pdf export writes hidden import fields that load back into the editor (18.663ms)
✔ order pdf canvas render runtime: uses injected browser timers and renders once through the queued canvas path (11.811ms)
✔ order pdf canvas render runtime: stale timer callback becomes a no-op after cleanup (0.8329ms)
✔ cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly (4.5965ms)
✔ loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document (1.1ms)
✔ loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves (0.7014ms)
✔ order pdf render helpers treat destroyed/aborted worker errors as expected cancellations (6.5705ms)
✔ loadOrderPdfFirstPage clones source bytes before handing them to pdf.js (1.7348ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4384.027

```

### [PASS] Order PDF sketch batch (direct)

- id: `order-pdf-sketch`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_history_shortcuts_runtime.test.ts tests/order_pdf_sketch_draft_persistence_runtime.test.ts tests/order_pdf_sketch_palette_placement_runtime.test.ts tests/order_pdf_sketch_panel_runtime.test.ts tests/order_pdf_sketch_preview_session_runtime.test.ts tests/order_pdf_sketch_shortcuts_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3125ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/order_pdf_history_shortcuts_runtime.test.ts" "tests/order_pdf_sketch_draft_persistence_runtime.test.ts" "tests/order_pdf_sketch_palette_placement_runtime.test.ts" "tests/order_pdf_sketch_panel_runtime.test.ts" "tests/order_pdf_sketch_preview_session_runtime.test.ts" "tests/order_pdf_sketch_shortcuts_runtime.test.ts"

```

#### stdout

```text
✔ [history-ui] suspended history shortcuts are detected from the active overlay element (1.8509ms)
✔ [history-ui] suspended history shortcuts fall back to a document-level overlay marker (0.4892ms)
✔ [order-pdf] draft rehydrate keeps sketch annotations and sketch include flags (3.8077ms)
✔ [order-pdf] refresh-auto preserves sketch annotations while refreshing project details (1.1166ms)
✔ [order-pdf] sketch floating palette placement anchors left of the toolbar trigger without leaving the viewport (1.4445ms)
✔ [order-pdf] sketch floating palette placement clamps inside the viewport when there is not enough space (0.1886ms)
✔ [order-pdf] sketch toolbar placement tracks the visible stage band instead of sticking to the initial viewport slot (1.144ms)
✔ [order-pdf] sketch toolbar placement falls back to inline mode on narrow viewports (0.1603ms)
✔ [order-pdf] sketch toolbar placement equality treats left-anchored toolbars as real geometry changes (0.2251ms)
✔ [order-pdf] sketch canvas repaint helper suppresses redraws for cloned-but-equal annotation payloads (0.6187ms)
✔ [order-pdf] sketch canvas repaint helper suppresses duplicate redraws until geometry or payload really changes (0.2501ms)
✔ [order-pdf] sketch canvas frame only commits once a real 2d context exists (0.556ms)
✔ [order-pdf] sketch panel runtime builds per-page stroke maps and counts canonically (2.8889ms)
✔ [order-pdf] sketch panel runtime redo stack helpers clone, trim, and clear per page key (0.6824ms)
✔ [order-pdf] sketch panel runtime drawing point collector skips jitter but keeps meaningful motion (0.3498ms)
✔ [order-pdf] sketch panel runtime normalizes client drawing points once per measured host rect (0.3966ms)
✔ [order-pdf] sketch panel runtime appends coalesced client batches without rereading layout per point (0.4419ms)
✔ [order-pdf] sketch panel runtime tracks geometric tools as anchor/end drags and emits normalized paths (1.2384ms)
✔ [order-pdf] sketch panel runtime keeps the latest geometric drag point when coalesced batches contain stale history (0.2301ms)
✔ [order-pdf] sketch panel runtime builds per-page text-box maps and folds them into redo counts (0.4329ms)
✔ [order-pdf] sketch panel runtime normalizes and compares measured drawing rects canonically (0.4316ms)
✔ [order-pdf] sketch panel runtime reads drawing rects once from the measured host surface (0.3427ms)
✔ [order-pdf] sketch preview reveal scrolls the editor stage just enough to expose created images (0.2749ms)
✔ [order-pdf] sketch preview reveal does not scroll when the panel is already visible (0.1284ms)
✔ [order-pdf] sketch preview reveal uses the stage scroll container instead of the page window (0.364ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after success (2.3857ms)
✔ [order-pdf] sketch preview session restores the original sketch mode after failure (1.7895ms)
✔ [order-pdf] sketch preview session snapshot captures and restores both sketch and doors-open states (0.6367ms)
✔ [order-pdf] sketch preview session restores the original doors-open state after success (0.4792ms)
✔ [order-pdf] sketch preview session snapshot captures and restores the original camera pose (1.5061ms)
✔ [order-pdf] sketch preview session restores the original camera pose after success (0.5799ms)
✔ [order-pdf] sketch undo shortcut matches english and hebrew ctrl/cmd+z (1.8596ms)
✔ [order-pdf] sketch redo shortcut matches ctrl/cmd+y and ctrl/cmd+shift+z in english and hebrew (0.4309ms)
✔ [order-pdf] sketch history shortcuts are always consumed while the sketch panel is open (0.3515ms)
ℹ tests 34
ℹ suites 0
ℹ pass 34
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2895.4599

```

### [PASS] Order PDF export overlay batch (direct)

- id: `order-pdf-export-overlay`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/order_pdf_overlay_export_ops_runtime.test.ts tests/order_pdf_overlay_export_commands_runtime.test.ts tests/order_pdf_overlay_export_singleflight_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3898ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/order_pdf_overlay_export_ops_runtime.test.ts" "tests/order_pdf_overlay_export_commands_runtime.test.ts" "tests/order_pdf_overlay_export_singleflight_runtime.test.ts"

```

#### stdout

```text
✔ loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data (2.8552ms)
✔ exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download (0.5211ms)
✔ exportOrderPdfImageWithDeps reports busy before building another image PDF (0.3092ms)
✔ exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing (0.2963ms)
✔ loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast (0.6893ms)
✔ exportOrderPdfInteractiveWithDeps preserves the real export failure detail (0.3443ms)
✔ loadOrderPdfIntoEditorWithDeps treats canonical html-only extracted details as found fields (0.5907ms)
✔ loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late (0.5921ms)
✔ order pdf overlay export ops fail fast when rasterization has no document seam (2.3983ms)
✔ order pdf overlay export ops build image attachments through the canonical attachment seam (5.4273ms)
✔ order pdf overlay image rasterization does not repaint sketch annotations already baked into sketch pages (1.9223ms)
✔ order pdf overlay image rasterization restores first-page annotations clipped inside repainted PDF text boxes (2.574ms)
✔ order pdf export single-flight reuses duplicate same-key work per app and clears after completion (2.6233ms)
✔ order pdf export single-flight returns busy for conflicting keys on the same app and stays independent across apps (0.5448ms)
✔ order pdf export single-flight derives stable load keys and maps them back to action kinds (0.7273ms)
ℹ tests 15
ℹ suites 0
ℹ pass 15
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3637.5855

```

### [PASS] Order PDF export builders batch (direct)

- id: `order-pdf-export-builders`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/export_order_pdf_builder_draft_runtime.test.ts tests/export_order_pdf_builder_runtime.test.ts tests/export_order_pdf_builder_sketch_annotations_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3924ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/export_order_pdf_builder_draft_runtime.test.ts" "tests/export_order_pdf_builder_runtime.test.ts" "tests/export_order_pdf_builder_sketch_annotations_runtime.test.ts"

```

#### stdout

```text
✔ resolveOrderPdfString keeps strings but canonicalizes nullish and numeric values (2.0575ms)
✔ resolveOrderPdfOrderDetails uses edited details only when the canonical touched marker says so (0.6488ms)
✔ resolveOrderPdfDraft keeps canonical defaults while honoring draft overrides (5.308ms)
✔ buildOrderPdfInteractiveBlobFromDraft keeps the embedded AcroForm template usable (911.181ms)
✔ captureOrderPdfCompositeImages applies sketch annotations after base composite capture (4.5143ms)
✔ buildOrderPdfDocumentResult embeds the primary PDF page annotation layer at high raster density (1.8313ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3735.0532

```

### [PASS] Order PDF export capture batch (direct)

- id: `order-pdf-export-capture`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/export_order_pdf_capture_cache_runtime.test.ts tests/export_order_pdf_capture_runtime.test.ts tests/export_order_pdf_ops_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3909ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/export_order_pdf_capture_cache_runtime.test.ts" "tests/export_order_pdf_capture_runtime.test.ts" "tests/export_order_pdf_ops_runtime.test.ts"

```

#### stdout

```text
✔ order pdf capture cache signature falls back cleanly when state is missing or invalid (2.9991ms)
✔ order pdf capture cache returns cloned bytes instead of live cache buffers (2.1355ms)
✔ order pdf capture cache reuses sketch base assets while signature is unchanged (1.4016ms)
✔ order pdf capture cache ignores pdf editor draft changes but invalidates on build/config changes (0.7007ms)
✔ order pdf capture cache signature ignores sketch-only annotation changes (1.3805ms)
✔ export order pdf capture viewer toggles doors/sketch canonically and rasterizes the composed canvas (3.6574ms)
✔ export order pdf capture canvas helpers keep first successful fetch result while tolerating earlier failures (0.8531ms)
✔ order PDF render/sketch composite preserves chest live viewport and screenshot note mapping (2.9748ms)
✔ order PDF open/closed composite preserves corner live viewport and screenshot note mapping (1.175ms)
✔ export order pdf ops factory exposes stable draft/export surface (4.0837ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3685.2781

```

### [PASS] Order PDF export text batch (direct)

- id: `order-pdf-export-text`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/export_order_pdf_sketch_annotations_runtime.test.ts tests/export_order_pdf_text_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2576ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/export_order_pdf_sketch_annotations_runtime.test.ts" "tests/export_order_pdf_text_runtime.test.ts"

```

#### stdout

```text
✔ createOrderPdfRenderAnnotationLayerPngOp renders first-page PDF annotations to PNG bytes (5.4505ms)
✔ listOrderPdfSketchStrokes keeps only valid strokes for the requested page (0.4497ms)
✔ paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas (0.695ms)
✔ paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser (0.3803ms)
✔ compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer (1.2506ms)
✔ paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite (1.6472ms)
✔ export order pdf text ops compose details, bidi, and layout behavior from one canonical seam (4.1862ms)
✔ export order pdf text ops keep canonical draft defaults and bidi stabilization behavior (2.2814ms)
✔ export order pdf text uses wardrobe-type depth fallback only when raw depth is missing (0.5451ms)
✔ export order pdf text includes classic cornice only when the main cornice flag is enabled (0.3445ms)
✔ export order pdf text omits cornice when the main cornice flag is disabled (0.3464ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2359.9302

```

### [PASS] Sketch manual/hover batch (direct)

- id: `sketch-manual-hover`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/sketch_manual_tool_host_runtime.test.ts tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2310ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/sketch_manual_tool_host_runtime.test.ts" "tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts" "tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts"

```

#### stdout

```text
✔ manual-layout flow fills all shelves for a new brace layout through the canonical mutation owner (4.7583ms)
✔ manual-layout flow skips auto-filled shelves colliding with sketch drawers and warns once (3.5163ms)
✔ manual-layout flow toggles a rod off and removes only the matching exact preset rod metadata (0.908ms)
✔ manual-layout hover module context clamps sketch-box placement and preserves width/depth overrides (6.187ms)
✔ manual-layout hover module context falls back to the corner root config when no cell config exists (2.4345ms)
✔ manual-layout module box preview routes shelf hover through the focused box owner (9.5502ms)
✔ manual-layout module stack preview routes ext drawers through the focused stack owner (6.3564ms)
✔ manual-layout sketch hover keeps selector hits inside module flow even for sketch-box tools (11.1417ms)
✔ manual-layout sketch hover targets free-box content before a module selector behind it (4.2548ms)
✔ manual-layout sketch hover falls back to standalone free placement when no selector is hit (1.3327ms)
✔ manual-layout sketch external drawer hover marks standard external drawers for removal only (1.1232ms)
✔ manual-layout sketch internal drawer hover ignores standard external drawers (0.5315ms)
✔ manual-layout free-box external drawer hover prefers the drawer stack over a nearby shelf removal (4.7837ms)
✔ module surface hover writes shelf add intent so click follows the hover preview (10.4374ms)
✔ module surface hover writes rod add intent so stale shelf-remove hover cannot steal the click (1.5912ms)
✔ module preview flow probes existing shelf removal before drawer stack add previews (1.6075ms)
✔ existing vertical remove helper is a no-op when nothing removable is under the cursor (1.2816ms)
✔ door action hover state resolves the nearest door leaf owner with metrics (1.4592ms)
✔ manual-layout sketch hover selector helper keeps selector-local X in selector-parent space and prefers specific selectors (3.1783ms)
✔ manual-layout sketch hover runtime hides layout preview only once when the active tool is not a sketch tool (3.8179ms)
✔ manual-layout sketch hover runtime hides preview + clears hover when mode is not manual-layout (0.6589ms)
✔ manual tool access prefers canonical mode-state value before runtime tools fallback (2.5831ms)
✔ manual tool access falls back to runtime tools when mode-state tool is absent (0.5851ms)
✔ sketch-free host falls back to internal grid maps before the zero-door hinged default host (4.269ms)
✔ sketch-free host uses the hinged zero-door fallback only when no config or grid host exists (0.5173ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2108.1883

```

### [PASS] Sketch box/hover batch (direct)

- id: `sketch-box-hover`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/canvas_picking_sketch_box_runtime_runtime.test.ts tests/canvas_picking_sketch_box_door_preview_runtime.test.ts tests/canvas_picking_sketch_box_doors_runtime.test.ts tests/canvas_picking_sketch_box_overlap_runtime.test.ts tests/sketch_box_hover_click_runtime.test.ts tests/sketch_box_door_visuals_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `1952ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/canvas_picking_sketch_box_runtime_runtime.test.ts" "tests/canvas_picking_sketch_box_door_preview_runtime.test.ts" "tests/canvas_picking_sketch_box_doors_runtime.test.ts" "tests/canvas_picking_sketch_box_overlap_runtime.test.ts" "tests/sketch_box_hover_click_runtime.test.ts" "tests/sketch_box_door_visuals_runtime.test.ts"

```

#### stdout

```text
✔ sketch-box door preview stays inert for hinge toggles when the active segment has no door (3.5432ms)
✔ sketch-box door preview resolves canonical remove metadata for an existing double-door pair (34.5243ms)
✔ sketch-box door preview keeps explicit hinge/remove metadata for a single existing door (0.6746ms)
✔ sketch-box doors upsert single-door records through the canonical id factory and segment placement seam (4.0765ms)
✔ sketch-box doors toggle hinge for a single door but stay inert when the segment already has a double-door pair (38.1574ms)
✔ sketch-box doors remove a focused segment door without disturbing the other segment (0.6853ms)
✔ sketch-box doors treat rows inside the same divided column as independent cells (2.8241ms)
✔ sketch-box doors preserve stored groove line counts when rewriting door records (1.983ms)
✔ resolved module boxes ignore free-placement items and the requested ignoreBoxId (2.7425ms)
✔ resolved module boxes reject string-encoded live geometry (0.2307ms)
✔ vertical center clamp respects module bounds even when desired center is far outside range (0.2286ms)
✔ placement resolution can ignore the edited box id instead of blocking on itself (0.6053ms)
✔ placement reports blocked when overlap chain reaches the module ceiling and floor (1.0468ms)
✔ overlap primitive still allows exact edge contact without treating it as overlap (0.1561ms)
✔ placement resolution can be confined to the pointer slot instead of jumping across blockers (0.6854ms)
✔ placement resolution reports blocked when vertical content blockers leave no valid box slot (0.3063ms)
✔ sketch-box runtime parses width/depth overrides and rejects unrelated tools (2.1918ms)
✔ sketch-box runtime geometry center-snaps and width-clamps inside the module span (0.5732ms)
✔ sketch-box runtime geometry rejects string-encoded live overrides (0.2102ms)
✔ sketch-box runtime hit scan ignores free-placement boxes and prefers the nearest centered match (0.7261ms)
✔ sketch-box runtime hit scan rejects string-encoded live box geometry (0.2108ms)
✔ sketch-box free-placement commit keeps matching/commit/hover mutation policy centralized (1.1022ms)
✔ sketch-box free-placement commit does not derive floorY from string measurements (0.3818ms)
✔ sketch-box free-placement commit clears and rejects stale add-hover under the wardrobe column (0.517ms)
✔ sketch-box free-placement commit clears hover when the canonical commit finishes without next hover (0.6082ms)
✔ sketch-box free-placement commit stays inert when no canonical host is available (0.3848ms)
✔ sketch-box door visuals forward mirror state, mirror layout, effective frame style, and deep pick meta through the special visual path (5.6978ms)
✔ sketch-box door visuals use styled profile visuals for in-cabinet whole box doors (0.5454ms)
✔ free-box click fallback does not turn a module hit into a free-placement box (2.2768ms)
✔ free-box click fallback still creates a free-placement box when no module was hit (1.2699ms)
✔ free-box click fallback rejects string-encoded plane-hit geometry (0.2431ms)
✔ free-box click preserves a real recent free-placement hover even when a module is behind it (0.4814ms)
✔ sketch external drawers hover context loads persisted module stacks for remove/overlap handling (13.3372ms)
✔ free-box content click stays on the free box even when a wardrobe module is behind it (1.4357ms)
✔ free-box external drawers use the box bottom directly and sketch hover blocks drawer collisions across internal and external stacks (6.265ms)
✔ module sketch hover blocks collisions between internal and external drawer stacks (1.6103ms)
✔ free-box sketch drawer clicks refresh hover state instead of dropping straight through to the module behind (2.2277ms)
✔ module sketch drawer click flow enforces cross-blocking and keeps immediate remove hover after commit (2.5488ms)
✔ module sketch external drawers preview reads the selector front envelope instead of the inner cavity only (1.1484ms)
ℹ tests 39
ℹ suites 0
ℹ pass 39
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1789.7821

```

### [PASS] Sketch free-box batch (direct)

- id: `sketch-free-boxes`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts tests/canvas_picking_sketch_free_commit_runtime.test.ts tests/sketch_free_boxes_attach_runtime.test.ts tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts tests/sketch_free_boxes_outside_attach_runtime.test.ts tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts tests/sketch_free_boxes_room_floor_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `1913ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts" "tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts" "tests/canvas_picking_sketch_free_commit_runtime.test.ts" "tests/sketch_free_boxes_attach_runtime.test.ts" "tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts" "tests/sketch_free_boxes_outside_attach_runtime.test.ts" "tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts" "tests/sketch_free_boxes_room_floor_runtime.test.ts"

```

#### stdout

```text
✔ sketch-free box content preview short-circuits unsupported content kinds before target scanning (2.3714ms)
✔ sketch-free box content preview keeps door-hinge hover inert when the active segment has no door (3.6483ms)
✔ sketch-free box content preview returns canonical double-door removal metadata for an existing pair (27.4948ms)
✔ sketch-free external drawer preview blocks construction on existing free-box shelf content (6.3424ms)
✔ sketch-free vertical preview keeps removal hover available while the active tool is sketch external drawers (1.7569ms)
✔ sketch-free shelf removal accepts direct shelf-board hits with the same generous tolerance as wardrobe shelves (0.6614ms)
✔ sketch-free placement hover record keeps canonical host/free-placement fields (2.2163ms)
✔ sketch-free placement commit adds a free-placement box through the canonical modules patch seam (1.2922ms)
✔ sketch-free placement commit rejects string-encoded internal hover geometry (0.2627ms)
✔ sketch-free placement content commit routes free-placement door removal through the canonical content seam (2.8476ms)
✔ sketch-free placement content commit consumes blocked no-room hovers without mutating (1.0719ms)
✔ sketch-free placement ext-drawer removal also removes regular external drawers in the same free box (0.6435ms)
✔ sketch-free vertical tools commit cross-kind vertical-content removal hovers (1.158ms)
✔ sketch-free stack tools commit existing vertical-content removal hovers before adding drawers (0.4151ms)
✔ sketch-free regular external drawers can add a shoe drawer without falling back to module drawers (2.4987ms)
✔ sketch-free sketch external drawers commit preserves hover vertical center instead of anchoring to top (1.0798ms)
✔ sketch-free regular external drawers update shoe and regular count independently in the same cell (1.0277ms)
✔ sketch free surface target scan prefers the candidate with a box-local hit over plain plane-distance fallbacks (3.1721ms)
✔ sketch free divider target scan projects fallback pointer to the box front plane (0.4108ms)
✔ sketch free surface target scan rejects string-encoded free-box geometry (0.2241ms)
✔ sketch free content target scan projects profile-door hits to the canonical box front plane (0.3551ms)
✔ sketch free surface placement preview produces canonical remove hover metadata and front overlay geometry (1.368ms)
✔ sketch free base adornment preview rejects string-encoded current base dimensions (1.493ms)
✔ free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset (3.889ms)
✔ free-box attach still prefers top/bottom when the cursor is only outside vertically (0.5704ms)
✔ free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right (0.622ms)
✔ free-box attach below still allows a true staircase corner touch before detaching (0.8728ms)
✔ free-box attach still prefers side attachment when the cursor is clearly outside only on X (0.506ms)
✔ free-box attach rejects string-encoded geometry inputs (0.3219ms)
✔ free-box hover attach below falls back to a valid floor-safe side placement when room floor blocks under-stack placement (9.1354ms)
✔ free-box hover attach above keeps plane X even when surface hit lands on the left wall of the target box (0.9323ms)
✔ free-box hover near lower corners stays symmetric when room floor forces the fallback placement sideways (1.9437ms)
✔ free-box hover below at the outer edge still resolves to the floor-safe side placement (0.8722ms)
✔ free-box hover between adjacent boxes keeps the gap column instead of snapping to an outer side wall (1.2787ms)
✔ free-box hover slightly off-center between adjacent boxes still stays in the gap column until a real side target exists (0.9608ms)
✔ no-main free-box hover keeps side attachment flush instead of repelling from the phantom wardrobe column (1.0454ms)
✔ free-box hover ignores string-encoded existing box geometry for remove or attach (0.6234ms)
✔ free-box outside placement snaps along X when the box overlaps the wardrobe from the side (5.2878ms)
✔ free-box outside placement snaps along Y when the box overlaps the wardrobe from above (0.4271ms)
✔ free-box remove hover works from most of the box interior using plane hit, not only a tiny center point (5.7964ms)
✔ free-box outside placement snaps flush to the wardrobe side wall instead of requiring a large empty gap (1.9691ms)
✔ free-box placement still remains available when the box is fully inside the wardrobe body (0.7447ms)
✔ free-box placement above the wardrobe stays outside above the roof instead of being clamped back inside (0.9241ms)
✔ free-box placement at side height above the wardrobe still remains available as outside free placement (1.0296ms)
✔ free-box placement at the no-main workspace floor is not blocked as under-wardrobe placement (0.8935ms)
✔ free-box hover below the room floor clamps onto the floor wh
...
[trimmed 378 chars]
```

### [PASS] Sketch render/visuals batch (direct)

- id: `sketch-render-visuals`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/render_interior_sketch_visuals_runtime.test.ts tests/render_interior_sketch_fronts_runtime.test.ts tests/render_interior_sketch_layout_dimensions_runtime.test.ts tests/render_interior_sketch_layout_geometry_runtime.test.ts tests/sketch_front_visual_state_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `1709ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/render_interior_sketch_visuals_runtime.test.ts" "tests/render_interior_sketch_fronts_runtime.test.ts" "tests/render_interior_sketch_layout_dimensions_runtime.test.ts" "tests/render_interior_sketch_layout_geometry_runtime.test.ts" "tests/sketch_front_visual_state_runtime.test.ts"

```

#### stdout

```text
✔ render sketch box fronts reuses one mirror material across mirrored external drawers (14.1181ms)
✔ render sketch box fronts reject string-encoded live external drawer positions (0.6247ms)
✔ render sketch box fronts do not parse string-encoded live external drawer counts (1.4396ms)
✔ render sketch box external drawers flush a top-anchored free-box stack to the box face edge (1.1947ms)
✔ renderSketchFreeBoxDimensions keeps height on the right and depth on the left (4.2772ms)
✔ renderSketchFreeBoxDimensions rejects string-encoded runtime dimensions (0.3833ms)
✔ renderSketchFreeBoxDimensionOverlays rejects string-encoded grouped dimension entries (3.2916ms)
✔ renderSketchFreeBoxDimensionOverlays groups adjacent entries and renders merged width plus segment widths (5.0818ms)
✔ renderSketchFreeBoxDimensionOverlays keeps a hairline placement gap from inflating the merged total width label (0.8624ms)
✔ render interior sketch layout geometry clamps box size and center inside the internal span (3.0788ms)
✔ render sketch box shell geometry rejects string-encoded live box dimensions (1.006ms)
✔ render interior sketch layout geometry rejects string-encoded live numeric overrides (0.8512ms)
✔ render interior sketch layout geometry rejects string-encoded runtime placement args (0.4636ms)
✔ render interior sketch layout geometry keeps free-box vertical slack and normalized inner geometry (0.5415ms)
✔ render interior sketch layout dividers sort explicit dividers and ignore removed persisted fallbacks (3.0298ms)
✔ render interior sketch layout resolves content segments from divider-separated spans (2.2869ms)
✔ render interior sketch visuals resolve mirror state ahead of curtain and keep mirror layouts (7.3096ms)
✔ render interior sketch visuals fall back to glass + curtain from part colors when no mirror override exists (1.6266ms)
✔ render interior sketch visuals expose callable factories only for function inputs (0.5178ms)
✔ sketch front visual state reuses canonical full-door mirror/glass maps for split door segments (7.4208ms)
ℹ tests 20
ℹ suites 0
ℹ pass 20
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1511.4

```

### [PASS] Cloud sync lifecycle batch (direct)

- id: `cloud-sync-lifecycle`
- category: `verify`
- command: `node tools/wp_serial_tests.mjs --batch-size 3 --heartbeat-ms 10000 --timeout-ms 120000 --failed-files-path .artifacts/cloud-sync-surfaces.lifecycle.failed.txt --timings-path .artifacts/cloud-sync-surfaces.lifecycle.timings.json tests/cloud_sync_panel_actions_runtime.test.js tests/cloud_sync_action_feedback_runtime.test.ts tests/cloud_sync_access_runtime.test.ts tests/cloud_sync_install_support_runtime.test.ts tests/cloud_sync_lifecycle_install_cleanup_runtime.test.js tests/cloud_sync_actions_runtime.test.ts tests/cloud_sync_async_singleflight_owner_runtime.test.ts tests/cloud_sync_config_runtime.test.ts tests/cloud_sync_delete_temp_runtime.test.ts tests/cloud_sync_lifecycle_attention_runtime.test.ts tests/cloud_sync_lifecycle_realtime_runtime.test.ts tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `10359ms`

#### stderr

```text
[serial-tests batch 1/5] 3 files (tests/cloud_sync_panel_actions_runtime.test.js … tests/cloud_sync_access_runtime.test.ts)
[serial-tests batch 1/5] ok (1.2s)
[serial-tests batch 2/5] 3 files (tests/cloud_sync_install_support_runtime.test.ts … tests/cloud_sync_actions_runtime.test.ts)
[serial-tests batch 2/5] ok (3.6s)
[serial-tests batch 3/5] 3 files (tests/cloud_sync_async_singleflight_owner_runtime.test.ts … tests/cloud_sync_delete_temp_runtime.test.ts)
[serial-tests batch 3/5] ok (859ms)
[serial-tests batch 4/5] 3 files (tests/cloud_sync_lifecycle_attention_runtime.test.ts … tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts)
[serial-tests batch 4/5] ok (3.5s)
[serial-tests batch 5/5] 1 file (tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts)
[serial-tests batch 5/5] ok (913ms)
[serial-tests] completed 13 files in 10s across 5 batches

```

#### stdout

```text
✔ cloud sync access reads canonical services panelApi and ignores legacy root alias (3.9849ms)
✔ cloud sync access ensures canonical service state on services root (0.7526ms)
✔ cloud sync access exposes test hooks through canonical service state only (0.608ms)
✔ cloud sync feedback reporters emit canonical toasts and preserve silent success semantics where required (6.08ms)
✔ cloud sync feedback prefers preserved error messages when available (0.5048ms)
✔ cloud sync panel actions derive stable snapshot state and route handlers through the canonical ui controller (137.6063ms)
✔ cloud sync panel actions fall back to derived status when panel snapshot api is unavailable (29.1634ms)
ℹ tests 7
ℹ suites 0
ℹ pass 7
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1117.8929
✔ cloud sync actions return canonical room/share, site2 tabs gate, sketch sync, cleanup, and floating pin results with feedback mapping (3.5404ms)
✔ cloud sync actions keep local site2 handling and report missing cloud mutation services explicitly (1.8853ms)
✔ cloud sync install support preserves backward compatibility for untagged published dispose refs (1.8439ms)
✔ cloud sync install support stamps dispose epoch and reattaches it when cleanup preserves dispose (2.5897ms)
✔ cloud sync install support does fallback cleanup when the published dispose ref belongs to a stale epoch (0.7183ms)
✔ cloud sync install support clears only canonical published slots and preserves unrelated state (1.9698ms)
✔ cloud sync install support preserves canonical test hooks by default while clearing published slots (0.471ms)
✔ cloud sync install support drops test hooks when cleanup opts out of hook preservation (0.3431ms)
✔ cloud_sync lifecycle: double install/uninstall stays idempotent and cleans listeners/wrappers (26.8779ms)
✔ cloud_sync lifecycle: no timer/listener leaks after dispose (2.5874ms)
✔ cloud_sync lifecycle: installing a second app does not dispose the first app lifecycle (4.0681ms)
✔ cloud_sync lifecycle: realtime reconnect/dispose race is ignored after dispose (3.5022ms)
✔ cloud_sync lifecycle: dispose clears published public state but preserves test hooks (1.8425ms)
✔ cloud_sync lifecycle: invalidated publication epoch blocks stale polling and listener-driven pulls even before cleanup finishes (2.1519ms)
✔ cloud_sync lifecycle: stale held dispose refs do not clear newer public state (3.8798ms)
✔ cloud_sync lifecycle: stale install stops initial pull fanout and never starts a new lifecycle after reinstall wins mid-bootstrap (2.695ms)
✔ cloud_sync lifecycle: failed reinstall clears stale public state when config disappears (1.2952ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3529.0958
✔ owned cloud-sync family flight registers immediately for synchronous re-entry reuse (1.6631ms)
✔ owned cloud-sync family flight returns busy for synchronous conflicting re-entry (1.6908ms)
✔ runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work (0.6003ms)
✔ readCfg normalizes deps config and clamps site2 sketch max age (2.6668ms)
✔ cloud sync config browser helpers keep URL params and site2 detection canonical (1.4737ms)
✔ cloud sync config shared helpers keep rest URL and headers canonical (0.277ms)
✔ cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint (5.7795ms)
✔ cloud sync delete temp does not stamp pull activity when the preflight row read fails (0.7855ms)
✔ cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors (0.7394ms)
✔ cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work (1.1293ms)
✔ cloud sync delete-temp tracks preflight pull activity and settled push activity canonically (1.1753ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 780.6027
✔ cloud sync attention pulls still fire on focus when eligible (3.5675ms)
✔ cloud sync attention pulls stay quiet right after a recent remote pull and resume after cooldown (0.5818ms)
✔ cloud sync attention pulls stay quiet while offline or hidden and catch up on visible return (0.8774ms)
✔ cloud sync attention online pull does not stay blocked by subscribed status without a live channel (0.7183ms)
✔ cloud sync attention online handler reports pull failures without breaking later attention events (1.6205ms)
✔ cloud sync diagnostics storage listener republishes status only when the diagnostics flag actually changes (0.8701ms)
✔ cloud sync attention pulls stay inert after the lifecycle guard flips stale before cleanup (0.5506ms)
✔ cloud sync diagnostics storage listener stays inert after the lifecycle guard flips stale (0.3314ms)
✔ cloud sync realtime lifecycle cleans refs and preserves real error message on subscribe failure (6.696ms)

...
[trimmed 2493 chars]
```

### [PASS] Cloud sync main-row batch (direct)

- id: `cloud-sync-main-row`
- category: `verify`
- command: `node tools/wp_serial_tests.mjs --batch-size 3 --heartbeat-ms 10000 --timeout-ms 120000 --failed-files-path .artifacts/cloud-sync-surfaces.main-row.failed.txt --timings-path .artifacts/cloud-sync-surfaces.main-row.timings.json tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts tests/cloud_sync_main_row_runtime.test.ts tests/cloud_sync_main_write_singleflight_runtime.test.ts tests/cloud_sync_mutation_commands_runtime.test.ts tests/cloud_sync_mutation_commands_singleflight_runtime.test.ts tests/cloud_sync_owner_context_runtime.test.ts tests/cloud_sync_status_install_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `5004ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts … tests/cloud_sync_main_write_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (1.0s)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_mutation_commands_runtime.test.ts … tests/cloud_sync_owner_context_runtime.test.ts)
[serial-tests batch 2/3] ok (2.9s)
[serial-tests batch 3/3] 1 file (tests/cloud_sync_status_install_runtime.test.ts)
[serial-tests batch 3/3] ok (857ms)
[serial-tests] completed 7 files in 4.8s across 3 batches

```

#### stdout

```text
✔ cloud sync main row skips remote apply churn when newer rows carry the same payload (4.1793ms)
✔ cloud sync main row still applies remote payloads when the effective collections actually change (1.9078ms)
✔ cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged (0.4922ms)
✔ cloud sync main row seeds a missing row from local collections on the initial pull (7.7622ms)
✔ cloud sync main row initial seed reuses returned representation when the upsert already returns the row (1.3653ms)
✔ cloud sync main row push publishes changed collections once and skips identical repeats (3.358ms)
✔ cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch (1.7751ms)
✔ cloud sync main row reuses the same pending push promise for duplicate direct pushes (2.1071ms)
✔ cloud sync main row pull applies newer remote payloads into local storage (1.7764ms)
✔ cloud sync main row first remote pull hydrates app maps even when stored hash already matches remote (1.3975ms)
✔ cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull (1.0213ms)
✔ cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push (0.7922ms)
✔ cloud sync main row push applies settled remote payload locally without forcing a follow-up pull (1.0978ms)
✔ cloud sync main row collapses pull retries during a push into one post-push follow-up pull (1.4676ms)
✔ cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests (1.1293ms)
✔ cloud sync main row notifies push-settled listeners only after the push flight has cleared (1.6317ms)
✔ cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests (1.4264ms)
✔ cloud sync main row shares app-scoped push ownership across main-row instances for the same App (1.5719ms)
✔ cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run (0.6253ms)
✔ cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up (1.5902ms)
✔ cloud sync main row preserves one follow-up push request raised while a push is already in flight (1.7554ms)
✔ cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first (3.7422ms)
✔ cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce (0.6244ms)
✔ cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull (0.9641ms)
✔ cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys (2.4641ms)
✔ cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner (0.6869ms)
ℹ tests 26
ℹ suites 0
ℹ pass 26
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 914.3388
✔ cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results (6.1345ms)
✔ cloud sync mutation cleanup commands return cancelled when confirm is declined (0.8307ms)
✔ cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel (0.9641ms)
✔ cloud sync delete-temp commands reuse one pending models cleanup flow per app (5.9883ms)
✔ cloud sync delete-temp commands block conflicting cleanup family actions while one is pending (0.9326ms)
✔ cloud sync owner context composes room helpers and per-tab client identity through dedicated seams (17.0254ms)
✔ cloud sync owner context uses the public room for gate rows when no room URL is selected (1.651ms)
✔ cloud sync owner context starts disabled realtime with an empty channel surface (1.1902ms)
✔ cloud sync runtime snapshot key canonicalizes drifted runtime branches before publish gating (0.5267ms)
✔ cloud sync owner context memoizes runtime status publishes and keeps the canonical status surface live (2.0414ms)
✔ cloud sync owner context keeps held status refs alive across owner reinstall (2.3927ms)
✔ cloud sync owner context ignores stale status publishes after a newer owner takes over (1.5821ms)
✔ cloud sync owner context ignores late status publishes after publication teardown (2.4136ms)
✔ cloud sync owner context ignores stale publication cleanup after a newer owner takes over (1.5758ms)
✔ cloud sync owner context tombstones held status refs after published-state cleanup (0.9513ms)
✔ cloud sync owner context self-heals leaked enumerable status markers even when the runtime snapshot is unchanged (0.7536ms)
✔ cloud sync owner context self-heals drifted canonical status surfaces even when runtime snapshot is unchanged (0.7454ms)
ℹ tests 17
ℹ suites 0
ℹ pass 17
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2829.8666
✔ cloud sync status install keeps canonical root and nested branches stable across refreshes (6.8728ms)
✔ c
...
[trimmed 628 chars]
```

### [PASS] Cloud sync panel-install batch (direct)

- id: `cloud-sync-panel-install`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_api_install_healing_runtime.test.ts tests/cloud_sync_panel_api_surface_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `4193ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/cloud_sync_panel_api_install_healing_runtime.test.ts" "tests/cloud_sync_panel_api_surface_runtime.test.ts"

```

#### stdout

```text
✔ cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall (11.4259ms)
✔ cloud sync panel api install heals legacy installed markers that only preserved stale public callables (0.9924ms)
✔ cloud sync panel api install ignores stale publication epochs (0.898ms)
✔ cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch (1.3681ms)
✔ cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup (1.4661ms)
✔ cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation (1.0909ms)
✔ cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods (1.1265ms)
✔ cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots (10.9095ms)
✔ cloud sync panel api runtime status clone strips drifted realtime/polling extras (0.8167ms)
✔ cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes (0.6905ms)
✔ cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged (1.0062ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 3889.015

```

### [PASS] Cloud sync panel-controller batch (direct)

- id: `cloud-sync-panel-controller`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts tests/cloud_sync_panel_api_failures_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `2865ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts" "tests/cloud_sync_panel_api_failures_runtime.test.ts"

```

#### stdout

```text
✔ cloud sync panel api republishes panel snapshot even when floating pin command throws (6.9788ms)
✔ cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws (2.2119ms)
✔ cloud sync panel api preserves thrown messages for controller-facing commands (8.5907ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2667.1835

```

### [PASS] Cloud sync panel-subscriptions batch (direct)

- id: `cloud-sync-panel-subscriptions`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_api_singleflight_runtime.test.ts tests/cloud_sync_panel_api_subscriptions_runtime.test.ts tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3169ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/cloud_sync_panel_api_singleflight_runtime.test.ts" "tests/cloud_sync_panel_api_subscriptions_runtime.test.ts" "tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts"

```

#### stdout

```text
✔ cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets (7.4716ms)
✔ cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App (1.7867ms)
✔ cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener (5.7607ms)
✔ cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles (2.7098ms)
✔ cloud sync async family runner blocks re-entrant conflicting targets before the first run settles (2.5618ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2942.4134

```

### [PASS] Cloud sync panel-snapshots batch (direct)

- id: `cloud-sync-panel-snapshots`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_panel_snapshot_controller_runtime.test.ts tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `3219ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/cloud_sync_panel_snapshot_controller_runtime.test.ts" "tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts" "tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts"

```

#### stdout

```text
✔ cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors (5.4773ms)
✔ cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors (1.7537ms)
✔ cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths (6.8421ms)
✔ cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids deadline timer churn for unchanged snapshots (1.6305ms)
✔ cloud sync panel snapshot controller does not create deadline timer until a tabs-gate subscriber exists (0.6038ms)
✔ cloud sync panel snapshot controller uses timer-driven tabs-gate minute updates when no source subscription exists (7.0922ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2988.9797

```

### [PASS] Cloud sync sync-ops batch (direct)

- id: `cloud-sync-sync-ops`
- category: `verify`
- command: `node tools/wp_serial_tests.mjs --batch-size 3 --heartbeat-ms 10000 --timeout-ms 120000 --failed-files-path .artifacts/cloud-sync-surfaces.sync-ops.failed.txt --timings-path .artifacts/cloud-sync-surfaces.sync-ops.timings.json tests/cloud_sync_pull_coalescer_runtime.test.ts tests/cloud_sync_realtime_support_runtime.test.ts tests/cloud_sync_remote_push_singleflight_runtime.test.ts tests/cloud_sync_rest_runtime.test.ts tests/cloud_sync_room_commands_runtime.test.ts tests/cloud_sync_site2_sketch_behavior_runtime.test.ts tests/cloud_sync_sketch_ops_runtime.test.ts tests/cloud_sync_sketch_pull_load_runtime.test.ts tests/cloud_sync_support_runtime.test.ts`
- status: **passed**
- exit code: `0`
- duration: `5123ms`

#### stderr

```text
[serial-tests batch 1/3] 3 files (tests/cloud_sync_pull_coalescer_runtime.test.ts … tests/cloud_sync_remote_push_singleflight_runtime.test.ts)
[serial-tests batch 1/3] ok (1.4s)
[serial-tests batch 2/3] 3 files (tests/cloud_sync_rest_runtime.test.ts … tests/cloud_sync_site2_sketch_behavior_runtime.test.ts)
[serial-tests batch 2/3] ok (2.7s)
[serial-tests batch 3/3] 3 files (tests/cloud_sync_sketch_ops_runtime.test.ts … tests/cloud_sync_support_runtime.test.ts)
[serial-tests batch 3/3] ok (893ms)
[serial-tests] completed 9 files in 5.0s across 3 batches

```

#### stdout

```text
✔ cloud sync pull coalescer collapses burst triggers into one run and supports cancel (4.3312ms)
✔ cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels (0.6443ms)
✔ cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics (0.7495ms)
✔ cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers (1.5202ms)
✔ cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run (0.6011ms)
✔ cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles (0.683ms)
✔ cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists (0.6932ms)
✔ cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse (0.8307ms)
✔ cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst (0.7629ms)
✔ cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles (0.803ms)
✔ cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles (1.0414ms)
✔ cloud sync pull coalescer reports synchronous run failures and recovers for later work (0.946ms)
✔ cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires (0.544ms)
✔ cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run (0.6971ms)
✔ cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run (0.6919ms)
✔ cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted (0.6261ms)
✔ cloud sync realtime hint dedupes per scope/row/room and resumes after the dedupe window (5.1612ms)
✔ cloud sync realtime connecting/failure/dispose markers share one canonical branch owner (6.6679ms)
✔ cloud sync realtime timeout marker clears stale channel and restarts polling on the canonical owner (1.0413ms)
✔ cloud sync realtime transition markers collapse polling + realtime status publication to one canonical publish (1.0871ms)
✔ cloud sync realtime subscribed marker only issues a gap pull after a resubscribe (1.4075ms)
✔ cloud sync realtime subscribed gap refresh respects the canonical recent-pull gate on resubscribe (1.1897ms)
✔ cloud sync realtime beforeunload cleanup removes the current channel through the installed listener (1.1036ms)
✔ cloud sync realtime disconnected marker resets subscribed state and restarts polling with the why label (0.7651ms)
✔ cloud sync realtime disconnected marker can publish a preserved error in one canonical transition (0.6663ms)
✔ cloud sync realtime disposed marker clears stale errors from the final disabled snapshot (0.6332ms)
✔ cloud sync realtime hint does not send when realtime is explicitly disabled even if a subscribed channel string remains (0.3807ms)
✔ cloud sync realtime hint does not send when the subscribed status no longer has a live channel (0.3262ms)
✔ cloud sync realtime hint suppresses invalid/blank scopes and dedupes normalized scope/row values (0.5807ms)
✔ cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets (5.2345ms)
✔ cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets (1.54ms)
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1239.921
✔ cloud sync rest preserves control-row payload fields on getRow (5.3544ms)
✔ cloud sync rest getRow accepts array responses and returns null for missing rows without object-only 406 semantics (1.0348ms)
✔ cloud sync rest getRow returns null for empty array responses (1.3099ms)
✔ cloud sync rest preserves tabs gate payload fields on upsert response (1.0013ms)
✔ cloud sync rest sanitizes saved collections while preserving control rows and extra payload fields (1.3148ms)
✔ cloud sync room commands derive status, private room targets, and share-link copy fallbacks canonically (3.4328ms)
✔ cloud sync room mode preserves thrown error messages (0.3511ms)
✔ cloud sync share-link copy preserves clipboard error messages when prompt fallback is unavailable (0.377ms)
✔ cloud sync room/share-link commands normalize non-Error throwables into stable messages (0.5448ms)
✔ cloud sketch initial catchup is site2-only even when the remote row is fresh (8.0626ms)
✔ cloud sketch stale initial catchup does not block the next fresh site2 update (1.0684ms)
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2599.2083
[toast] success סקיצה חדשה התעדכנה
[toast] success סקיצה חדשה התעדכנה
[toast] success סקיצה חדשה התעדכנה
✔ cloud sync sketch pull only toasts success when project load really succeeds (5.7225ms)
✔ cloud sync sketc
...
[trimmed 2287 chars]
```

### [PASS] Cloud sync tabs-ui batch (direct)

- id: `cloud-sync-tabs-ui`
- category: `verify`
- command: `node tools/wp_run_tsx_tests.mjs tests/cloud_sync_sync_pin_command_runtime.test.ts tests/cloud_sync_tabs_gate_command_runtime.test.ts tests/cloud_sync_tabs_gate_runtime.test.ts tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts tests/cloud_sync_ui_action_controller_runtime.test.js`
- status: **passed**
- exit code: `0`
- duration: `4898ms`

#### stderr

```text
[run-tsx-tests] C:\Program Files\nodejs\node.exe --import tsx --test "tests/cloud_sync_sync_pin_command_runtime.test.ts" "tests/cloud_sync_tabs_gate_command_runtime.test.ts" "tests/cloud_sync_tabs_gate_runtime.test.ts" "tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts" "tests/cloud_sync_ui_action_controller_runtime.test.js"

```

#### stdout

```text
✔ floating sketch sync pin command becomes a no-op when state is unchanged (5.4647ms)
✔ floating sketch sync pin command rolls back local state on push failure (0.792ms)
✔ floating sketch sync pin toggle command flips the current state (0.5975ms)
✔ floating sketch sync pin command preserves push failure message (0.6778ms)
✔ floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets (1.0468ms)
✔ cloud sync tabs gate command skips redundant refreshes but extends stale opens (5.1029ms)
✔ cloud sync tabs gate command rolls back on push failure and reports final state (2.011ms)
✔ cloud sync tabs gate toggle command flips the current ref state (0.7043ms)
✔ cloud sync tabs gate command preserves push failure message (0.7579ms)
✔ cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets (1.2948ms)
[WardrobePro][error] Error: [WardrobePro] Missing canonical action (soft UI write access): expected actions.ui.patchSoft
    at requireActionFn (C:\pro\pro\esm\native\runtime\actions_access_core.ts:122:9)
    at patchUiSoft (C:\pro\pro\esm\native\runtime\ui_write_access.ts:124:10)
    at applyCloudSyncUiPatch (C:\pro\pro\esm\native\services\cloud_sync_support_feedback.ts:63:3)
    at Object.patchSite2TabsGateUi (C:\pro\pro\esm\native\services\cloud_sync_tabs_gate_local_runtime_patch.ts:55:7)
    at TestContext.<anonymous> (C:\pro\pro\tests\cloud_sync_tabs_gate_runtime.test.ts:87:7)
    at Test.runInAsyncScope (node:async_hooks:227:14)
    at Test.run (node:internal/test_runner/test:1201:25)
    at Test.start (node:internal/test_runner/test:1096:17)
    at startSubtestAfterBootstrap (node:internal/test_runner/harness:385:17)
✔ cloud sync tabs gate closes stale site2 UI on initial pull miss (19.0285ms)
✔ cloud sync tabs gate uses the current gate base room for push and pull (2.7871ms)
✔ cloud sync tabs gate defaults to the public room when no room URL is selected (1.3947ms)
✔ cloud sync tabs gate public-room push is visible to site2 public-room pull (3.6182ms)
✔ cloud sync tabs gate site2 ignores local open fallback when cloud row is missing (1.186ms)
✔ cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling (3.2689ms)
✔ cloud sync tabs gate direct push reports controller-only canonically on site2 (0.6135ms)
✔ cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App (1.4165ms)
✔ cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state (7.9034ms)
✔ [cloud-sync-ui-controller] panel/sidebar/dock actions flow through one canonical reporter seam (3292.1187ms)
✔ [cloud-sync-ui-controller] app-scoped single-flight dedupes same cloud actions across controllers and reports busy on conflicting control mutations (1.2924ms)
✔ [cloud-sync-ui-controller] thrown commands downgrade to canonical error payloads (1.4991ms)
✔ [cloud-sync-ui-controller] tabs-gate meta is cloned before async command invocation (0.4432ms)
ℹ tests 23
ℹ suites 0
ℹ pass 23
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4713.1111

```

### [PASS] Playwright smoke suite listing

- id: `e2e-list`
- category: `e2e`
- command: `npm run e2e:smoke:list`
- status: **passed**
- exit code: `0`
- duration: `2406ms`

#### stdout

```text

> e2e:smoke:list
> playwright test -c playwright.config.ts --list

Listing tests:
  [setup] › app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers
  [chromium] › authoring_builds.spec.ts:478:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work
  [chromium] › authoring_builds.spec.ts:545:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:608:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:665:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:720:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load
  [chromium] › authoring_builds.spec.ts:775:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable
  [chromium] › authoring_builds.spec.ts:814:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load
  [chromium] › authoring_builds.spec.ts:880:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated
  [chromium] › canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target
  [chromium] › cloud_sync_reconnect.spec.ts:29:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable
  [chromium] › resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry
  [chromium] › resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state
  [chromium] › resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry
  [chromium] › smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable
  [chromium] › smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name
  [chromium] › smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly
  [chromium] › smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar
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
- duration: `2736ms`

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
- duration: `178110ms`

#### stdout

```text

> e2e:smoke
> node tools/wp_playwright_preflight.js && playwright test -c playwright.config.ts

[WardrobePro] Playwright Chromium preflight passed (using system Chromium at C:\Program Files\Google\Chrome\Application\chrome.exe).

Running 26 tests using 4 workers

  ok  1 [setup] › tests\e2e\app_shell_warmup.setup.ts:5:1 › warm app shell before parallel smoke workers (8.4s)
  ok  2 [chromium] › tests\e2e\canvas_pointer_parity.spec.ts:15:3 › Canvas pointer parity smoke › browser hover and click apply cell dimensions to the same canvas target (18.7s)
  ok  4 [chromium] › tests\e2e\cloud_sync_reconnect.spec.ts:29:3 › Cloud Sync browser reconnect smoke › offline to online browser transition keeps the panel stable and sync usable (19.3s)
  ok  3 [chromium] › tests\e2e\resilience.spec.ts:24:3 › Playwright resilience flows › invalid project load reports failure, keeps the app stable, and records an error perf entry (21.4s)
  ok  5 [chromium] › tests\e2e\authoring_builds.spec.ts:478:3 › Playwright authoring build coverage › structure, design, and interior authoring steps trigger real build and render work (36.2s)
  ok  8 [chromium] › tests\e2e\resilience.spec.ts:50:3 › Playwright resilience flows › restore-last-session without autosave stays unavailable and keeps user state (19.0s)
  ok  6 [chromium] › tests\e2e\smoke.spec.ts:28:3 › Playwright smoke flows › boot, viewport, tabs and render toggles stay stable (22.1s)
  ok  7 [chromium] › tests\e2e\user_paths.spec.ts:119:3 › Playwright real user paths › primary user journey records canonical runtime perf metrics (31.4s)
  ok 11 [chromium] › tests\e2e\smoke.spec.ts:53:3 › Playwright smoke flows › header save-load roundtrip restores project name (15.1s)
  ok 10 [chromium] › tests\e2e\resilience.spec.ts:69:3 › Playwright resilience flows › invalid settings backup import fails cleanly, preserves existing state, and records an error perf entry (20.1s)
  ok 13 [chromium] › tests\e2e\smoke.spec.ts:74:3 › Playwright smoke flows › header reset default replaces the current project cleanly (11.1s)
  ok  9 [chromium] › tests\e2e\authoring_builds.spec.ts:545:3 › Playwright authoring build coverage › authored structure, design, and interior state rebuilds cleanly after project load (34.9s)
  ok 12 [chromium] › tests\e2e\user_paths.spec.ts:188:3 › Playwright real user paths › repeated export and pdf pressure preserves user state (21.2s)
  ok 14 [chromium] › tests\e2e\smoke.spec.ts:85:3 › Playwright smoke flows › order pdf overlay opens from export and header with stable toolbar (13.7s)
  ok 15 [chromium] › tests\e2e\authoring_builds.spec.ts:608:3 › Playwright authoring build coverage › corner cabinet authoring triggers real build work and roundtrips through project load (17.3s)
  ok 17 [chromium] › tests\e2e\smoke.spec.ts:101:3 › Playwright smoke flows › settings tab keeps cloud-sync surface interactive (9.8s)
  ok 16 [chromium] › tests\e2e\user_paths.spec.ts:226:3 › Playwright real user paths › cabinet core dimensions, colors, and sketch survive project roundtrip (19.5s)
  ok 18 [chromium] › tests\e2e\authoring_builds.spec.ts:665:3 › Playwright authoring build coverage › chest authoring triggers real build work and roundtrips through project load (12.3s)
  ok 19 [chromium] › tests\e2e\user_paths.spec.ts:274:3 › Playwright real user paths › cabinet authoring options survive project roundtrip (18.3s)
  ok 20 [chromium] › tests\e2e\authoring_builds.spec.ts:720:3 › Playwright authoring build coverage › library authoring triggers real build work and roundtrips through project load (11.7s)
  ok 21 [chromium] › tests\e2e\user_paths.spec.ts:324:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout maps (10.4s)
  ok 22 [chromium] › tests\e2e\authoring_builds.spec.ts:775:3 › Playwright authoring build coverage › library door count edits rebuild without loops and keep upper/lower module defaults stable (10.6s)
  ok 23 [chromium] › tests\e2e\user_paths.spec.ts:366:3 › Playwright real user paths › project roundtrip preserves authored door and drawer layout scenario matrix (13.6s)
  ok 24 [chromium] › tests\e2e\authoring_builds.spec.ts:814:3 › Playwright authoring build coverage › sliding structure authoring rebuilds cleanly after project load (16.6s)
  ok 26 [chromium] › tests\e2e\authoring_builds.spec.ts:880:3 › Playwright authoring build coverage › stack split and per-cell dimensions rebuild cleanly and keep lower stack isolated (16.6s)
  ok 25 [chromium] › tests\e2e\user_paths.spec.ts:413:3 › Playwright real user paths › settings backup import and restore-last-session recover real user state (24.2s)

  26 passed (2.9m)

```
