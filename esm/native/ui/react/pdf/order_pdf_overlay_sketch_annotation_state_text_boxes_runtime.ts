import {
  fitOrderPdfSketchTextBoxRect,
  normalizeOrderPdfSketchFontSize,
  normalizeOrderPdfSketchTextValue,
  ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_HEIGHT,
  ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_WIDTH,
} from '../../pdf/order_pdf_sketch_annotations_paint_runtime.js';
import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPoint,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import {
  asUnknownRecord,
  buildOrderPdfSketchAnnotationId,
  clamp01,
  isFiniteNumber,
} from './order_pdf_overlay_sketch_annotation_state_shared.js';

export function normalizeOrderPdfSketchTextBox(args: {
  value: unknown;
  key: OrderPdfSketchAnnotationPageKey;
  index: number;
}): OrderPdfSketchTextBox | null {
  const textBox = asUnknownRecord(args.value);
  if (!textBox) return null;
  const rect = fitOrderPdfSketchTextBoxRect({
    x: clamp01(isFiniteNumber(textBox.x) ? textBox.x : 0),
    y: clamp01(isFiniteNumber(textBox.y) ? textBox.y : 0),
    width: isFiniteNumber(textBox.width) ? textBox.width : ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_WIDTH,
    height: isFiniteNumber(textBox.height) ? textBox.height : ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_HEIGHT,
  });
  return {
    id:
      typeof textBox.id === 'string' && textBox.id.trim()
        ? textBox.id.trim()
        : `txt-${args.key}-${args.index + 1}`,
    createdAt: isFiniteNumber(textBox.createdAt) ? textBox.createdAt : args.index + 1,
    ...rect,
    color: typeof textBox.color === 'string' && textBox.color.trim() ? textBox.color : '#000000',
    fontSize: normalizeOrderPdfSketchFontSize(textBox.fontSize),
    bold: !!textBox.bold,
    text: normalizeOrderPdfSketchTextValue(textBox.text),
  };
}

export function createOrderPdfSketchTextBoxAtPoint(args: {
  point: OrderPdfSketchPoint;
  color?: string | null;
  fontSize?: number | null;
  bold?: boolean | null;
}): OrderPdfSketchTextBox {
  const rect = fitOrderPdfSketchTextBoxRect({
    x: clamp01(args.point.x),
    y: clamp01(args.point.y),
    width: ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_WIDTH,
    height: ORDER_PDF_SKETCH_DEFAULT_TEXT_BOX_HEIGHT,
  });
  return {
    id: buildOrderPdfSketchAnnotationId('txt'),
    createdAt: Date.now(),
    ...rect,
    color: typeof args.color === 'string' && args.color.trim() ? args.color : '#000000',
    fontSize: normalizeOrderPdfSketchFontSize(args.fontSize),
    bold: !!args.bold,
    text: '',
  };
}

export function createOrderPdfSketchTextBoxFromRect(args: {
  rect: Pick<OrderPdfSketchTextBox, 'x' | 'y' | 'width' | 'height'>;
  color?: string | null;
  fontSize?: number | null;
  bold?: boolean | null;
}): OrderPdfSketchTextBox {
  const rect = fitOrderPdfSketchTextBoxRect(args.rect);
  return {
    id: buildOrderPdfSketchAnnotationId('txt'),
    createdAt: Date.now(),
    ...rect,
    color: typeof args.color === 'string' && args.color.trim() ? args.color : '#000000',
    fontSize: normalizeOrderPdfSketchFontSize(args.fontSize),
    bold: !!args.bold,
    text: '',
  };
}

export function areOrderPdfSketchTextBoxesEqual(a: OrderPdfSketchTextBox, b: OrderPdfSketchTextBox): boolean {
  return (
    a.id === b.id &&
    Object.is(a.createdAt, b.createdAt) &&
    Object.is(a.x, b.x) &&
    Object.is(a.y, b.y) &&
    Object.is(a.width, b.width) &&
    Object.is(a.height, b.height) &&
    a.color === b.color &&
    Object.is(a.fontSize, b.fontSize) &&
    !!a.bold === !!b.bold &&
    a.text === b.text
  );
}
