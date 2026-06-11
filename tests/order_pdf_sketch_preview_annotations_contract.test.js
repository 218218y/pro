import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('[order-pdf] sketch preview builds its background pdf without baked sketch annotations', () => {
  const previewSrc = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview.ts');
  const draftOwnerSrc = read('esm/native/ui/react/pdf/order_pdf_overlay_sketch_preview_draft.ts');
  const exportActionsSrc = read('esm/native/ui/react/pdf/order_pdf_overlay_export_actions_preview.ts');

  assert.match(
    draftOwnerSrc,
    /export function createOrderPdfSketchPreviewDraft\(draft: OrderPdfDraft\): OrderPdfDraft \{[\s\S]*sketchAnnotations: undefined,[\s\S]*\}/
  );
  assert.match(previewSrc, /order_pdf_overlay_sketch_preview_draft\.js/);
  assert.match(previewSrc, /order_pdf_overlay_sketch_preview_build\.js/);
  assert.match(
    exportActionsSrc,
    /buildOrderPdfSketchPreviewEntries\(\{[\s\S]*draft: createOrderPdfSketchPreviewDraft\(draft\),/
  );
});
