import test from 'node:test';
import assert from 'node:assert/strict';

import { captureOrderPdfCompositeImages } from '../esm/native/ui/export/export_order_pdf_builder_layout.ts';
import type { OrderPdfDraftLike } from '../types/build.ts';

test('captureOrderPdfCompositeImages applies sketch annotations after base composite capture', async () => {
  const draft: OrderPdfDraftLike = {
    includeRenderSketch: true,
    includeOpenClosed: true,
    sketchAnnotations: {
      renderSketch: {
        strokes: [
          {
            tool: 'pen',
            color: '#2563eb',
            width: 2,
            points: [{ x: 0.2, y: 0.3 }],
          },
        ],
      },
    },
  };
  const resolvedDraft = {
    projectName: 'alpha',
    orderNumber: '',
    orderDate: '',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    notes: '',
    orderDetails: '',
    includeRenderSketch: true,
    includeOpenClosed: true,
  };

  const seenKeys: Array<'renderSketch' | 'openClosed'> = [];
  const result = await captureOrderPdfCompositeImages(
    {} as never,
    draft,
    resolvedDraft,
    { _exportReportThrottled: () => undefined } as never,
    {
      async applySketchAnnotationsToCompositePngBytes({ key, pngBytes }) {
        seenKeys.push(key);
        return pngBytes ? Uint8Array.from([...pngBytes, key === 'renderSketch' ? 9 : 8]) : null;
      },
      async captureCompositeRenderSketchPngBytes() {
        return Uint8Array.from([1, 2, 3]);
      },
      async captureCompositeOpenClosedPngBytes() {
        return Uint8Array.from([4, 5, 6]);
      },
    }
  );

  assert.deepEqual(seenKeys, ['renderSketch', 'openClosed']);
  assert.deepEqual(Array.from(result.renderSketch || []), [1, 2, 3, 9]);
  assert.deepEqual(Array.from(result.openClosed || []), [4, 5, 6, 8]);
});
