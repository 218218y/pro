import { useCallback } from 'react';

import type { OrderPdfOverlayActionResult } from './order_pdf_overlay_contracts.js';
import { getOrderPdfOverlayActionToast } from './order_pdf_overlay_action_feedback.js';
import { useOrderPdfOverlayExportActionCallbacks } from './order_pdf_overlay_export_actions_callbacks.js';
import { useOrderPdfOverlayInteractivePdfBlobBuilder } from './order_pdf_overlay_export_actions_interactive_blob.js';
import { useOrderPdfOverlayExportOperationAdapters } from './order_pdf_overlay_export_actions_ops.js';
import { useOrderPdfOverlayPdfJsLoader } from './order_pdf_overlay_export_actions_pdfjs.js';
import { useOrderPdfOverlaySketchPreviewAction } from './order_pdf_overlay_export_actions_preview.js';
import type {
  OrderPdfOverlayExportActionsApi,
  OrderPdfOverlayExportActionsArgs,
} from './order_pdf_overlay_export_actions_types.js';
import { assertApp } from '../../../services/api.js';

export function useOrderPdfOverlayExportActions(
  args: OrderPdfOverlayExportActionsArgs
): OrderPdfOverlayExportActionsApi {
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

  const { canvasToPngBytes, orderPdfOverlayReportNonFatal } = runtimeApi;
  const perfApp = assertApp(app, 'ui/react/order_pdf_overlay_export_actions');

  const applyActionToast = useCallback(
    (result: OrderPdfOverlayActionResult) => {
      const toast = getOrderPdfOverlayActionToast(result);
      if (toast && toast.message) fb.toast(toast.message, toast.kind);
      return result;
    },
    [fb]
  );

  const ensurePdfJs = useOrderPdfOverlayPdfJsLoader({
    app,
    realWorkerUrl: pdfJsRealWorkerUrl,
    pdfJsRef,
    ensureOrderPdfJs,
    reportNonFatal: orderPdfOverlayReportNonFatal,
  });
  const buildInteractivePdfBlob = useOrderPdfOverlayInteractivePdfBlobBuilder({
    app,
    winMaybe,
    draft,
    pdfSourceTick,
    loadedPdfOriginalBytesRef,
    loadedPdfTailNonFormPageIndexesRef,
    pdfImportApi,
  });
  const { exportOps, gmailOps } = useOrderPdfOverlayExportOperationAdapters({
    docMaybe,
    winMaybe,
    ensurePdfJs,
    buildInteractivePdfBlob,
    exportFactoryApi,
    gmailApi,
    runtimeApi,
  });
  const actionCallbacks = useOrderPdfOverlayExportActionCallbacks({
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
    reportNonFatal: orderPdfOverlayReportNonFatal,
  });
  const buildSketchPreview = useOrderPdfOverlaySketchPreviewAction({
    draft,
    buildInteractivePdfBlob,
    ensurePdfJs,
    docMaybe,
    winMaybe,
    canvasToPngBytes,
  });

  return {
    ensurePdfJs,
    ...actionCallbacks,
    buildSketchPreview,
  };
}
