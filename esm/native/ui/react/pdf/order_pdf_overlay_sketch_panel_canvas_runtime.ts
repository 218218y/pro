import { paintOrderPdfSketchAnnotations } from './order_pdf_overlay_sketch_annotations.js';
import type { OrderPdfSketchStroke, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';

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

function areOrderPdfSketchPointsEqual(
  prev: OrderPdfSketchStroke['points'],
  next: OrderPdfSketchStroke['points']
): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const left = prev[i];
    const right = next[i];
    if (!left || !right) return false;
    if (!Object.is(left.x, right.x) || !Object.is(left.y, right.y)) return false;
  }
  return true;
}

function areOrderPdfSketchStrokesEqual(
  prev: OrderPdfSketchStroke | null | undefined,
  next: OrderPdfSketchStroke | null | undefined
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.id === next.id &&
    Object.is(prev.createdAt, next.createdAt) &&
    prev.tool === next.tool &&
    prev.color === next.color &&
    Object.is(prev.width, next.width) &&
    areOrderPdfSketchPointsEqual(prev.points, next.points)
  );
}

function areOrderPdfSketchStrokeListsEqual(
  prev: OrderPdfSketchStroke[],
  next: OrderPdfSketchStroke[]
): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    if (!areOrderPdfSketchStrokesEqual(prev[i], next[i])) return false;
  }
  return true;
}

function areOrderPdfSketchTextBoxesEqual(prev: OrderPdfSketchTextBox, next: OrderPdfSketchTextBox): boolean {
  return (
    prev.id === next.id &&
    Object.is(prev.createdAt, next.createdAt) &&
    Object.is(prev.x, next.x) &&
    Object.is(prev.y, next.y) &&
    Object.is(prev.width, next.width) &&
    Object.is(prev.height, next.height) &&
    prev.color === next.color &&
    Object.is(prev.fontSize, next.fontSize) &&
    !!prev.bold === !!next.bold &&
    prev.text === next.text
  );
}

function areOrderPdfSketchTextBoxListsEqual(
  prev: OrderPdfSketchTextBox[],
  next: OrderPdfSketchTextBox[]
): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;
  for (let i = 0; i < prev.length; i += 1) {
    const left = prev[i];
    const right = next[i];
    if (!left || !right) return false;
    if (!areOrderPdfSketchTextBoxesEqual(left, right)) return false;
  }
  return true;
}

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

export function shouldRepaintOrderPdfSketchCanvas(args: {
  prev: OrderPdfSketchCanvasDrawState | null;
  next: OrderPdfSketchCanvasDrawState;
}): boolean {
  const { prev, next } = args;
  return (
    !prev ||
    prev.host !== next.host ||
    prev.canvas !== next.canvas ||
    prev.width !== next.width ||
    prev.height !== next.height ||
    prev.pxWidth !== next.pxWidth ||
    prev.pxHeight !== next.pxHeight ||
    !areOrderPdfSketchStrokeListsEqual(prev.strokes, next.strokes) ||
    !areOrderPdfSketchTextBoxListsEqual(prev.textBoxes, next.textBoxes) ||
    !areOrderPdfSketchStrokesEqual(prev.pendingStroke, next.pendingStroke)
  );
}

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
