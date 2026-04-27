import { useRef } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import { useOrderPdfSketchPanelController } from './order_pdf_overlay_sketch_panel_controller.js';
import type { OrderPdfSketchCardDrawConfig } from './order_pdf_overlay_sketch_card_runtime.js';

type OrderPdfSketchPanelViewHooksArgs = {
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
};

export function useOrderPdfSketchPanelViewHooks(args: OrderPdfSketchPanelViewHooksArgs) {
  const { open, entries, draft, onAppendStroke, onUpsertTextBox, onDeleteTextBox, onUndo, onRedo, onClear } =
    args;
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const shapeToolbarRef = useRef<HTMLDivElement | null>(null);
  const drawTriggerRef = useRef<HTMLButtonElement | null>(null);
  const widthTriggerRef = useRef<HTMLButtonElement | null>(null);
  const colorTriggerRef = useRef<HTMLButtonElement | null>(null);
  const drawPaletteRef = useRef<HTMLDivElement | null>(null);
  const widthPaletteRef = useRef<HTMLDivElement | null>(null);
  const colorPaletteRef = useRef<HTMLDivElement | null>(null);
  const drawConfigRef = useRef<OrderPdfSketchCardDrawConfig>({
    tool: 'pen',
    color: '#111827',
    width: 2,
  });

  const controller = useOrderPdfSketchPanelController({
    open,
    entries,
    draft,
    onAppendStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onUndo,
    onRedo,
    onClear,
    toolbarRef,
    shapeToolbarRef,
    drawPaletteRef,
    widthPaletteRef,
    colorPaletteRef,
  });

  drawConfigRef.current.tool = controller.tool;
  drawConfigRef.current.color = controller.color;
  drawConfigRef.current.width = controller.width;

  return {
    toolbarRef,
    shapeToolbarRef,
    drawTriggerRef,
    widthTriggerRef,
    colorTriggerRef,
    drawPaletteRef,
    widthPaletteRef,
    colorPaletteRef,
    drawConfigRef,
    ...controller,
  };
}
