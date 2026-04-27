import {
  paintOrderPdfSketchAnnotationLayer,
  paintOrderPdfSketchTextBoxes as paintCanonicalOrderPdfSketchTextBoxes,
} from '../../pdf/order_pdf_sketch_annotations_paint_runtime.js';
import type { OrderPdfSketchStroke, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

export const ORDER_PDF_SKETCH_COLOR_SWATCHES = Object.freeze([
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#111827',
  '#f59e0b',
] satisfies readonly string[]);

export const ORDER_PDF_SKETCH_WIDTH_OPTIONS = Object.freeze([2, 4, 6, 10, 14] satisfies readonly number[]);

export {
  ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS,
  appendOrderPdfSketchStroke,
  areOrderPdfSketchAnnotationsEqual,
  buildOrderPdfSketchShapePoints,
  clearOrderPdfSketchStrokes,
  cloneOrderPdfSketchAnnotations,
  createOrderPdfSketchTextBoxAtPoint,
  createOrderPdfSketchTextBoxFromRect,
  deleteOrderPdfSketchTextBox,
  hasOrderPdfSketchAnnotations,
  isOrderPdfSketchAnnotationPageKey,
  isOrderPdfSketchShapeTool,
  isOrderPdfSketchStroke,
  isOrderPdfSketchTextBox,
  listOrderPdfSketchStrokes,
  listOrderPdfSketchTextBoxes,
  readOrderPdfSketchAnnotations,
  undoOrderPdfSketchStroke,
  upsertOrderPdfSketchTextBox,
  type OrderPdfSketchSurfaceSize,
} from './order_pdf_overlay_sketch_annotation_state_runtime.js';

export function paintOrderPdfSketchTextBoxes(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  textBoxes: readonly OrderPdfSketchTextBox[];
}): void {
  paintCanonicalOrderPdfSketchTextBoxes({
    ctx: args.ctx,
    canvasWidth: args.canvasWidth,
    canvasHeight: args.canvasHeight,
    textBoxes: args.textBoxes,
  });
}

export function paintOrderPdfSketchAnnotations(args: {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  strokes: OrderPdfSketchStroke[];
  textBoxes?: OrderPdfSketchTextBox[];
}): void {
  paintOrderPdfSketchAnnotationLayer({
    ctx: args.ctx,
    canvasWidth: args.canvasWidth,
    canvasHeight: args.canvasHeight,
    strokes: args.strokes,
    textBoxes: args.textBoxes,
  });
}
