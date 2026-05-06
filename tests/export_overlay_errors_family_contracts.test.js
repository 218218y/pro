import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { assertLacksAll, assertMatchesAll, bundleSources, readSource } from './_source_bundle.js';

const read = rel => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('doors/export/errors family stays consolidated behind dedicated owners', () => {
  const doorsOwner = read('esm/native/services/doors_runtime_visuals.ts');
  const doorsShared = read('esm/native/services/doors_runtime_visuals_shared.ts');
  const doorsSeam = read('esm/native/services/doors_runtime_visuals_doors.ts');
  const drawersSeam = read('esm/native/services/doors_runtime_visuals_drawers.ts');

  assert.match(doorsOwner, /doors_runtime_visuals_doors\.js/);
  assert.match(doorsOwner, /doors_runtime_visuals_drawers\.js/);
  assert.match(doorsShared, /DOOR_SYSTEM_DIMENSIONS/);
  assert.match(doorsShared, /export const DOOR_OVERLAP = DOOR_SYSTEM_DIMENSIONS\.sliding\.overlapM;/);
  assert.match(doorsShared, /export function resolveSlidingDoorClosedState\(/);
  assert.match(doorsSeam, /export function forceUpdatePerState\(/);
  assert.match(doorsSeam, /export function syncVisualsNow\(/);
  assert.match(drawersSeam, /export function rebuildDrawerMeta\(/);
  assert.match(drawersSeam, /export function snapDrawersToTargets\(/);

  const builderShared = readSource(
    '../esm/native/ui/export/export_order_pdf_builder_shared.ts',
    import.meta.url
  );
  const sceneRender = readSource('../esm/native/ui/export/export_canvas_scene_render.ts', import.meta.url);
  const pdfRuntimeExport = readSource(
    '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export.ts',
    import.meta.url
  );
  const exportResidualBundle = bundleSources(
    [
      '../esm/native/ui/export/export_order_pdf_builder_contracts.ts',
      '../esm/native/ui/export/export_order_pdf_builder_draft.ts',
      '../esm/native/ui/export/export_canvas_scene_render_refresh.ts',
      '../esm/native/ui/export/export_canvas_scene_render_mirror.ts',
      '../esm/native/ui/export/export_canvas_scene_render_project.ts',
      '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_pdfjs.ts',
      '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_api.ts',
      '../esm/native/ui/react/pdf/order_pdf_overlay_runtime_export_loader.ts',
    ],
    import.meta.url
  );

  assertMatchesAll(
    assert,
    builderShared,
    [/export_order_pdf_builder_contracts\.js/, /export_order_pdf_builder_draft\.js/],
    'builderShared'
  );
  assertMatchesAll(
    assert,
    sceneRender,
    [
      /export_canvas_scene_render_refresh\.js/,
      /export_canvas_scene_render_mirror\.js/,
      /export_canvas_scene_render_project\.js/,
    ],
    'sceneRender'
  );
  assertMatchesAll(
    assert,
    pdfRuntimeExport,
    [
      /order_pdf_overlay_runtime_export_pdfjs\.js/,
      /order_pdf_overlay_runtime_export_api\.js/,
      /order_pdf_overlay_runtime_export_loader\.js/,
    ],
    'pdfRuntimeExport'
  );
  assertMatchesAll(
    assert,
    exportResidualBundle,
    [
      /export interface PdfDocLike \{/,
      /export function resolveOrderPdfDraft\(/,
      /export function refreshSceneAndRebuildForExport\(/,
      /export function getPdfJsLibFromModule\(/,
      /export function bindExportApiFromModule\(/,
      /export async function ensureExportApiReady\(/,
    ],
    'exportResidualBundle'
  );

  const errorsOwner = read('esm/native/ui/errors_install.ts');
  const errorsSupport = read('esm/native/ui/errors_install_support.ts');
  const errorsShared = read('esm/native/ui/errors_install_shared.ts');
  const errorsSurface = read('esm/native/ui/errors_install_surface.ts');
  const errorsPlatform = read('esm/native/ui/errors_install_platform.ts');
  const errorsRuntime = read('esm/native/ui/errors_install_runtime.ts');

  assert.match(errorsOwner, /errors_install_support\.js/);
  assert.match(errorsOwner, /errors_install_shared\.js/);
  assert.match(errorsOwner, /errors_install_surface\.js/);
  assert.match(errorsOwner, /errors_install_platform\.js/);
  assert.match(errorsOwner, /errors_install_runtime\.js/);
  assert.doesNotMatch(errorsOwner, /function _buildSnapshot\(/);
  assert.doesNotMatch(errorsOwner, /function __silentConsoleForApp\(/);
  assert.doesNotMatch(errorsOwner, /function __shouldIgnoreMessage\(/);
  assert.match(errorsSupport, /export function buildErrorsDebugSnapshot\(/);
  assert.match(errorsSupport, /export function consoleReportError\(/);
  assert.match(errorsSupport, /runPlatformWakeupFollowThrough\(App, \{ touchActivity: false \}\)/);
  assert.doesNotMatch(errorsSupport, /ensureRenderLoopViaPlatform\(/);
  assert.match(errorsShared, /export function ensureErrorsSurface\(/);
  assert.match(errorsSurface, /export function installErrorsSurfaceMethods\(/);
  assert.match(errorsPlatform, /export function installPlatformReportErrorBridge\(/);
  assert.match(errorsRuntime, /export function installErrorsWindowRuntime\(/);
});

const interactionsOwner = readSource('../esm/native/ui/interactions/canvas_interactions.ts', import.meta.url);
const exportCoreOwner = readSource('../esm/native/ui/export/export_canvas_core.ts', import.meta.url);
const exportDeliveryOwner = readSource('../esm/native/ui/export/export_canvas_delivery.ts', import.meta.url);
const builderOwner = readSource('../esm/native/ui/export/export_order_pdf_builder.ts', import.meta.url);
const workflowOwner = readSource('../esm/native/ui/export/export_canvas_workflow_shared.ts', import.meta.url);
const sceneOwner = readSource('../esm/native/ui/export/export_canvas_scene.ts', import.meta.url);
const compositeBundle = bundleSources(
  [
    '../esm/native/ui/export/export_order_pdf_capture_open_closed.ts',
    '../esm/native/ui/export/export_order_pdf_capture_render_sketch.ts',
    '../esm/native/ui/export/export_order_pdf_capture_composite_shared.ts',
    '../esm/native/ui/export/export_canvas_core.ts',
    '../esm/native/ui/export/export_canvas_core_shared.ts',
    '../esm/native/ui/export/export_canvas_core_canvas.ts',
    '../esm/native/ui/export/export_canvas_core_feedback.ts',
    '../esm/native/ui/export/export_canvas_delivery.ts',
    '../esm/native/ui/export/export_canvas_delivery_shared.ts',
    '../esm/native/ui/export/export_canvas_delivery_logo.ts',
    '../esm/native/ui/export/export_canvas_delivery_download.ts',
    '../esm/native/ui/export/export_canvas_delivery_clipboard.ts',
    '../esm/native/ui/export/export_order_pdf_builder.ts',
    '../esm/native/ui/export/export_order_pdf_builder_assets.ts',
    '../esm/native/ui/export/export_order_pdf_builder_document.ts',
    '../esm/native/ui/export/export_order_pdf_builder_layout.ts',
    '../esm/native/ui/export/export_order_pdf_builder_runtime.ts',
    '../esm/native/ui/export/export_canvas_scene.ts',
    '../esm/native/ui/export/export_canvas_scene_render.ts',
    '../esm/native/ui/export/export_canvas_scene_notes.ts',
    '../esm/native/ui/export/export_canvas_workflow_shared.ts',
    '../esm/native/ui/export/export_canvas_workflow_contracts.ts',
    '../esm/native/ui/export/export_canvas_workflow_header.ts',
    '../esm/native/ui/export/export_canvas_workflow_front_notes.ts',
    '../esm/native/ui/export/export_canvas_workflow_render_sketch.ts',
  ],
  import.meta.url
);

const overlayNamedSurfaceBundle = bundleSources(
  [
    '../esm/native/ui/export/export_canvas_workflows.ts',
    '../esm/native/ui/export/export_order_pdf_builder.ts',
    '../esm/native/ui/export/export_order_pdf_capture.ts',
    '../esm/native/ui/export/export_order_pdf_ops.ts',
    '../esm/native/ui/export/export_order_pdf_text.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_ops_attachment.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_export_singleflight.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

const overlayApp = readSource('../esm/native/ui/react/overlay_app.tsx', import.meta.url);
const overlayTopControls = readSource('../esm/native/ui/react/overlay_top_controls.tsx', import.meta.url);
const overlayPdfHost = readSource('../esm/native/ui/react/overlay_pdf_host.tsx', import.meta.url);
const quickDock = readSource('../esm/native/ui/react/overlay_quick_actions_dock.tsx', import.meta.url);
const quickController = readSource(
  '../esm/native/ui/react/overlay_quick_actions_dock_controller_runtime.ts',
  import.meta.url
);
const notesController = readSource(
  '../esm/native/ui/react/notes/notes_overlay_controller.tsx',
  import.meta.url
);
const notesRuntime = readSource(
  '../esm/native/ui/react/notes/notes_overlay_controller_runtime.tsx',
  import.meta.url
);
const notesInteractions = readSource(
  '../esm/native/ui/react/notes/notes_overlay_controller_interactions.ts',
  import.meta.url
);
const pdfRuntime = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime.ts',
  import.meta.url
);
const pdfApis = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime_apis.ts',
  import.meta.url
);

const pdfShared = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_controller_shared.ts',
  import.meta.url
);
const pdfSharedDomain = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_controller_shared_domain.ts',
  import.meta.url
);
const orderPdfRuntime = readSource(
  '../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts',
  import.meta.url
);
const notesHelpers = readSource('../esm/native/ui/react/notes/notes_overlay_helpers.tsx', import.meta.url);
const noteCard = readSource('../esm/native/ui/react/notes/notes_overlay_note_card.tsx', import.meta.url);
const noteCardToolbar = readSource(
  '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar.tsx',
  import.meta.url
);
const noteCardToolbarShared = readSource(
  '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar_shared.ts',
  import.meta.url
);
const noteCardToolbarEvents = readSource(
  '../esm/native/ui/react/notes/notes_overlay_note_card_toolbar_events.ts',
  import.meta.url
);

const errorOverlay = readSource('../esm/native/ui/error_overlay.ts', import.meta.url);
const errorOverlaySupport = readSource('../esm/native/ui/error_overlay_support.ts', import.meta.url);
const viewportOwner = readSource('../esm/native/services/viewport_runtime.ts', import.meta.url);
const viewportBundle = bundleSources(
  ['../esm/native/services/viewport_runtime.ts', '../esm/native/services/viewport_runtime_support.ts'],
  import.meta.url,
  { stripNoise: true }
);

test('[overlay-export-family] export/capture owners stay thin while composite behavior lives on focused seams', () => {
  assertMatchesAll(
    assert,
    interactionsOwner,
    [
      /canvas_interactions_hover\.js/,
      /canvas_interactions_pointer\.js/,
      /canvas_interactions_shared\.js/,
      /export function installCanvasInteractions\(/,
    ],
    'interactions owner'
  );

  assertMatchesAll(
    assert,
    exportCoreOwner,
    [/export_canvas_core_shared\.js/, /export_canvas_core_canvas\.js/, /export_canvas_core_feedback\.js/],
    'export core owner'
  );
  assertMatchesAll(
    assert,
    exportDeliveryOwner,
    [
      /export_canvas_delivery_shared\.js/,
      /export_canvas_delivery_logo\.js/,
      /export_canvas_delivery_download\.js/,
      /export_canvas_delivery_clipboard\.js/,
    ],
    'export delivery owner'
  );
  assertMatchesAll(
    assert,
    builderOwner,
    [
      /export_order_pdf_builder_assets\.js/,
      /export_order_pdf_builder_document\.js/,
      /export_order_pdf_builder_runtime\.js/,
    ],
    'order pdf builder owner'
  );
  assertMatchesAll(
    assert,
    workflowOwner,
    [
      /export_canvas_workflow_contracts\.js/,
      /export_canvas_workflow_header\.js/,
      /export_canvas_workflow_front_notes\.js/,
    ],
    'workflow owner'
  );
  assertMatchesAll(
    assert,
    sceneOwner,
    [/export_canvas_scene_wall\.js/, /export_canvas_scene_render\.js/, /export_canvas_scene_notes\.js/],
    'scene owner'
  );

  assertMatchesAll(
    assert,
    compositeBundle,
    [
      /export function readOrderPdfCompositeBase\(/,
      /export async function captureCompositeWithLogoFallback\(/,
      /export function _getRendererCanvasSource\(/,
      /export function getExportLogoImage\(/,
      /renderSceneForExport\(/,
      /async function prepareOrderPdfBuildAssets\(/,
      /async function buildOrderPdfDocumentResult\(/,
      /function drawExportHeader\(/,
    ],
    'overlay export bundle'
  );
});

test('[overlay-export-family] overlay ui seams stay wiring-first while controllers/apis own the stateful work', () => {
  assertMatchesAll(
    assert,
    overlayApp,
    [
      /import \{ OverlayTopControls \} from '\.\/overlay_top_controls\.js';/,
      /import \{ OverlayPdfHost \} from '\.\/overlay_pdf_host\.js';/,
      /<OverlayTopControls \/>/,
      /\{pdfOpen \? <OverlayPdfHost \/> : null\}/,
    ],
    'overlay app'
  );
  assertLacksAll(
    assert,
    overlayApp,
    [
      /function useHistoryStatus\(/,
      /function UndoRedoControls\(/,
      /function CameraControls\(/,
      /OrderPdfOverlayLazy/,
    ],
    'overlay app'
  );

  assertMatchesAll(
    assert,
    overlayTopControls,
    [
      /function useHistoryStatus\(/,
      /function UndoRedoControls\(/,
      /function CameraControls\(/,
      /moveCameraViaService\(app, view\)/,
    ],
    'overlay top controls'
  );
  assertMatchesAll(
    assert,
    overlayPdfHost,
    [
      /const OrderPdfOverlayLazy = (?:React\.lazy|lazy)\(/,
      /function PdfEditorLoadingOverlay\(/,
      /createPortal\(/,
    ],
    'overlay pdf host'
  );

  assertMatchesAll(
    assert,
    quickController,
    [
      /export function createQuickActionsDockController\(/,
      /readPinnedSync\(\) \{/,
      /subscribePinnedSync\(setPinnedSync\) \{/,
      /runAction\(\{ action, closeMenu, event, keepOpen = false, op \}\) \{/,
      /toggleMenu\(\{ event, op, setMenuOpen \}\) \{/,
    ],
    'overlay quick actions controller'
  );
  assertMatchesAll(
    assert,
    quickDock,
    [
      /createQuickActionsDockController\(\{ api, reportNonFatal: reportOverlayAppNonFatal \}\)/,
      /quickActionsController\.readPinnedSync\(\)/,
      /quickActionsController\.subscribePinnedSync\(setPinnedSync\)/,
      /quickActionsController\.toggleMenu\(\{/,
      /quickActionsController\.runAction\(\{[\s\S]*op: 'quick-actions:snapshot'/,
    ],
    'overlay quick actions dock'
  );

  assertMatchesAll(
    assert,
    notesController,
    [/export \{ useNotesOverlayController \} from '\.\/notes_overlay_controller_runtime\.js';/],
    'notes controller seam'
  );
  assertMatchesAll(
    assert,
    notesRuntime,
    [/notes_overlay_controller_state\.js/, /notes_overlay_controller_effects\.js/],
    'notes runtime owner'
  );
  assertMatchesAll(
    assert,
    notesInteractions,
    [/notes_overlay_controller_pointer\.js/],
    'notes interactions seam'
  );
  assertMatchesAll(
    assert,
    pdfRuntime,
    [/order_pdf_overlay_component_runtime_env\.js/],
    'order pdf overlay component runtime seam'
  );
  assertMatchesAll(
    assert,
    pdfApis,
    [/createOrderPdfOverlayExportOps/, /createOrderPdfOverlayGmailOps/],
    'order pdf overlay component apis'
  );
});

test('[overlay-export-family] secondary overlay barrels stay explicit over domain/runtime/note-card subowners', () => {
  assertMatchesAll(
    assert,
    pdfShared,
    [/order_pdf_overlay_controller_shared_domain\.js/, /order_pdf_overlay_controller_shared_state\.js/],
    'pdf shared seam'
  );
  assertMatchesAll(
    assert,
    pdfSharedDomain,
    [
      /order_pdf_overlay_controller_domain_feedback\.js/,
      /order_pdf_overlay_controller_domain_render\.js/,
      /order_pdf_overlay_controller_domain_export\.js/,
    ],
    'pdf shared-domain seam'
  );
  assertMatchesAll(
    assert,
    orderPdfRuntime,
    [/order_pdf_overlay_runtime_shared\.js/, /order_pdf_overlay_runtime_export\.js/],
    'order pdf runtime seam'
  );
  assertMatchesAll(
    assert,
    notesHelpers,
    [/notes_overlay_helpers_shared\.js/, /notes_overlay_editor\.js/],
    'notes helpers seam'
  );
  assertMatchesAll(
    assert,
    noteCard,
    [/notes_overlay_note_card_preview\.js/, /notes_overlay_note_card_toolbar\.js/],
    'note card seam'
  );
  assertMatchesAll(
    assert,
    noteCardToolbar,
    [
      /notes_overlay_note_card_toolbar_bold\.js/,
      /notes_overlay_note_card_toolbar_color\.js/,
      /notes_overlay_note_card_toolbar_size\.js/,
      /notes_overlay_note_card_toolbar_delete\.js/,
    ],
    'note card toolbar seam'
  );
  assertMatchesAll(
    assert,
    noteCardToolbarShared,
    [/export const NOTE_TOOLBAR_COLORS(?:\s*:\s*[^=]+)?\s*=/],
    'note card toolbar shared'
  );
  assertMatchesAll(
    assert,
    noteCardToolbarEvents,
    [/export function stopToolbarPointer\(/],
    'note card toolbar events'
  );
});

test('[overlay-export-family] error overlay and viewport runtime keep low-level helpers on support seams', () => {
  assertMatchesAll(
    assert,
    errorOverlay,
    [
      /from '\.\/error_overlay_support\.js'/,
      /formatFatalOverlayError\(/,
      /makeFatalOverlayCopyText\(/,
      /copyFatalOverlayText\(/,
      /downloadFatalOverlayJson\(/,
      /readFatalOverlayExistingController\(/,
    ],
    'error overlay owner'
  );
  assertLacksAll(
    assert,
    errorOverlay,
    [
      /function _safeText\(/,
      /function _formatError\(/,
      /function _stableStringify\(/,
      /function _copyText\(/,
      /function _downloadJson\(/,
      /function _getExistingController\(/,
    ],
    'error overlay owner'
  );
  assertMatchesAll(
    assert,
    errorOverlaySupport,
    [
      /export function safeFatalOverlayText\(/,
      /export function formatFatalOverlayError\(/,
      /export function stableFatalOverlayStringify\(/,
      /export function makeFatalOverlayCopyText\(/,
      /export function copyFatalOverlayText\(/,
      /export function downloadFatalOverlayJson\(/,
      /export function readFatalOverlayExistingController\(/,
    ],
    'error overlay support'
  );

  assertMatchesAll(
    assert,
    viewportOwner,
    [
      /from '\.\/viewport_runtime_support\.js';/,
      /applyViewportBootCameraPose\(/,
      /reportViewportRuntimeNonFatal\(/,
      /writeViewportSketchMode\(/,
      /syncViewportSceneViewAfterSketchMode\(/,
    ],
    'viewport runtime owner'
  );
  assertLacksAll(
    assert,
    viewportOwner,
    [/console\.error\(/, /normalizeUnknownError\(/, /setRuntimeSketchMode\(/],
    'viewport runtime owner'
  );
  assertMatchesAll(
    assert,
    viewportBundle,
    [
      /export function reportViewportRuntimeNonFatal\(/,
      /export function applyViewportBootCameraPose\(/,
      /export function syncViewportSceneViewAfterSketchMode\(/,
      /export function writeViewportSketchMode\(/,
    ],
    'viewport runtime bundle'
  );
});

test('[overlay-export-family] order-pdf/export helper seams stay named-only after cleanup', () => {
  assertLacksAll(assert, overlayNamedSurfaceBundle, [/export default\s*\{/], 'overlay named surfaces');
  assertMatchesAll(
    assert,
    overlayNamedSurfaceBundle,
    [
      /export function createExportOrderPdfBuilderOps\(/,
      /export function createExportOrderPdfCaptureOps\(/,
      /export function createExportOrderPdfOps\(/,
      /export function createExportOrderPdfTextOps\(/,
      /export function runOrderPdfOverlayActionSingleFlight\(/,
    ],
    'overlay named surfaces'
  );
});
