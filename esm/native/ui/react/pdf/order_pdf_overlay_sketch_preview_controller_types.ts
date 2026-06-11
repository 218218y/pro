import type { AppContainer } from '../../../../../types/app.js';
import type { OrderPdfDraft, OrderPdfSketchPreviewEntry } from './order_pdf_overlay_contracts.js';

export type BuildSketchPreview = () => Promise<OrderPdfSketchPreviewEntry[]>;

export type UseOrderPdfOverlaySketchPreviewArgs = {
  app: AppContainer;
  open: boolean;
  draft: OrderPdfDraft | null;
  pdfSourceTick: number;
  docMaybe: Document | null;
  winMaybe: Window | null;
  buildSketchPreview: BuildSketchPreview;
};

export type OrderPdfOverlaySketchPreviewController = {
  sketchPreviewOpen: boolean;
  sketchPreviewBusy: boolean;
  sketchPreviewError: string | null;
  sketchPreviewEntries: OrderPdfSketchPreviewEntry[];
  toggleSketchPreview: () => void;
  refreshSketchPreview: () => Promise<void>;
};
