import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';

export type OrderPdfOverlaySketchPanelProps = {
  open: boolean;
  busy: boolean;
  error: string | null;
  entries: OrderPdfSketchPreviewEntry[];
  draft: OrderPdfDraft | null;
  onRefresh: () => void;
  onAppendStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (
    key: OrderPdfSketchAnnotationPageKey,
    stroke: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClear: (key: OrderPdfSketchAnnotationPageKey) => void;
};
