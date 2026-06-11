import type { PdfJsLibLike } from './order_pdf_overlay_contracts.js';
import type { EnsureOrderPdfJsCommandArgs } from './order_pdf_overlay_export_commands_types.js';

export async function ensureOrderPdfJsWithDeps(args: EnsureOrderPdfJsCommandArgs): Promise<PdfJsLibLike> {
  const { app, realWorkerUrl, pdfJsRef, ensureOrderPdfJs, reportNonFatal } = args;
  return await ensureOrderPdfJs({
    app,
    realWorkerUrl,
    pdfJsRef,
    reportNonFatal,
  });
}
