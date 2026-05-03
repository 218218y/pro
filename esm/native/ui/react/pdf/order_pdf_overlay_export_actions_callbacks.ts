import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AppContainer } from '../../../../../types';

import type { OrderPdfDraft, OrderPdfOverlayActionResult } from './order_pdf_overlay_contracts.js';
import type { GmailApi, PdfImportApi, RuntimeApi } from './order_pdf_overlay_controller_shared.js';
import type {
  OrderPdfOverlayActionToastApplier,
  OrderPdfOverlayExportOps,
  OrderPdfOverlayGmailOps,
  OrderPdfOverlayInteractivePdfBlobBuilder,
} from './order_pdf_overlay_export_actions_types.js';
import {
  exportOrderPdfImageWithDeps,
  exportOrderPdfInteractiveWithDeps,
  exportOrderPdfViaGmailWithDeps,
  loadOrderPdfIntoEditorWithDeps,
} from './order_pdf_overlay_export_commands.js';
import {
  buildOrderPdfOverlayActionFlightKey,
  runOrderPdfOverlayActionSingleFlight,
} from './order_pdf_overlay_export_singleflight.js';
import { buildPerfEntryOptionsFromActionResult, runPerfAction } from '../../../services/api.js';

export function useOrderPdfOverlayExportActionCallbacks(args: {
  perfApp: AppContainer;
  app: unknown;
  draft: OrderPdfDraft | null;
  docMaybe: Document | null;
  winMaybe: Window | null;
  gmailBusy: boolean;
  imagePdfBusy: boolean;
  setGmailBusy: Dispatch<SetStateAction<boolean>>;
  setImagePdfBusy: Dispatch<SetStateAction<boolean>>;
  setImportedPdfImagePageCount: Dispatch<SetStateAction<number>>;
  setPdfSourceTick: Dispatch<SetStateAction<number>>;
  pdfBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfOriginalBytesRef: MutableRefObject<Uint8Array | null>;
  loadedPdfTailNonFormPageIndexesRef: MutableRefObject<number[]>;
  persistDraft: (next: OrderPdfDraft) => void;
  pdfImportApi: PdfImportApi;
  exportOps: OrderPdfOverlayExportOps;
  gmailOps: OrderPdfOverlayGmailOps;
  gmailApi: GmailApi;
  buildInteractivePdfBlob: OrderPdfOverlayInteractivePdfBlobBuilder;
  applyActionToast: OrderPdfOverlayActionToastApplier;
  reportNonFatal: Pick<RuntimeApi, 'orderPdfOverlayReportNonFatal'>['orderPdfOverlayReportNonFatal'];
}) {
  const {
    perfApp,
    app,
    draft,
    docMaybe,
    winMaybe,
    gmailBusy,
    imagePdfBusy,
    setGmailBusy,
    setImagePdfBusy,
    setImportedPdfImagePageCount,
    setPdfSourceTick,
    pdfBytesRef,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    persistDraft,
    pdfImportApi,
    exportOps,
    gmailOps,
    gmailApi,
    buildInteractivePdfBlob,
    applyActionToast,
    reportNonFatal,
  } = args;

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
                reportError: reportNonFatal,
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
      app,
      draft,
      pdfImportApi,
      loadedPdfOriginalBytesRef,
      loadedPdfTailNonFormPageIndexesRef,
      setImportedPdfImagePageCount,
      persistDraft,
      pdfBytesRef,
      setPdfSourceTick,
      reportNonFatal,
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

  return {
    loadPdfIntoEditor,
    exportInteractive,
    exportImagePdf,
    exportInteractiveToGmail,
    exportInteractiveDownloadAndGmail,
  };
}
