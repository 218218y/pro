import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

export function areOrderPdfSketchTextBoxesEqual(
  prev: OrderPdfSketchTextBox | null | undefined,
  next: OrderPdfSketchTextBox | null | undefined
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
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

export function shouldUpsertOrderPdfSketchTextBox(args: {
  current: OrderPdfSketchTextBox | null | undefined;
  next: OrderPdfSketchTextBox;
}): boolean {
  return !areOrderPdfSketchTextBoxesEqual(args.current, args.next);
}

export function isOrderPdfSketchTextEmpty(text: string | null | undefined): boolean {
  return !String(text || '').trim();
}
