import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 50 order pdf export actions ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions.ts');
  const callbacks = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_callbacks.ts');
  const blobBuilder = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_interactive_blob.ts');
  const ops = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_ops.ts');
  const pdfJs = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_pdfjs.ts');
  const preview = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_preview.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_types.ts');
  const controllerActions = read('esm/native/ui/react/pdf/order_pdf_overlay_controller_actions.ts');
  const controller = read('esm/native/ui/react/pdf/order_pdf_overlay_controller.ts');

  assert.ok(
    lineCount(facade) <= 140,
    'order_pdf_overlay_export_actions.ts must stay a small hook facade instead of regrowing export orchestration'
  );
  for (const owner of [
    'order_pdf_overlay_export_actions_callbacks.js',
    'order_pdf_overlay_export_actions_interactive_blob.js',
    'order_pdf_overlay_export_actions_ops.js',
    'order_pdf_overlay_export_actions_pdfjs.js',
    'order_pdf_overlay_export_actions_preview.js',
  ]) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')), `facade must compose ${owner}`);
  }
  assert.doesNotMatch(
    facade,
    /loadOrderPdfIntoEditorWithDeps|exportOrderPdfViaGmailWithDeps|buildOrderPdfSketchPreviewEntries|writeOrderPdfSketchPreviewBlobCache/,
    'facade must not own command execution, preview rendering, or blob cache internals'
  );

  assert.match(callbacks, /export function useOrderPdfOverlayExportActionCallbacks/);
  assert.match(callbacks, /runOrderPdfOverlayActionSingleFlight/);
  assert.match(callbacks, /runPerfAction/);
  assert.match(callbacks, /loadOrderPdfIntoEditorWithDeps/);
  assert.match(callbacks, /exportOrderPdfViaGmailWithDeps/);
  assert.doesNotMatch(callbacks, /useRef|writeOrderPdfSketchPreviewBlobCache/);

  assert.match(blobBuilder, /export function useOrderPdfOverlayInteractivePdfBlobBuilder/);
  assert.match(blobBuilder, /buildOrderPdfSketchPreviewBlobCacheSignature/);
  assert.match(blobBuilder, /writeOrderPdfSketchPreviewBlobCache/);
  assert.doesNotMatch(blobBuilder, /runPerfAction|runOrderPdfOverlayActionSingleFlight/);

  assert.match(ops, /export function useOrderPdfOverlayExportOperationAdapters/);
  assert.match(ops, /createOrderPdfOverlayExportOps/);
  assert.match(ops, /createOrderPdfOverlayGmailOps/);
  assert.doesNotMatch(ops, /setGmailBusy|setImagePdfBusy/);

  assert.match(pdfJs, /export function useOrderPdfOverlayPdfJsLoader/);
  assert.match(pdfJs, /ensureOrderPdfJsWithDeps/);

  assert.match(preview, /export function useOrderPdfOverlaySketchPreviewAction/);
  assert.match(preview, /buildOrderPdfSketchPreviewEntries/);
  assert.match(preview, /draft: createOrderPdfSketchPreviewDraft\(draft\),/);

  assert.match(types, /export type OrderPdfOverlayExportActionsArgs/);
  assert.match(types, /export type OrderPdfOverlayExportActionsApi/);
  assert.doesNotMatch(facade + callbacks + blobBuilder + ops + pdfJs + preview + types, /export default\s+/);

  assert.match(
    controllerActions,
    /export \{ useOrderPdfOverlayExportActions \} from '\.\/order_pdf_overlay_export_actions\.js';/,
    'controller action barrel must keep exposing the public facade'
  );
  assert.match(
    controller,
    /from '\.\/order_pdf_overlay_controller_actions\.js';/,
    'controller must keep consuming the action barrel, not the private export-action owners'
  );
  assert.doesNotMatch(
    controller,
    /order_pdf_overlay_export_actions_(callbacks|interactive_blob|ops|pdfjs|preview|types)\.js/,
    'controller must not bypass the public export-action facade'
  );
});
