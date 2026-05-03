import type { OrderPdfDraft } from './order_pdf_overlay_contracts.js';

export function createOrderPdfSketchPreviewDraft(draft: OrderPdfDraft): OrderPdfDraft {
  if (!draft?.sketchAnnotations) return draft;
  return {
    ...draft,
    sketchAnnotations: undefined,
  };
}
