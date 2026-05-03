import type { MutableRefObject } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';

export type UseOrderPdfSketchPanelControllerArgs = {
  open: boolean;
  entries: OrderPdfSketchPreviewEntry[];
  draft: OrderPdfDraft | null;
  onAppendStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (
    key: OrderPdfSketchAnnotationPageKey,
    stroke: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClear: (key: OrderPdfSketchAnnotationPageKey) => void;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  shapeToolbarRef: MutableRefObject<HTMLDivElement | null>;
  drawPaletteRef: MutableRefObject<HTMLDivElement | null>;
  widthPaletteRef: MutableRefObject<HTMLDivElement | null>;
  colorPaletteRef: MutableRefObject<HTMLDivElement | null>;
};
