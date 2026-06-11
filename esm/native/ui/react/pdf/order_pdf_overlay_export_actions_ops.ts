import { useMemo } from 'react';

import type { ExportFactoryApi, GmailApi, RuntimeApi } from './order_pdf_overlay_controller_shared.js';
import type { OrderPdfOverlayInteractivePdfBlobBuilder } from './order_pdf_overlay_export_actions_types.js';
import type { PdfJsLibLike } from './order_pdf_overlay_contracts.js';

export function useOrderPdfOverlayExportOperationAdapters(args: {
  docMaybe: Document | null;
  winMaybe: Window | null;
  ensurePdfJs: () => Promise<PdfJsLibLike>;
  buildInteractivePdfBlob: OrderPdfOverlayInteractivePdfBlobBuilder;
  exportFactoryApi: ExportFactoryApi;
  gmailApi: GmailApi;
  runtimeApi: Pick<
    RuntimeApi,
    'canvasToPngBytes' | 'getFn' | 'getProp' | 'isPromiseLike' | 'isRecord' | 'orderPdfOverlayReportNonFatal'
  >;
}) {
  const { docMaybe, winMaybe, ensurePdfJs, buildInteractivePdfBlob, exportFactoryApi, gmailApi, runtimeApi } =
    args;
  const { canvasToPngBytes, getFn, getProp, isPromiseLike, isRecord, orderPdfOverlayReportNonFatal } =
    runtimeApi;

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

  return { exportOps, gmailOps };
}
