import type { OrderPdfSketchStroke, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import type { OrderPdfSketchCanvasDrawState } from './order_pdf_overlay_sketch_panel_canvas_runtime_types.js';

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
