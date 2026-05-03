import test from 'node:test';
import assert from 'node:assert/strict';

import { bundleSources, readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';
import { readFirstExisting } from './_read_src.js';

const runtimeApi = readSource('../esm/native/runtime/api.ts', import.meta.url);
const servicesApi = readServicesApiPublicSurface(import.meta.url);
const browserDownload = readSource('../esm/native/runtime/browser_download.ts', import.meta.url);
const exportCanvas = bundleSources(
  [
    '../esm/native/ui/export_canvas.ts',
    '../esm/native/ui/export/export_canvas_shared.ts',
    '../esm/native/ui/export/export_canvas_core.ts',
    '../esm/native/ui/export/export_canvas_core_shared.ts',
    '../esm/native/ui/export/export_canvas_core_canvas.ts',
    '../esm/native/ui/export/export_canvas_core_feedback.ts',
    '../esm/native/ui/export/export_canvas_scene.ts',
    '../esm/native/ui/export/export_canvas_viewport.ts',
    '../esm/native/ui/export/export_canvas_delivery.ts',
    '../esm/native/ui/export/export_canvas_delivery_shared.ts',
    '../esm/native/ui/export/export_canvas_delivery_logo.ts',
    '../esm/native/ui/export/export_canvas_delivery_download.ts',
    '../esm/native/ui/export/export_canvas_delivery_clipboard.ts',
    '../esm/native/ui/export/export_canvas_workflows.ts',
    '../esm/native/ui/export/export_canvas_workflow_shared.ts',
    '../esm/native/ui/export/export_canvas_workflow_contracts.ts',
    '../esm/native/ui/export/export_canvas_workflow_header.ts',
    '../esm/native/ui/export/export_canvas_workflow_front_notes.ts',
    '../esm/native/ui/export/export_canvas_workflow_copy.ts',
    '../esm/native/ui/export/export_canvas_workflow_dual.ts',
    '../esm/native/ui/export/export_canvas_workflow_render_sketch.ts',
    '../esm/native/ui/export/export_canvas_workflow_snapshot.ts',
  ],
  import.meta.url
);
const pdfOverlay = [
  readSource('../esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx', import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_component_state.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_component_runtime_apis.ts'],
    import.meta.url
  ),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_controller.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_constants.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_runtime.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_text.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_contracts.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_export_ops.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_interactions.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_interactions_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_stage_interactions.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_file_interactions.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_shell_interactions_runtime.ts'],
    import.meta.url
  ),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_shell_effects.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_gmail_ops.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_shared.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_load.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render_canvas.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_toolbar.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_layout.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_rich_editors.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_editor_surface.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_export_actions.ts'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands_types.ts'],
    import.meta.url
  ),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands_errors.ts'],
    import.meta.url
  ),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands_load_pdf.ts'],
    import.meta.url
  ),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands_downloads.ts'],
    import.meta.url
  ),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands_gmail.ts'],
    import.meta.url
  ),
  readFirstExisting(
    ['../esm/native/ui/react/pdf/order_pdf_overlay_export_commands_pdfjs.ts'],
    import.meta.url
  ),
  readFirstExisting(['../esm/native/ui/react/pdf/order_pdf_overlay_action_feedback.ts'], import.meta.url),
].join('\n');
const pdfOverlayText = bundleSources(
  [
    '../esm/native/ui/react/pdf/order_pdf_overlay_text.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_shared.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_regions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_insertions.ts',
    '../esm/native/ui/react/pdf/order_pdf_overlay_text_details_merge.ts',
  ],
  import.meta.url
);
const notesExport = bundleSources(
  [
    '../esm/native/ui/notes_export.ts',
    '../esm/native/ui/notes_export_shared.ts',
    '../esm/native/ui/notes_export_visibility.ts',
    '../esm/native/ui/notes_export_render.ts',
    '../esm/native/ui/notes_export_render_shared.ts',
    '../esm/native/ui/notes_export_render_transform.ts',
    '../esm/native/ui/notes_export_render_draw.ts',
    '../esm/native/ui/notes_export_render_runtime.ts',
  ],
  import.meta.url
);
const notesOverlay = [
  readSource('../esm/native/ui/react/notes/NotesOverlay.tsx', import.meta.url),
  readFirstExisting(['../esm/native/ui/react/notes/notes_overlay_controller.tsx'], import.meta.url),
  readFirstExisting(['../esm/native/ui/react/notes/notes_overlay_controller_effects.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/notes/notes_overlay_controller_mode_effects.ts'],
    import.meta.url
  ),
  readFirstExisting(['../esm/native/ui/react/notes/notes_overlay_editor_workflows.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/notes/notes_overlay_editor_workflow_shared.ts'],
    import.meta.url
  ),
  readFirstExisting(['../esm/native/ui/react/notes/notes_overlay_editor_workflow_core.ts'], import.meta.url),
  readFirstExisting(
    ['../esm/native/ui/react/notes/notes_overlay_editor_workflow_events.ts'],
    import.meta.url
  ),
].join('\n');
const domHelpers = readSource('../esm/native/ui/dom_helpers.ts', import.meta.url);
const projectSaveLoad = readSource('../esm/native/ui/interactions/project_save_load.ts', import.meta.url);
const projectSaveLoadController = readSource(
  '../esm/native/ui/interactions/project_save_load_controller_runtime.ts',
  import.meta.url
);
const projectSaveRuntime = bundleSources(
  [
    '../esm/native/ui/project_save_runtime.ts',
    '../esm/native/ui/project_save_runtime_contracts.ts',
    '../esm/native/ui/project_save_runtime_prompt.ts',
    '../esm/native/ui/project_save_runtime_results.ts',
    '../esm/native/ui/project_save_runtime_action.ts',
  ],
  import.meta.url
);
const settingsBackup = readSource('../esm/native/ui/settings_backup.ts', import.meta.url);
const browserFileDownload = readSource('../esm/native/ui/browser_file_download.ts', import.meta.url);
const errorOverlay = bundleSources(
  ['../esm/native/ui/error_overlay.ts', '../esm/native/ui/error_overlay_support.ts'],
  import.meta.url
);

