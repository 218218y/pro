import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildOrderPdfCompositeImageLegacyBytes,
  listOrderPdfCompositeImageCapturePlan,
  listOrderPdfCompositeImagePageBytes,
  readOrderPdfCompositeImageSlotBytesFromLegacy,
} from '../esm/native/ui/export/export_order_pdf_composite_image_slots_runtime.ts';

test('order pdf composite-image slot runtime maps legacy cache bytes to canonical slot bytes and back', () => {
  const slotBytes = readOrderPdfCompositeImageSlotBytesFromLegacy({
    pngRenderSketch: Uint8Array.from([1, 2, 3]),
    pngOpenClosed: Uint8Array.from([4, 5, 6]),
  });

  assert.deepEqual(Array.from(slotBytes.renderSketch || []), [1, 2, 3]);
  assert.deepEqual(Array.from(slotBytes.openClosed || []), [4, 5, 6]);

  const legacy = buildOrderPdfCompositeImageLegacyBytes({
    flags: { includeRenderSketch: true, includeOpenClosed: false },
    slotBytes,
  });

  assert.deepEqual(Array.from(legacy.pngRenderSketch || []), [1, 2, 3]);
  assert.equal(legacy.pngOpenClosed, null);
});

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
