import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { useOrderPdfOverlayExportActions } from '../esm/native/ui/react/pdf/order_pdf_overlay_export_actions.js';
import { useOrderPdfOverlayInteractionHandlers } from '../esm/native/ui/react/pdf/order_pdf_overlay_interaction_handlers.js';
import type { OrderPdfDraft } from '../esm/native/ui/react/pdf/order_pdf_overlay_contracts.js';

function renderHookValue<T>(useValue: () => T): T {
  let value: T | null = null;

  function Harness() {
    value = useValue();
    return React.createElement('div');
  }

  renderToStaticMarkup(React.createElement(Harness));
  assert.notEqual(value, null);
  return value as T;
}

function createDraft(): OrderPdfDraft {
  return {
    projectName: 'פרויקט',
    orderNumber: '200',
    orderDate: '2026-04-07',
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

test('order pdf export actions honor image/gmail busy flags before starting another action', async () => {
  const toasts: Array<{ message: string; kind?: string }> = [];
  const imageBusyTransitions: boolean[] = [];
  const gmailBusyTransitions: boolean[] = [];
  let imageBuildCalls = 0;
  let gmailActionCalls = 0;

  const actions = renderHookValue(() =>
    useOrderPdfOverlayExportActions({
      env: {
        app: { id: 'app-export-busy' } as any,
        fb: {
          toast: (message: string, kind?: string) => {
            toasts.push({ message, kind });
          },
        },
        docMaybe: null,
        winMaybe: null,
        pdfJsRealWorkerUrl: '/pdf.worker.js',
      },
      draft: createDraft(),
      gmailBusy: true,
      imagePdfBusy: true,
      setGmailBusy: value => {
        gmailBusyTransitions.push(typeof value === 'function' ? Boolean(value(false)) : Boolean(value));
      },
      setImagePdfBusy: value => {
        imageBusyTransitions.push(typeof value === 'function' ? Boolean(value(false)) : Boolean(value));
      },
      setImportedPdfImagePageCount: () => undefined,
      pdfSourceTick: 1,
      setPdfSourceTick: () => undefined,
      pdfJsRef: { current: null },
      pdfBytesRef: { current: null },
      loadedPdfOriginalBytesRef: { current: null },
      loadedPdfTailNonFormPageIndexesRef: { current: [] },
      persistDraft: () => undefined,
      pdfImportApi: {
        buildInteractivePdfBlobForEditorDraft: async () => ({
          blob: new Blob(['pdf']),
          fileName: 'order.pdf',
          projectName: 'proj',
        }),
        readPdfFileBytes: async () => new Uint8Array(),
        detectTrailingImportedImagePages: async () => [],
        extractLoadedPdfDraftFields: async () => ({}),
        applyExtractedLoadedPdfDraft: draft => draft!,
        cleanPdfForEditorBackground: async bytes => bytes,
      },
      pdfRenderApi: {
        ensureOrderPdfJs: async () => ({}) as any,
      },
      exportFactoryApi: {
        createOrderPdfOverlayExportOps: () => ({
          buildImagePdfAttachmentFromDraft: async () => {
            imageBuildCalls += 1;
            return { blob: new Blob(['pdf']) };
          },
          rasterizeInteractivePdfBytesToImagePdfBytes: async () => new Uint8Array([1]),
        }),
        createOrderPdfOverlayGmailOps: () => ({
          exportInteractiveToGmail: async () => {
            gmailActionCalls += 1;
            return { opened: true, downloaded: false };
          },
          exportInteractiveDownloadAndGmail: async () => {
            gmailActionCalls += 1;
            return { opened: true, downloaded: true };
          },
        }),
      },
      gmailApi: {
        applyTemplate: () => '',
        subjectTemplate: '',
        bodyTemplate: '',
        triggerBlobDownloadViaBrowser: () => true,
      },
      runtimeApi: {
        canvasToPngBytes: async () => new Uint8Array([1]),
        getFn: () => null,
        getProp: () => undefined,
        isPromiseLike: value => Boolean(value && typeof (value as PromiseLike<unknown>).then === 'function'),
        isRecord: value => Boolean(value && typeof value === 'object'),
        orderPdfOverlayReportNonFatal: () => undefined,
      },
    })
  );

  assert.deepEqual(await actions.exportImagePdf(), { ok: false, kind: 'export-image-pdf', reason: 'busy' });
  assert.deepEqual(await actions.exportInteractiveToGmail(), {
    ok: false,
    kind: 'export-gmail',
    reason: 'busy',
  });
  assert.deepEqual(await actions.exportInteractiveDownloadAndGmail(), {
    ok: false,
    kind: 'export-download-gmail',
    reason: 'busy',
  });

  assert.equal(imageBuildCalls, 0);
  assert.equal(gmailActionCalls, 0);
  assert.deepEqual(imageBusyTransitions, []);
  assert.deepEqual(gmailBusyTransitions, []);
  assert.deepEqual(
    toasts.map(({ message, kind }) => ({ message, kind })),
    [
      { message: 'PDF כתמונה כבר נבנה כרגע', kind: 'info' },
      { message: 'שליחה ל-Gmail כבר מתבצעת כרגע', kind: 'info' },
      { message: 'שליחה ל-Gmail כבר מתבצעת כרגע', kind: 'info' },
    ]
  );
});

test('order pdf interaction handlers report pointer-cancel failures instead of throwing', () => {
  const reported: Array<{ op: string; error: unknown }> = [];

  const handlers = renderHookValue(() =>
    useOrderPdfOverlayInteractionHandlers({
      interactionApi: {
        captureStagePointerDown: () => undefined,
        captureStagePointerMove: () => undefined,
        createInitialStageGesture: () => ({ id: 'gesture' }) as any,
        finishStagePointerUp: () => false,
        loadPdfFileFromDrop: async () => undefined,
        loadPdfFileFromInput: async () => undefined,
        preventStageDragEvent: () => undefined,
        resetStageGesture: () => {
          throw new Error('cancel exploded');
        },
      },
      runtimeApi: {
        orderPdfOverlayReportNonFatal: (op, error) => {
          reported.push({ op, error });
        },
      },
      fb: { toast: () => undefined },
      loadPdfIntoEditor: async () => undefined,
      close: () => undefined,
      dragOver: false,
      setDragOver: () => undefined,
      pdfFileInputRef: { current: null },
    })
  );

  assert.doesNotThrow(() => {
    handlers.onStagePointerCancelCapture();
  });
  assert.equal(reported.length, 1);
  assert.equal(reported[0]?.op, 'orderPdfStage:pointerCancel');
  assert.match(String((reported[0]?.error as Error)?.message || reported[0]?.error), /cancel exploded/);
});

test('order pdf export actions reuse cached interactive blob while draft signature is unchanged', async () => {
  let buildCalls = 0;
  const downloads: string[] = [];

  const actions = renderHookValue(() =>
    useOrderPdfOverlayExportActions({
      env: {
        app: { id: 'app-export-cache' } as any,
        fb: { toast: () => undefined },
        docMaybe: null,
        winMaybe: null,
        pdfJsRealWorkerUrl: '/pdf.worker.js',
      },
      draft: createDraft(),
      gmailBusy: false,
      imagePdfBusy: false,
      setGmailBusy: () => undefined,
      setImagePdfBusy: () => undefined,
      setImportedPdfImagePageCount: () => undefined,
      pdfSourceTick: 7,
      setPdfSourceTick: () => undefined,
      pdfJsRef: { current: null },
      pdfBytesRef: { current: null },
      loadedPdfOriginalBytesRef: { current: null },
      loadedPdfTailNonFormPageIndexesRef: { current: [] },
      persistDraft: () => undefined,
      pdfImportApi: {
        buildInteractivePdfBlobForEditorDraft: async () => {
          buildCalls += 1;
          return {
            blob: new Blob([`pdf-${buildCalls}`]),
            fileName: 'order.pdf',
            projectName: 'proj',
          };
        },
        readPdfFileBytes: async () => new Uint8Array(),
        detectTrailingImportedImagePages: async () => [],
        extractLoadedPdfDraftFields: async () => ({}),
        applyExtractedLoadedPdfDraft: draft => draft!,
        cleanPdfForEditorBackground: async bytes => bytes,
      },
      pdfRenderApi: {
        ensureOrderPdfJs: async () => ({}) as any,
      },
      exportFactoryApi: {
        createOrderPdfOverlayExportOps: () => ({
          buildImagePdfAttachmentFromDraft: async draft => {
            throw new Error(`unexpected image build for ${draft.projectName}`);
          },
          rasterizeInteractivePdfBytesToImagePdfBytes: async () => {
            throw new Error('unexpected rasterize');
          },
        }),
        createOrderPdfOverlayGmailOps: () => ({
          exportInteractiveToGmail: async () => ({ opened: true, downloaded: false }),
          exportInteractiveDownloadAndGmail: async () => ({ opened: true, downloaded: true }),
        }),
      },
      gmailApi: {
        applyTemplate: () => '',
        subjectTemplate: '',
        bodyTemplate: '',
        triggerBlobDownloadViaBrowser: (_ctx, _blob, fileName) => {
          downloads.push(fileName);
          return true;
        },
      },
      runtimeApi: {
        canvasToPngBytes: async () => new Uint8Array([1]),
        getFn: () => null,
        getProp: () => undefined,
        isPromiseLike: value => Boolean(value && typeof (value as PromiseLike<unknown>).then === 'function'),
        isRecord: value => Boolean(value && typeof value === 'object'),
        orderPdfOverlayReportNonFatal: () => undefined,
      },
    })
  );

  assert.deepEqual(await actions.exportInteractive(), {
    ok: true,
    kind: 'export-interactive',
    downloadStarted: true,
  });
  assert.deepEqual(await actions.exportInteractive(), {
    ok: true,
    kind: 'export-interactive',
    downloadStarted: true,
  });

  assert.equal(buildCalls, 1);
  assert.deepEqual(downloads, ['order.pdf', 'order.pdf']);
});
