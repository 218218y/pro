import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 58 order pdf sketch preview controller ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller.ts');
  const types = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_types.ts');
  const viewport = read(
    'esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_viewport_state.ts'
  );
  const session = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_session.ts');
  const refresh = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_refresh.ts');
  const hook = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_hook.ts');
  const overlay = read('esm/native/ui/react/pdf/OrderPdfInPlaceEditorOverlay.tsx');

  assert.ok(lineCount(facade) <= 6, 'sketch preview controller facade must stay tiny');
  assert.match(facade, /order_pdf_overlay_sketch_preview_controller_types\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_preview_controller_hook\.js/);
  assert.doesNotMatch(
    facade,
    /useState|useEffect|runOrderPdfSketchPreviewBuildSession|applyViewportSketchMode|setDoorsOpenViaService/,
    'facade must not own hook state, build-session, or viewport mutation internals'
  );

  assert.match(types, /export type BuildSketchPreview/);
  assert.match(types, /export type UseOrderPdfOverlaySketchPreviewArgs/);
  assert.match(types, /export type OrderPdfOverlaySketchPreviewController/);
  assert.doesNotMatch(types, /useState|useEffect|runOrderPdfSketchPreviewBuildSession/);

  assert.match(viewport, /export function useOrderPdfSketchPreviewViewportStateAdapters\(/);
  for (const api of [
    'applyViewportSketchMode',
    'getDoorsOpenViaService',
    'readRuntimeScalarOrDefaultFromApp',
    'restoreViewportCameraPose',
    'snapshotViewportCameraPose',
  ]) {
    assert.match(viewport, new RegExp(api), `viewport owner must own ${api}`);
  }
  assert.doesNotMatch(viewport, /runOrderPdfSketchPreviewBuildSession|revokeOrderPdfSketchPreviewEntries/);

  assert.match(session, /export function captureOrderPdfSketchPreviewControllerSessionSnapshot\(/);
  assert.match(session, /export function restoreOrderPdfSketchPreviewControllerSessionState\(/);
  assert.match(session, /captureOrderPdfSketchPreviewSessionSnapshot/);
  assert.match(session, /restoreOrderPdfSketchPreviewSessionSnapshot/);
  assert.doesNotMatch(session, /useState|runOrderPdfSketchPreviewBuildSession/);

  assert.match(refresh, /export function useOrderPdfSketchPreviewRefresh\(/);
  assert.match(refresh, /runOrderPdfSketchPreviewBuildSession/);
  assert.match(refresh, /revokeOrderPdfSketchPreviewEntries/);
  assert.doesNotMatch(
    refresh,
    /applyViewportSketchMode|setDoorsOpenViaService|captureOrderPdfSketchPreviewSessionSnapshot/
  );

  assert.match(hook, /useOrderPdfSketchPreviewViewportStateAdapters/);
  assert.match(hook, /useOrderPdfSketchPreviewRefresh/);
  assert.match(hook, /captureOrderPdfSketchPreviewControllerSessionSnapshot/);
  assert.match(hook, /restoreOrderPdfSketchPreviewControllerSessionState/);
  assert.doesNotMatch(
    hook,
    /applyViewportSketchMode|getDoorsOpenViaService|runOrderPdfSketchPreviewBuildSession/
  );

  assert.match(overlay, /from '\.\/order_pdf_overlay_sketch_preview_controller\.js';/);
  assert.doesNotMatch(
    overlay,
    /order_pdf_overlay_sketch_preview_controller_(types|hook|viewport_state|session|refresh)\.js/,
    'overlay must keep using the public sketch preview controller facade'
  );

  assert.doesNotMatch(facade + types + viewport + session + refresh + hook, /export default\s+/);
});
