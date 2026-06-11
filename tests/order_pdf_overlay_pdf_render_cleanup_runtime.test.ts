import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanupOrderPdfLoadedDocument,
  loadOrderPdfFirstPage,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_pdf_render.ts';

test('cleanupOrderPdfLoadedDocument clears loaded page/doc state so a strict remount can reload cleanly', () => {
  let renderCancelled = 0;
  let taskDestroyed = 0;
  let docDestroyed = 0;

  const pdfRenderTaskRef = {
    current: {
      promise: Promise.resolve(),
      cancel: () => {
        renderCancelled += 1;
      },
    },
  };
  const pdfDocTaskRef = {
    current: {
      promise: Promise.resolve(),
      destroy: () => {
        taskDestroyed += 1;
      },
    },
  };
  const pdfDocRef = {
    current: {
      destroy: () => {
        docDestroyed += 1;
      },
    },
  };
  const pageRef = {
    current: { getViewport: () => ({ width: 1, height: 1 }), render: () => ({ promise: Promise.resolve() }) },
  };
  const pageSizeRef = { current: { w: 595, h: 842 } };
  const lastLoadedPdfTickRef = { current: 7 };

  cleanupOrderPdfLoadedDocument({
    pdfRenderTaskRef,
    pdfDocTaskRef,
    pdfDocRef,
    pageRef,
    pageSizeRef,
    lastLoadedPdfTickRef,
    reportNonFatal: () => undefined,
  });

  assert.equal(renderCancelled, 1);
  assert.equal(taskDestroyed, 1);
  assert.equal(docDestroyed, 1);
  assert.equal(pdfRenderTaskRef.current, null);
  assert.equal(pdfDocTaskRef.current, null);
  assert.equal(pdfDocRef.current, null);
  assert.equal(pageRef.current, null);
  assert.equal(pageSizeRef.current, null);
  assert.equal(lastLoadedPdfTickRef.current, -1);
});

test('loadOrderPdfFirstPage reloads when a stale page tick exists without a live pdf document', async () => {
  let getDocumentCalls = 0;
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
        getDocument: () => {
          getDocumentCalls += 1;
          return {
            promise: Promise.resolve(mockDoc),
            destroy: () => undefined,
          };
        },
      }) as any,
    pdfBytesRef: { current: new Uint8Array([1, 2, 3]) },
    pdfSourceTick: 7,
    lastLoadedPdfTickRef: { current: 7 },
    pdfRenderTaskRef: { current: null },
    pdfDocTaskRef: { current: null },
    pdfDocRef: { current: null },
    pageRef: { current: mockPage as any },
    pageSizeRef: { current: { w: 1, h: 1 } },
    isCancelled: () => false,
    reportNonFatal: () => undefined,
  });

  assert.equal(loaded, true);
  assert.equal(getDocumentCalls, 1);
});

test('loadOrderPdfFirstPage clears doc/task refs when cancellation arrives after the first page resolves', async () => {
  let docTaskDestroyed = 0;
  let docDestroyed = 0;
  let cancelChecks = 0;
  const mockPage = {
    view: [0, 0, 595, 842],
    getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
    render: () => ({ promise: Promise.resolve() }),
  };
  const mockDoc = {
    destroy: () => {
      docDestroyed += 1;
    },
    getPage: async () => mockPage,
  };
  const pdfDocTaskRef = {
    current: null as any,
  };
  const pdfDocRef = {
    current: null as any,
  };
  const pageRef = {
    current: null as any,
  };
  const pageSizeRef = {
    current: null as { w: number; h: number } | null,
  };

  const loaded = await loadOrderPdfFirstPage({
    ensurePdfJs: async () =>
      ({
        VerbosityLevel: { ERRORS: 0 },
        getDocument: () => ({
          promise: Promise.resolve(mockDoc),
          destroy: () => {
            docTaskDestroyed += 1;
          },
        }),
      }) as any,
    pdfBytesRef: { current: new Uint8Array([1, 2, 3]) },
    pdfSourceTick: 9,
    lastLoadedPdfTickRef: { current: -1 },
    pdfRenderTaskRef: { current: null },
    pdfDocTaskRef,
    pdfDocRef,
    pageRef,
    pageSizeRef,
    isCancelled: () => (cancelChecks += 1) >= 2,
    reportNonFatal: () => undefined,
  });

  assert.equal(loaded, false);
  assert.equal(docTaskDestroyed, 1);
  assert.equal(docDestroyed, 1);
  assert.equal(pdfDocTaskRef.current, null);
  assert.equal(pdfDocRef.current, null);
  assert.equal(pageRef.current, null);
  assert.equal(pageSizeRef.current, null);
});
