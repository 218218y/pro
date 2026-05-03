import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 62 order pdf sketch preview runtime ownership split is anchored', () => {
  const facade = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview.ts');
  const draft = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_draft.ts');
  const lifecycle = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_url_lifecycle.ts');
  const pdfDocument = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_pdf_document.ts');
  const renderPage = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_render_page.ts');
  const build = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_build.ts');
  const previewAction = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_preview.ts');
  const refreshOwner = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_refresh.ts');
  const hookOwner = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_controller_hook.ts');

  assert.ok(lineCount(facade) <= 4, 'sketch preview public module must stay a tiny facade');
  assert.match(facade, /order_pdf_overlay_sketch_preview_draft\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_preview_url_lifecycle\.js/);
  assert.match(facade, /order_pdf_overlay_sketch_preview_build\.js/);
  assert.doesNotMatch(
    facade,
    /loadPdfDocumentCtor|collectTrailingNonFormPageIndexes|getDocument\(|createObjectURL|canvasToPngBytes/,
    'facade must not own PDF loading, URL lifecycle, or canvas rendering internals'
  );

  assert.match(draft, /export function createOrderPdfSketchPreviewDraft/);
  assert.match(draft, /sketchAnnotations: undefined/);
  assert.doesNotMatch(draft, /Blob|URL|canvas|getDocument|loadPdfDocumentCtor/);

  assert.match(lifecycle, /export function getOrderPdfSketchPreviewBlobCtor/);
  assert.match(lifecycle, /export function getOrderPdfSketchPreviewUrlApi/);
  assert.match(lifecycle, /export function revokeOrderPdfSketchPreviewEntries/);
  assert.match(lifecycle, /revokeObjectURL/);
  assert.doesNotMatch(lifecycle, /getDocument\(|canvasToPngBytes|loadPdfDocumentCtor/);

  assert.match(pdfDocument, /export async function collectOrderPdfSketchPreviewTailPageMap/);
  assert.match(pdfDocument, /loadPdfDocumentCtor/);
  assert.match(pdfDocument, /collectTrailingNonFormPageIndexes/);
  assert.match(pdfDocument, /export async function loadOrderPdfSketchPreviewPdfJsDocument/);
  assert.match(pdfDocument, /disableWorker: true/);
  assert.match(pdfDocument, /export function destroyOrderPdfSketchPreviewPdfJsSession/);
  assert.doesNotMatch(pdfDocument, /createObjectURL|canvasToPngBytes|fillRect/);

  assert.match(renderPage, /export async function renderOrderPdfSketchPreviewPageToUrl/);
  assert.match(renderPage, /getViewport\(\{ scale: 1\.15 \}\)/);
  assert.match(renderPage, /canvasToPngBytes/);
  assert.match(renderPage, /getOrderPdfSketchPreviewBlobCtor/);
  assert.match(renderPage, /getOrderPdfSketchPreviewUrlApi/);
  assert.doesNotMatch(renderPage, /loadPdfDocumentCtor|collectTrailingNonFormPageIndexes/);

  assert.match(build, /export async function buildOrderPdfSketchPreviewEntries/);
  assert.match(build, /listOrderPdfSketchImageSlotSpecs/);
  assert.match(build, /collectOrderPdfSketchPreviewTailPageMap/);
  assert.match(build, /loadOrderPdfSketchPreviewPdfJsDocument/);
  assert.match(build, /renderOrderPdfSketchPreviewPageToUrl/);
  assert.match(build, /destroyOrderPdfSketchPreviewPdfJsSession/);
  assert.doesNotMatch(build, /loadPdfDocumentCtor|createObjectURL|fillRect/);

  assert.match(previewAction, /from '\.\/order_pdf_overlay_sketch_preview\.js';/);
  assert.match(refreshOwner, /from '\.\/order_pdf_overlay_sketch_preview\.js';/);
  assert.match(hookOwner, /from '\.\/order_pdf_overlay_sketch_preview\.js';/);
  for (const consumer of [previewAction, refreshOwner, hookOwner]) {
    assert.doesNotMatch(
      consumer,
      /order_pdf_overlay_sketch_preview_(draft|url_lifecycle|build|pdf_document|render_page)\.js/,
      'consumers must keep using the public sketch preview facade'
    );
  }

  assert.doesNotMatch(facade + draft + lifecycle + pdfDocument + renderPage + build, /export default\s+/);
});
