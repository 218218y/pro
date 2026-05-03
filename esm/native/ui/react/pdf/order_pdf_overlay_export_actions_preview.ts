import { useCallback } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchPreviewEntry,
  PdfJsLibLike,
} from './order_pdf_overlay_contracts.js';
import type { RuntimeApi } from './order_pdf_overlay_controller_shared.js';
import type { OrderPdfOverlayInteractivePdfBlobBuilder } from './order_pdf_overlay_export_actions_types.js';
import {
  buildOrderPdfSketchPreviewEntries,
  createOrderPdfSketchPreviewDraft,
} from './order_pdf_overlay_sketch_preview.js';

export function useOrderPdfOverlaySketchPreviewAction(args: {
  draft: OrderPdfDraft | null;
  buildInteractivePdfBlob: OrderPdfOverlayInteractivePdfBlobBuilder;
  ensurePdfJs: () => Promise<PdfJsLibLike>;
  docMaybe: Document | null;
  winMaybe: Window | null;
  canvasToPngBytes: Pick<RuntimeApi, 'canvasToPngBytes'>['canvasToPngBytes'];
}) {
  const { draft, buildInteractivePdfBlob, ensurePdfJs, docMaybe, winMaybe, canvasToPngBytes } = args;

  return useCallback(async (): Promise<OrderPdfSketchPreviewEntry[]> => {
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
}
