import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfOverlayActionResult,
  PdfJsLibLike,
} from './order_pdf_overlay_contracts.js';
import { getOrderPdfOverlayActionToast } from './order_pdf_overlay_action_feedback.js';
import {
  ensureOrderPdfJsWithDeps,
  exportOrderPdfImageWithDeps,
  exportOrderPdfInteractiveWithDeps,
  exportOrderPdfViaGmailWithDeps,
  loadOrderPdfIntoEditorWithDeps,
} from './order_pdf_overlay_export_commands.js';
import {
  buildOrderPdfOverlayActionFlightKey,
  runOrderPdfOverlayActionSingleFlight,
} from './order_pdf_overlay_export_singleflight.js';
import {
  buildOrderPdfSketchPreviewEntries,
  createOrderPdfSketchPreviewDraft,
} from './order_pdf_overlay_sketch_preview.js';
import {
  buildOrderPdfSketchPreviewBlobCacheSignature,
  clearOrderPdfSketchPreviewBlobCache,
  readOrderPdfSketchPreviewBlobCache,
  writeOrderPdfSketchPreviewBlobCache,
} from './order_pdf_overlay_sketch_preview_blob_cache.js';
import type {
  ExportFactoryApi,
  GmailApi,
  OrderPdfOverlayControllerEnv,
  PdfImportApi,
  PdfRenderApi,
  RuntimeApi,
} from './order_pdf_overlay_controller_shared.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../../services/api.js';
import { assertApp } from '../../../services/api.js';

