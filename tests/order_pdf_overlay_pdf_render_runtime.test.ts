import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isOrderPdfLoadCancelled,
  isOrderPdfRenderCancelled,
  loadOrderPdfFirstPage,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render.ts';

test('order pdf render helpers treat destroyed/aborted worker errors as expected cancellations', () => {
  assert.equal(isOrderPdfLoadCancelled(new Error('Worker was destroyed')), true);
  assert.equal(isOrderPdfLoadCancelled(new Error('Loading aborted')), true);
  assert.equal(isOrderPdfLoadCancelled({ name: 'AbortError', message: '' }), true);
  assert.equal(isOrderPdfRenderCancelled(new Error('Rendering cancelled, page 1')), true);
  assert.equal(isOrderPdfRenderCancelled(new Error('Worker was destroyed')), true);
  assert.equal(isOrderPdfLoadCancelled(new Error('Completely different failure')), false);
});

test('loadOrderPdfFirstPage clones source bytes before handing them to pdf.js', async () => {
  const sourceBytes = new Uint8Array([11, 22, 33, 44]);
  let taskData: Uint8Array | null = null;
  const mockPage = {
    view: [0, 0, 595, 842],
    getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
    render: () => ({ promise: Promise.resolve() }),
  };
  const mockDoc = {
    getPage: async () => mockPage,
  };

  const loaded = await loadOrderPdfFirstPage({
    ensurePdfJs: async () =>
      ({
        VerbosityLevel: { ERRORS: 0 },
        getDocument: ({ data }: { data: Uint8Array }) => {
          taskData = data;
          return {
            promise: Promise.resolve(mockDoc),
            destroy: () => undefined,
          };
        },
      }) as any,
    pdfBytesRef: { current: sourceBytes },
    pdfSourceTick: 1,
    lastLoadedPdfTickRef: { current: -1 },
    pdfRenderTaskRef: { current: null },
    pdfDocTaskRef: { current: null },
    pdfDocRef: { current: null },
    pageRef: { current: null },
    pageSizeRef: { current: null },
    isCancelled: () => false,
    reportNonFatal: () => undefined,
  });

  assert.equal(loaded, true);
  assert.ok(taskData instanceof Uint8Array);
  assert.notEqual(taskData, sourceBytes);
  assert.deepEqual(Array.from(taskData || []), Array.from(sourceBytes));
  assert.equal(sourceBytes.byteLength, 4);
});
