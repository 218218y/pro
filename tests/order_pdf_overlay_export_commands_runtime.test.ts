import test from 'node:test';
import assert from 'node:assert/strict';

import {
  exportOrderPdfImageWithDeps,
  exportOrderPdfInteractiveWithDeps,
  exportOrderPdfViaGmailWithDeps,
  loadOrderPdfIntoEditorWithDeps,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_export_commands.js';
import { getOrderPdfOverlayActionToast } from '../esm/native/ui/react/pdf/order_pdf_overlay_action_feedback.js';
import type { OrderPdfDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.js';

function createDraft(): OrderPdfDraft {
  return {
    projectName: 'פרויקט',
    orderNumber: '100',
    orderDate: '2026-03-27',
    deliveryAddress: '',
    phone: '',
    mobile: '',
    autoDetails: '',
    manualDetails: '',
    manualEnabled: false,
    notes: '',
    includeRenderSketch: true,
    includeOpenClosed: true,
  };
}

test('loadOrderPdfIntoEditorWithDeps returns success and persists cleaned draft data', async () => {
  const persisted: OrderPdfDraft[] = [];
  const pdfBytesRef = { current: null as Uint8Array | null };
  const loadedPdfOriginalBytesRef = { current: null as Uint8Array | null };
  const loadedPdfTailNonFormPageIndexesRef = { current: [] as number[] };
  let importedCount = -1;
  let sourceTick = 0;

  const result = await loadOrderPdfIntoEditorWithDeps({
    file: { name: 'order.pdf', type: 'application/pdf' } as File,
    draft: createDraft(),
    pdfImportApi: {
      readPdfFileBytes: async () => new Uint8Array([1, 2, 3]),
      detectTrailingImportedImagePages: async () => [4, 5],
      extractLoadedPdfDraftFields: async () => ({ projectName: 'נטען', orderNumber: '42' }),
      applyExtractedLoadedPdfDraft: draft => ({ ...draft!, projectName: 'נטען', orderNumber: '42' }),
      cleanPdfForEditorBackground: async bytes => Uint8Array.from([...bytes, 9]),
    },
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    setImportedPdfImagePageCount: value => {
      importedCount = typeof value === 'function' ? Number(value(importedCount)) : Number(value);
    },
    persistDraft: next => {
      persisted.push(next);
    },
    pdfBytesRef,
    setPdfSourceTick: value => {
      sourceTick = typeof value === 'function' ? Number(value(sourceTick)) : Number(value);
    },
    reportError: () => undefined,
  });

  assert.deepEqual(result, { ok: true, kind: 'load-pdf', fieldsFound: true });
  assert.equal(importedCount, 2);
  assert.equal(sourceTick, 1);
  assert.deepEqual(Array.from(loadedPdfOriginalBytesRef.current || []), [1, 2, 3]);
  assert.deepEqual(loadedPdfTailNonFormPageIndexesRef.current, [4, 5]);
  assert.deepEqual(Array.from(pdfBytesRef.current || []), [1, 2, 3, 9]);
  assert.equal(persisted[0]?.projectName, 'נטען');
  assert.deepEqual(getOrderPdfOverlayActionToast(result), { message: 'ה-PDF נטען לעריכה', kind: 'success' });
});

test('exportOrderPdfInteractiveWithDeps returns warning-style success when the browser blocks the download', async () => {
  const result = await exportOrderPdfInteractiveWithDeps({
    draft: createDraft(),
    buildInteractivePdfBlob: async () => ({ blob: new Blob(['pdf']), fileName: 'order.pdf' }),
    triggerBlobDownloadViaBrowser: () => false,
    docMaybe: null,
    winMaybe: null,
  });

  assert.deepEqual(result, { ok: true, kind: 'export-interactive', downloadStarted: false });
  assert.deepEqual(getOrderPdfOverlayActionToast(result), {
    message: 'לא הצלחתי להתחיל הורדה אוטומטית (הדפדפן חסם)',
    kind: 'warning',
  });
});

test('exportOrderPdfImageWithDeps reports busy before building another image PDF', async () => {
  const result = await exportOrderPdfImageWithDeps({
    draft: createDraft(),
    imagePdfBusy: true,
    buildImagePdfAttachmentFromDraft: async () => ({ blob: new Blob(['pdf']) }),
    triggerBlobDownloadViaBrowser: () => true,
    docMaybe: null,
    winMaybe: null,
  });

  assert.deepEqual(result, { ok: false, kind: 'export-image-pdf', reason: 'busy' });
  assert.deepEqual(getOrderPdfOverlayActionToast(result), {
    message: 'PDF כתמונה כבר נבנה כרגע',
    kind: 'info',
  });
});

test('exportOrderPdfViaGmailWithDeps keeps popup-blocked Gmail as a warning result instead of throwing', async () => {
  const result = await exportOrderPdfViaGmailWithDeps({
    draft: createDraft(),
    gmailBusy: false,
    gmailAction: async () => ({ opened: false, downloaded: true }),
    kind: 'export-download-gmail',
  });

  assert.deepEqual(result, {
    ok: true,
    kind: 'export-download-gmail',
    gmailOpened: false,
    downloadStarted: true,
  });
  assert.deepEqual(getOrderPdfOverlayActionToast(result), {
    message: 'הורדתי PDF אינטראקטיבי, אבל הדפדפן חסם פתיחת טיוטת Gmail',
    kind: 'warning',
  });
});

test('loadOrderPdfIntoEditorWithDeps preserves the real error detail for the toast', async () => {
  const reported: Array<{ op: string; error: unknown }> = [];
  const result = await loadOrderPdfIntoEditorWithDeps({
    file: { name: 'broken.pdf', type: 'application/pdf' } as File,
    draft: createDraft(),
    pdfImportApi: {
      readPdfFileBytes: async () => {
        throw new Error('pdf bytes exploded');
      },
      detectTrailingImportedImagePages: async () => [],
      extractLoadedPdfDraftFields: async () => ({}),
      applyExtractedLoadedPdfDraft: draft => draft!,
      cleanPdfForEditorBackground: async bytes => bytes,
    },
    loadedPdfOriginalBytesRef: { current: null as Uint8Array | null },
    loadedPdfTailNonFormPageIndexesRef: { current: [] as number[] },
    setImportedPdfImagePageCount: () => undefined,
    persistDraft: () => undefined,
    pdfBytesRef: { current: null as Uint8Array | null },
    setPdfSourceTick: () => undefined,
    reportError: (op, error) => {
      reported.push({ op, error });
    },
  });

  assert.deepEqual(result, { ok: false, kind: 'load-pdf', reason: 'error', detail: 'pdf bytes exploded' });
  assert.equal(reported.length, 1);
  assert.equal(reported[0]?.op, 'orderPdfLoad:command');
  assert.match(String((reported[0]?.error as Error)?.message || reported[0]?.error), /pdf bytes exploded/);
  assert.deepEqual(getOrderPdfOverlayActionToast(result), {
    message: 'טעינת PDF נכשלה: pdf bytes exploded',
    kind: 'error',
  });
});

test('exportOrderPdfInteractiveWithDeps preserves the real export failure detail', async () => {
  const result = await exportOrderPdfInteractiveWithDeps({
    draft: createDraft(),
    buildInteractivePdfBlob: async () => {
      throw new Error('interactive build exploded');
    },
    triggerBlobDownloadViaBrowser: () => true,
    docMaybe: null,
    winMaybe: null,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'export-interactive',
    reason: 'error',
    detail: 'interactive build exploded',
  });
  assert.deepEqual(getOrderPdfOverlayActionToast(result), {
    message: 'הורדת PDF נכשלה: interactive build exploded',
    kind: 'error',
  });
});

test('loadOrderPdfIntoEditorWithDeps treats html-only extracted legacy details as found fields', async () => {
  const persisted: OrderPdfDraft[] = [];
  const result = await loadOrderPdfIntoEditorWithDeps({
    file: { name: 'legacy.pdf', type: 'application/pdf' } as File,
    draft: createDraft(),
    pdfImportApi: {
      readPdfFileBytes: async () => new Uint8Array([7, 8, 9]),
      detectTrailingImportedImagePages: async () => [],
      extractLoadedPdfDraftFields: async () => ({ manualDetailsHtml: '<div>הערת legacy</div>' }),
      applyExtractedLoadedPdfDraft: draft => ({
        ...draft!,
        manualDetails: 'הערת legacy',
        manualEnabled: true,
      }),
      cleanPdfForEditorBackground: async bytes => bytes,
    },
    loadedPdfOriginalBytesRef: { current: null as Uint8Array | null },
    loadedPdfTailNonFormPageIndexesRef: { current: [] as number[] },
    setImportedPdfImagePageCount: () => undefined,
    persistDraft: next => {
      persisted.push(next);
    },
    pdfBytesRef: { current: null as Uint8Array | null },
    setPdfSourceTick: () => undefined,
    reportError: () => undefined,
  });

  assert.deepEqual(result, { ok: true, kind: 'load-pdf', fieldsFound: true });
  assert.equal(persisted[0]?.manualDetails, 'הערת legacy');
});

test('loadOrderPdfIntoEditorWithDeps does not partially commit refs or counters when cleanup fails late', async () => {
  const loadedPdfOriginalBytesRef = { current: Uint8Array.from([1, 1, 1]) as Uint8Array | null };
  const loadedPdfTailNonFormPageIndexesRef = { current: [9, 9] as number[] };
  const pdfBytesRef = { current: Uint8Array.from([2, 2, 2]) as Uint8Array | null };
  let importedCount = 5;
  let sourceTick = 11;
  const persisted: OrderPdfDraft[] = [];
  const reported: Array<{ op: string; error: unknown }> = [];

  const result = await loadOrderPdfIntoEditorWithDeps({
    file: { name: 'broken-cleanup.pdf', type: 'application/pdf' } as File,
    draft: createDraft(),
    pdfImportApi: {
      readPdfFileBytes: async () => new Uint8Array([3, 4, 5]),
      detectTrailingImportedImagePages: async () => [6],
      extractLoadedPdfDraftFields: async () => ({ projectName: 'חדש' }),
      applyExtractedLoadedPdfDraft: draft => ({ ...draft!, projectName: 'חדש' }),
      cleanPdfForEditorBackground: async () => {
        throw new Error('cleanup exploded');
      },
    },
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    setImportedPdfImagePageCount: value => {
      importedCount = typeof value === 'function' ? Number(value(importedCount)) : Number(value);
    },
    persistDraft: next => {
      persisted.push(next);
    },
    pdfBytesRef,
    setPdfSourceTick: value => {
      sourceTick = typeof value === 'function' ? Number(value(sourceTick)) : Number(value);
    },
    reportError: (op, error) => {
      reported.push({ op, error });
    },
  });

  assert.deepEqual(result, { ok: false, kind: 'load-pdf', reason: 'error', detail: 'cleanup exploded' });
  assert.deepEqual(Array.from(loadedPdfOriginalBytesRef.current || []), [1, 1, 1]);
  assert.deepEqual(loadedPdfTailNonFormPageIndexesRef.current, [9, 9]);
  assert.deepEqual(Array.from(pdfBytesRef.current || []), [2, 2, 2]);
  assert.equal(importedCount, 5);
  assert.equal(sourceTick, 11);
  assert.equal(persisted.length, 0);
  assert.equal(reported[0]?.op, 'orderPdfLoad:command');
});