export function useOrderPdfOverlayExportActions(args: {
  env: Pick<OrderPdfOverlayControllerEnv, 'app' | 'fb' | 'docMaybe' | 'winMaybe' | 'pdfJsRealWorkerUrl'>;
  draft: OrderPdfDraft | null;
  gmailBusy: boolean;
  imagePdfBusy: boolean;
  setGmailBusy: Dispatch<SetStateAction<boolean>>;
  setImagePdfBusy: Dispatch<SetStateAction<boolean>>;
  setImportedPdfImagePageCount: Dispatch<SetStateAction<number>>;
  pdfSourceTick: number;
  setPdfSourceTick: Dispatch<SetStateAction<number>>;
  pdfJsRef: MutableRefObject<PdfJsLibLike | null>;
  pdfBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfOriginalBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfTailNonFormPageIndexesRef: MutableRefObject<number[]>;
  persistDraft: (next: OrderPdfDraft) => void;
  pdfImportApi: PdfImportApi;
  pdfRenderApi: Pick<PdfRenderApi, 'ensureOrderPdfJs'>;
  exportFactoryApi: ExportFactoryApi;
  gmailApi: GmailApi;
  runtimeApi: Pick<
    RuntimeApi,
    'canvasToPngBytes' | 'getFn' | 'getProp' | 'isPromiseLike' | 'isRecord' | 'orderPdfOverlayReportNonFatal'
  >;
}) {
  const {
    env: { app, fb, docMaybe, winMaybe, pdfJsRealWorkerUrl },
    draft,
    gmailBusy,
    imagePdfBusy,
    setGmailBusy,
    setImagePdfBusy,
    setImportedPdfImagePageCount,
    pdfSourceTick,
    setPdfSourceTick,
    pdfJsRef,
    pdfBytesRef,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    persistDraft,
    pdfImportApi,
    pdfRenderApi: { ensureOrderPdfJs },
    exportFactoryApi,
    gmailApi,
    runtimeApi,
  } = args;

  const { canvasToPngBytes, getFn, getProp, isPromiseLike, isRecord, orderPdfOverlayReportNonFatal } =
    runtimeApi;
  const perfApp = assertApp(app, 'ui/react/order_pdf_overlay_export_actions');

  const previewBlobCacheRef = useRef<{
    signature: string;
    blob: Blob;
    fileName: string;
    projectName: string;
  } | null>(null);

  useEffect(() => {
    if (draft) return;
    clearOrderPdfSketchPreviewBlobCache(previewBlobCacheRef);
  }, [draft]);

  const applyActionToast = useCallback(
    (result: OrderPdfOverlayActionResult) => {
      const toast = getOrderPdfOverlayActionToast(result);
      if (toast && toast.message) fb.toast(toast.message, toast.kind);
      return result;
    },
    [fb]
  );

  const ensurePdfJs = useCallback(async () => {
    return await ensureOrderPdfJsWithDeps({
      app,
      realWorkerUrl: pdfJsRealWorkerUrl,
      pdfJsRef,
      ensureOrderPdfJs,
      reportNonFatal: orderPdfOverlayReportNonFatal,
    });
  }, [app, pdfJsRealWorkerUrl, pdfJsRef, ensureOrderPdfJs, orderPdfOverlayReportNonFatal]);

  const buildInteractivePdfBlob = useCallback(
    async (nextDraft: OrderPdfDraft): Promise<{ blob: Blob; fileName: string; projectName: string }> => {
      const signature = buildOrderPdfSketchPreviewBlobCacheSignature({
        draft: nextDraft,
        pdfSourceTick,
        importedTailIndexes: loadedPdfTailNonFormPageIndexesRef.current || [],
        loadedPdfOriginalBytes: loadedPdfOriginalBytesRef.current,
      });
      const cached = readOrderPdfSketchPreviewBlobCache(previewBlobCacheRef, signature);
      if (cached) {
        return { blob: cached.blob, fileName: cached.fileName, projectName: cached.projectName };
      }

      const built = await pdfImportApi.buildInteractivePdfBlobForEditorDraft({
        app,
        winMaybe,
        draft: nextDraft,
        loadedPdfOriginalBytes: loadedPdfOriginalBytesRef.current,
        importedTailIndexes: loadedPdfTailNonFormPageIndexesRef.current || [],
      });

      writeOrderPdfSketchPreviewBlobCache(previewBlobCacheRef, {
        signature,
        blob: built.blob,
        fileName: built.fileName,
        projectName: built.projectName,
      });
      return built;
    },
    [
      app,
      winMaybe,
      pdfSourceTick,
      loadedPdfOriginalBytesRef,
      loadedPdfTailNonFormPageIndexesRef,
      pdfImportApi,
    ]
  );

  const exportOps = useMemo(
    () =>
      exportFactoryApi.createOrderPdfOverlayExportOps({
        docMaybe,
        winMaybe,
        ensurePdfJs,
        _buildInteractivePdfBlobForEditorDraft: buildInteractivePdfBlob,
        getFn,
        getProp,
        isPromiseLike,
        isRecord,
        orderPdfOverlayReportNonFatal,
        canvasToPngBytes,
      }),
    [
      docMaybe,
      winMaybe,
      ensurePdfJs,
      buildInteractivePdfBlob,
      exportFactoryApi,
      getFn,
      getProp,
      isPromiseLike,
      isRecord,
      orderPdfOverlayReportNonFatal,
      canvasToPngBytes,
    ]
  );

  const gmailOps = useMemo(
    () =>
      exportFactoryApi.createOrderPdfOverlayGmailOps({
        docMaybe,
        winMaybe,
        applyTemplate: gmailApi.applyTemplate,
        subjectTemplate: gmailApi.subjectTemplate,
        bodyTemplate: gmailApi.bodyTemplate,
        buildImagePdfAttachmentFromDraft: exportOps.buildImagePdfAttachmentFromDraft,
        buildInteractivePdfBlobForEditorDraft: buildInteractivePdfBlob,
        rasterizeInteractivePdfBytesToImagePdfBytes: exportOps.rasterizeInteractivePdfBytesToImagePdfBytes,
        triggerBlobDownloadViaBrowser: gmailApi.triggerBlobDownloadViaBrowser,
      }),
    [docMaybe, winMaybe, gmailApi, exportOps, buildInteractivePdfBlob, exportFactoryApi]
  );

  const loadPdfIntoEditor = useCallback(
    async (file: File): Promise<OrderPdfOverlayActionResult> => {
      return await runPerfAction(
        perfApp,
        'orderPdf.loadPdf',
        async () => {
          const actionKey = buildOrderPdfOverlayActionFlightKey({ kind: 'load-pdf', file });
          if (!actionKey) return applyActionToast({ ok: false, kind: 'load-pdf', reason: 'invalid-file' });
          return await runOrderPdfOverlayActionSingleFlight({
            app,
            key: actionKey,
            run: async () => {
              const result = await loadOrderPdfIntoEditorWithDeps({
                file,
                draft,
                pdfImportApi,
                loadedPdfOriginalBytesRef,
                loadedPdfTailNonFormPageIndexesRef,
                setImportedPdfImagePageCount,
                persistDraft,
                pdfBytesRef,
                setPdfSourceTick,
                reportError: orderPdfOverlayReportNonFatal,
              });
              return applyActionToast(result);
            },
          });
        },
        {
          detail: { name: file?.name || '' },
          resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
        }
      );
    },
    [
      perfApp,
      draft,
      pdfImportApi,
      loadedPdfOriginalBytesRef,
      loadedPdfTailNonFormPageIndexesRef,
      setImportedPdfImagePageCount,
      persistDraft,
      pdfBytesRef,
      setPdfSourceTick,
      orderPdfOverlayReportNonFatal,
      applyActionToast,
    ]
  );

  const exportInteractive = useCallback(async (): Promise<OrderPdfOverlayActionResult> => {
    return await runPerfAction(
      perfApp,
      'orderPdf.exportInteractive',
      () =>
        runOrderPdfOverlayActionSingleFlight({
          app,
          key: 'export-interactive',
          run: async () => {
            const result = await exportOrderPdfInteractiveWithDeps({
              draft,
              buildInteractivePdfBlob,
              triggerBlobDownloadViaBrowser: gmailApi.triggerBlobDownloadViaBrowser,
              docMaybe,
              winMaybe,
            });
            return applyActionToast(result);
          },
        }),
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [perfApp, app, draft, buildInteractivePdfBlob, gmailApi, docMaybe, winMaybe, applyActionToast]);

  const exportImagePdf = useCallback(async (): Promise<OrderPdfOverlayActionResult> => {
    return await runPerfAction(
      perfApp,
      'orderPdf.exportImagePdf',
      async () => {
        if (imagePdfBusy) return applyActionToast({ ok: false, kind: 'export-image-pdf', reason: 'busy' });
        return await runOrderPdfOverlayActionSingleFlight({
          app,
          key: 'export-image-pdf',
          run: async () => {
            if (!draft) return applyActionToast({ ok: false, kind: 'export-image-pdf', reason: 'not-ready' });
            setImagePdfBusy(true);
            try {
              const result = await exportOrderPdfImageWithDeps({
                draft,
                imagePdfBusy,
                buildImagePdfAttachmentFromDraft: exportOps.buildImagePdfAttachmentFromDraft,
                triggerBlobDownloadViaBrowser: gmailApi.triggerBlobDownloadViaBrowser,
                docMaybe,
                winMaybe,
              });
              return applyActionToast(result);
            } finally {
              setImagePdfBusy(false);
            }
          },
        });
      },
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [
    perfApp,
    app,
    draft,
    imagePdfBusy,
    setImagePdfBusy,
    exportOps,
    gmailApi,
    docMaybe,
    winMaybe,
    applyActionToast,
  ]);

  const exportInteractiveToGmail = useCallback(async (): Promise<OrderPdfOverlayActionResult> => {
    return await runPerfAction(
      perfApp,
      'orderPdf.exportGmail',
      async () => {
        if (gmailBusy) return applyActionToast({ ok: false, kind: 'export-gmail', reason: 'busy' });
        return await runOrderPdfOverlayActionSingleFlight({
          app,
          key: 'export-gmail',
          run: async () => {
            if (!draft) return applyActionToast({ ok: false, kind: 'export-gmail', reason: 'not-ready' });
            setGmailBusy(true);
            try {
              const result = await exportOrderPdfViaGmailWithDeps({
                draft,
                gmailBusy,
                gmailAction: gmailOps.exportInteractiveToGmail,
                kind: 'export-gmail',
              });
              return applyActionToast(result);
            } finally {
              setGmailBusy(false);
            }
          },
        });
      },
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [perfApp, app, draft, gmailBusy, setGmailBusy, gmailOps, applyActionToast]);

  const exportInteractiveDownloadAndGmail = useCallback(async (): Promise<OrderPdfOverlayActionResult> => {
    return await runPerfAction(
      perfApp,
      'orderPdf.exportDownloadGmail',
      async () => {
        if (gmailBusy) return applyActionToast({ ok: false, kind: 'export-download-gmail', reason: 'busy' });
        return await runOrderPdfOverlayActionSingleFlight({
          app,
          key: 'export-download-gmail',
          run: async () => {
            if (!draft)
              return applyActionToast({ ok: false, kind: 'export-download-gmail', reason: 'not-ready' });
            setGmailBusy(true);
            try {
              const result = await exportOrderPdfViaGmailWithDeps({
                draft,
                gmailBusy,
                gmailAction: gmailOps.exportInteractiveDownloadAndGmail,
                kind: 'export-download-gmail',
              });
              return applyActionToast(result);
            } finally {
              setGmailBusy(false);
            }
          },
        });
      },
      {
        resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
      }
    );
  }, [perfApp, app, draft, gmailBusy, setGmailBusy, gmailOps, applyActionToast]);

  const buildSketchPreview = useCallback(async (): Promise<
    import('./order_pdf_overlay_contracts.js').OrderPdfSketchPreviewEntry[]
  > => {
    if (!draft) return [];
    return await buildOrderPdfSketchPreviewEntries({
      draft: createOrderPdfSketchPreviewDraft(draft),
      buildInteractivePdfBlob,
      ensurePdfJs,
      docMaybe,
      winMaybe,
      canvasToPngBytes,
    });
  }, [draft, buildInteractivePdfBlob, ensurePdfJs, docMaybe, winMaybe, canvasToPngBytes]);

  return {
    ensurePdfJs,
    loadPdfIntoEditor,
    exportInteractive,
    exportImagePdf,
    exportInteractiveToGmail,
    exportInteractiveDownloadAndGmail,
    buildSketchPreview,
  };
}
