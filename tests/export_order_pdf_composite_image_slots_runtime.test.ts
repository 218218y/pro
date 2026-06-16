import test from 'node:test';
import assert from 'node:assert/strict';

import {
  listOrderPdfCompositeImageCapturePlan,
  listOrderPdfCompositeImagePageBytes,
} from '../esm/native/ui/export/export_order_pdf_composite_image_slots_runtime.ts';

test('order pdf composite-image slot runtime keeps capture and page order on canonical slot specs', () => {
  const capturePlan = listOrderPdfCompositeImageCapturePlan({
    flags: { includeRenderSketch: false, includeOpenClosed: true },
    cachedSlotBytes: {
      renderSketch: Uint8Array.from([9]),
      openClosed: Uint8Array.from([8]),
    },
  });

  assert.deepEqual(capturePlan, [{ key: 'openClosed', basePngBytes: Uint8Array.from([8]) }]);

  const pages = listOrderPdfCompositeImagePageBytes({
    flags: { includeRenderSketch: true, includeOpenClosed: true },
    slotBytes: {
      renderSketch: Uint8Array.from([1]),
      openClosed: Uint8Array.from([2]),
    },
  });

  assert.deepEqual(
    pages.map(bytes => Array.from(bytes)),
    [[1], [2]]
  );
});
