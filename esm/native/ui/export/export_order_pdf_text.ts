// Order-PDF draft/text/bidi helpers kept separate from capture + pdf-lib assembly.

import type { ExportOrderPdfDeps } from './export_order_pdf_types.js';
import { normalizeOrderPdfDraft as normalizeOrderPdfDraftBase } from './export_order_pdf_draft_normalize_runtime.js';
import { createOrderPdfTextDetailsOps } from './export_order_pdf_text_details.js';
import { createOrderPdfTextBidiOps } from './export_order_pdf_text_bidi.js';
import { createOrderPdfTextLayoutOps } from './export_order_pdf_text_layout.js';

import type { ExportOrderPdfTextOps } from './export_order_pdf_text_contracts.js';

export function createExportOrderPdfTextOps(deps: ExportOrderPdfDeps): ExportOrderPdfTextOps {
  const detailsOps = createOrderPdfTextDetailsOps(deps);
  const bidiOps = createOrderPdfTextBidiOps();
  const layoutOps = createOrderPdfTextLayoutOps();

  return {
    normalizeOrderPdfDraft: (value: unknown) => normalizeOrderPdfDraftBase(deps.asRecord, value),
    ...detailsOps,
    ...bidiOps,
    ...layoutOps,
  };
}
