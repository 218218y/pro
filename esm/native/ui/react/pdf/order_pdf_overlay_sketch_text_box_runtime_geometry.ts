import type { OrderPdfSketchPoint } from './order_pdf_overlay_contracts.js';
import {
  ORDER_PDF_SKETCH_TEXT_BOX_CREATE_POINTER_THRESHOLD_PX,
  ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT,
  ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH,
  type OrderPdfSketchTextBoxRect,
} from './order_pdf_overlay_sketch_text_box_runtime_types.js';

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function clampMinMax(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
}

export function fitOrderPdfSketchTextBoxRect(args: OrderPdfSketchTextBoxRect): OrderPdfSketchTextBoxRect {
  const width = clampMinMax(args.width, ORDER_PDF_SKETCH_TEXT_BOX_MIN_WIDTH, 1);
  const height = clampMinMax(args.height, ORDER_PDF_SKETCH_TEXT_BOX_MIN_HEIGHT, 1);
  const x = clampMinMax(args.x, 0, Math.max(0, 1 - width));
  const y = clampMinMax(args.y, 0, Math.max(0, 1 - height));
  return { x, y, width, height };
}

export function buildOrderPdfSketchTextBoxCreateRect(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
}): OrderPdfSketchTextBoxRect {
  const startX = clamp01(args.start.x);
  const startY = clamp01(args.start.y);
  const endX = clamp01(args.end.x);
  const endY = clamp01(args.end.y);
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const right = Math.max(startX, endX);
  const bottom = Math.max(startY, endY);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export function shouldCreateOrderPdfSketchTextBoxFromPointerDrag(args: {
  startClientX: number;
  startClientY: number;
  endClientX: number;
  endClientY: number;
  thresholdPx?: number | null;
}): boolean {
  const threshold = Math.max(
    0,
    Number(args.thresholdPx) || ORDER_PDF_SKETCH_TEXT_BOX_CREATE_POINTER_THRESHOLD_PX
  );
  const dx = Math.abs(args.endClientX - args.startClientX);
  const dy = Math.abs(args.endClientY - args.startClientY);
  return dx >= threshold || dy >= threshold;
}
