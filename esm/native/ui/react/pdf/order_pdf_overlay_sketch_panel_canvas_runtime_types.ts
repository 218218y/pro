import type { OrderPdfSketchStroke, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

export type OrderPdfSketchCanvasDrawState = {
  host: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  pxWidth: number;
  pxHeight: number;
  strokes: OrderPdfSketchStroke[];
  textBoxes: OrderPdfSketchTextBox[];
  pendingStroke: OrderPdfSketchStroke | null;
};
