import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import type { PdfJsLibLike } from './order_pdf_overlay_contracts.js';
import type { PdfRenderApi, RuntimeApi } from './order_pdf_overlay_controller_shared.js';
import { ensureOrderPdfJsWithDeps } from './order_pdf_overlay_export_commands.js';

export function useOrderPdfOverlayPdfJsLoader(args: {
  app: unknown;
  realWorkerUrl: string;
  pdfJsRef: MutableRefObject<PdfJsLibLike | null>;
  ensureOrderPdfJs: Pick<PdfRenderApi, 'ensureOrderPdfJs'>['ensureOrderPdfJs'];
  reportNonFatal: Pick<RuntimeApi, 'orderPdfOverlayReportNonFatal'>['orderPdfOverlayReportNonFatal'];
}) {
  const { app, realWorkerUrl, pdfJsRef, ensureOrderPdfJs, reportNonFatal } = args;

  return useCallback(async () => {
    return await ensureOrderPdfJsWithDeps({
      app,
      realWorkerUrl,
      pdfJsRef,
      ensureOrderPdfJs,
      reportNonFatal,
    });
  }, [app, realWorkerUrl, pdfJsRef, ensureOrderPdfJs, reportNonFatal]);
}
