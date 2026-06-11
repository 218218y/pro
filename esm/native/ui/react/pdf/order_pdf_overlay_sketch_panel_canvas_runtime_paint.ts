import { paintOrderPdfSketchAnnotations } from './order_pdf_overlay_sketch_annotations.js';
import type { OrderPdfSketchCanvasDrawState } from './order_pdf_overlay_sketch_panel_canvas_runtime_types.js';

export function syncOrderPdfSketchCanvasElementSize(args: {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pxWidth: number;
  pxHeight: number;
}): void {
  const { canvas, width, height, pxWidth, pxHeight } = args;
  if (canvas.width !== pxWidth) canvas.width = pxWidth;
  if (canvas.height !== pxHeight) canvas.height = pxHeight;
  if (canvas.style.width !== `${width}px`) canvas.style.width = `${width}px`;
  if (canvas.style.height !== `${height}px`) canvas.style.height = `${height}px`;
}

export function paintOrderPdfSketchCanvasFrame(draw: OrderPdfSketchCanvasDrawState): boolean {
  const { canvas, width, height, pxWidth, pxHeight, strokes, textBoxes, pendingStroke } = draw;
  if (!canvas) return false;
  syncOrderPdfSketchCanvasElementSize({ canvas, width, height, pxWidth, pxHeight });
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { width: canvasWidth, height: canvasHeight } = canvas;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  paintOrderPdfSketchAnnotations({
    ctx,
    canvasWidth,
    canvasHeight,
    strokes,
    textBoxes,
  });
  if (pendingStroke) {
    paintOrderPdfSketchAnnotations({
      ctx,
      canvasWidth,
      canvasHeight,
      strokes: [pendingStroke],
    });
  }
  return true;
}
