import type { OrderPdfDraftLike } from '../../../../types/build.js';
import type { PdfWidthFontLike } from './export_order_pdf_contracts_shared.js';
import type { createOrderPdfTextDetailsOps } from './export_order_pdf_text_details.js';
import type { createOrderPdfTextBidiOps } from './export_order_pdf_text_bidi.js';
import type { createOrderPdfTextLayoutOps } from './export_order_pdf_text_layout.js';

export type ExportOrderPdfTextOps = {
  normalizeOrderPdfDraft: (value: unknown) => OrderPdfDraftLike;
  buildOrderDetailsText: ReturnType<typeof createOrderPdfTextDetailsOps>['buildOrderDetailsText'];
  formatOrderDateDdMmYyyy: ReturnType<typeof createOrderPdfTextDetailsOps>['formatOrderDateDdMmYyyy'];
  getOrderPdfDraft: ReturnType<typeof createOrderPdfTextDetailsOps>['getOrderPdfDraft'];
  fixBidiForAcrobatText: ReturnType<typeof createOrderPdfTextBidiOps>['fixBidiForAcrobatText'];
  acrobatBidiFixFormatScript: ReturnType<typeof createOrderPdfTextBidiOps>['acrobatBidiFixFormatScript'];
  splitDirectionalRuns: ReturnType<typeof createOrderPdfTextBidiOps>['splitDirectionalRuns'];
  wrapTextToWidth: (text: string, font: PdfWidthFontLike, size: number, maxWidth: number) => string[];
  sanitizeFileNameForDownload: ReturnType<typeof createOrderPdfTextLayoutOps>['sanitizeFileNameForDownload'];
  buildOrderPdfFileName: ReturnType<typeof createOrderPdfTextLayoutOps>['buildOrderPdfFileName'];
};