test('[export-download-dom] browser download helpers stay centralized across runtime/services and UI wrappers', () => {
  assertMatchesAll(
    assert,
    `${runtimeApi}\n${servicesApi}\n${browserDownload}`,
    [
      /triggerHrefDownloadViaBrowser\(/,
      /triggerBlobDownloadResultViaBrowser\(/,
      /triggerBlobDownloadViaBrowser\(/,
      /triggerCanvasDownloadResultViaBrowser\(/,
      /triggerCanvasDownloadViaBrowser\(/,
    ],
    'browserDownload'
  );
  assertMatchesAll(
    assert,
    browserFileDownload,
    [
      /export function downloadTextViaBrowser\(/,
      /export function downloadJsonTextViaBrowser\(/,
      /export function downloadJsonObjectResultViaBrowser\(/,
      /export function downloadJsonObjectViaBrowser\(/,
    ],
    'browserFileDownload'
  );
  assert.match(projectSaveRuntime, /downloadJsonTextResultViaBrowser\(/);
  assert.match(
    `${settingsBackup}\n${readSource('../esm/native/ui/settings_backup_export.ts', import.meta.url)}\n${browserFileDownload}`,
    /downloadJsonObjectResultViaBrowser\(/
  );
  assert.match(errorOverlay, /downloadJsonTextViaBrowser\(/);
  assertLacksAll(
    assert,
    `${projectSaveLoad}\n${projectSaveLoadController}\n${projectSaveRuntime}\n${settingsBackup}\n${errorOverlay}`,
    [/URL\.createObjectURL\(/],
    'uiDownloadConsumers'
  );
});

test('[export-download-dom] export and PDF flows use shared delivery seams instead of ad-hoc DOM downloads', () => {
  assertMatchesAll(
    assert,
    exportCanvas,
    [
      /triggerBlobDownloadResultViaBrowser\(App, blob, filename\)/,
      /triggerCanvasDownloadResultViaBrowser\(App, canvas, filename\)/,
      /triggerCanvasDownloadResultViaBrowser\(App, [a-zA-Z]+, filename\)/,
    ],
    'exportCanvas'
  );
  assertLacksAll(assert, exportCanvas, [/URL\.createObjectURL/, /createElement\('a'\)/], 'exportCanvas');

  assertMatchesAll(
    assert,
    pdfOverlay,
    [
      /triggerBlobDownloadViaBrowser\(\{ docMaybe, winMaybe \}, built\.blob, built\.fileName\)/,
      /triggerBlobDownloadViaBrowser\(\{ docMaybe, winMaybe \}, built\.blob, fileName\)/,
      /triggerBlobDownloadViaBrowser\(\{ docMaybe, winMaybe \}, blob, fileName\)/,
      /order_pdf_overlay_runtime\.js/,
      /order_pdf_overlay_text\.js/,
      /order_pdf_overlay_interactions\.js/,
    ],
    'pdfOverlay'
  );
  assert.doesNotMatch(pdfOverlay, /function triggerBlobDownload\(/);
});

test('[export-download-dom] notes and PDF DOM hotspots stay on shared DOM helpers', () => {
  assertMatchesAll(
    assert,
    domHelpers,
    [
      /export function getElementByIdHtml/,
      /export function queryHtmlElement/,
      /export function toggleBodyClass/,
      /export function serializeDetachedHtmlNode/,
    ],
    'domHelpers'
  );
  assertMatchesAll(
    assert,
    notesExport,
    [
      /getElementByIdHtml\(doc, 'viewer-container'\)/,
      /queryHtmlElement\(/,
      /serializeDetachedHtmlNode\(doc, wrapper\)/,
    ],
    'notesExport'
  );
  assertMatchesAll(
    assert,
    notesOverlay,
    [
      /getDocumentMaybe\(App\)/,
      /getElementByIdHtml\(doc, 'viewer-container'\)/,
      /toggleElementClass\(viewerContainer, 'notes-hidden', !notesEnabled\)/,
      /toggleBodyClass\(doc, 'is-drawing', !!editMode\)/,
    ],
    'notesOverlay'
  );
  assert.doesNotMatch(notesOverlay, /App\.browser\?\.getDocument/);
  assert.match(pdfOverlayText, /createDetachedHtmlRoot\(doc, h\)/);
  assert.match(pdfOverlay, /getElementByIdHtml\(doc, 'customPromptModal'\)/);
  assert.match(pdfOverlay, /setSanitizedElementHtmlIfChanged\(/);
});
