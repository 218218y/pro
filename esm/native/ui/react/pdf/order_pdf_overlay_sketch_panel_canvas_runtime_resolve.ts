import type { OrderPdfSketchStroke, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';
import type { OrderPdfSketchCanvasDrawState } from './order_pdf_overlay_sketch_panel_canvas_runtime_types.js';

export function resolveOrderPdfSketchCanvasPixels(args: {
  width: number;
  height: number;
  devicePixelRatio: number;
}): { pxWidth: number; pxHeight: number } {
  const { width, height, devicePixelRatio } = args;
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    pxWidth: Math.max(1, Math.round(width * dpr)),
    pxHeight: Math.max(1, Math.round(height * dpr)),
  };
}

export function resolveOrderPdfSketchCanvasDrawState(args: {
  host: HTMLDivElement;
  canvas: HTMLCanvasElement;
  rect: DrawingRect;
  devicePixelRatio: number;
  strokes: OrderPdfSketchStroke[];
  textBoxes: OrderPdfSketchTextBox[];
  pendingStroke: OrderPdfSketchStroke | null;
}): OrderPdfSketchCanvasDrawState {
  const { host, canvas, rect, devicePixelRatio, strokes, textBoxes, pendingStroke } = args;
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const { pxWidth, pxHeight } = resolveOrderPdfSketchCanvasPixels({ width, height, devicePixelRatio });
  return {
    host,
    canvas,
    width,
    height,
    pxWidth,
    pxHeight,
    strokes,
    textBoxes,
    pendingStroke,
  };
}

export function resolveOrderPdfSketchCanvasRect(args: {
  host: HTMLDivElement;
  measuredRect: DrawingRect | null;
  cachedRect: DrawingRect | null;
  refreshRect: () => DrawingRect | null;
}): DrawingRect | null {
  const { measuredRect, cachedRect, refreshRect } = args;
  if (measuredRect) return measuredRect;
  if (cachedRect) return cachedRect;
  return refreshRect();
}

export function shouldRunOrderPdfSketchCanvasFrame(args: {
  scheduledVersion: number;
  activeVersion: number;
}): boolean {
  return args.scheduledVersion === args.activeVersion;
}

export function nextOrderPdfSketchCanvasFrameVersion(current: number): number {
  return current + 1;
}
