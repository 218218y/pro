import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPoint,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
  OrderPdfSketchStrokeTool,
} from './order_pdf_overlay_contracts.js';

const ORDER_PDF_SKETCH_TOOL_SET: ReadonlySet<string> = new Set([
  'pen',
  'marker',
  'eraser',
  'line',
  'square',
  'circle',
  'ellipse',
]);

export const ORDER_PDF_SKETCH_ANNOTATION_PAGE_KEYS = Object.freeze([
  'renderSketch',
  'openClosed',
] satisfies readonly OrderPdfSketchAnnotationPageKey[]);

export type OrderPdfSketchSurfaceSize = {
  width: number;
  height: number;
};

export type OrderPdfSketchAnnotationLayerSource = {
  strokes?: unknown;
  textBoxes?: unknown;
};

export type OrderPdfSketchAnnotationDraftSource = {
  sketchAnnotations?: Partial<
    Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchAnnotationLayerSource | null | undefined>
  > | null;
};

type UnknownRecord = Record<string, unknown>;

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

export function asUnknownRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function readOrderPdfSketchPoint(value: unknown): OrderPdfSketchPoint | null {
  const point = asUnknownRecord(value);
  if (!point) return null;
  return isFiniteNumber(point.x) && isFiniteNumber(point.y) ? { x: point.x, y: point.y } : null;
}

export function isOrderPdfSketchStrokeTool(value: unknown): value is OrderPdfSketchStrokeTool {
  return typeof value === 'string' && ORDER_PDF_SKETCH_TOOL_SET.has(value);
}

export function isOrderPdfSketchAnnotationPageKey(value: unknown): value is OrderPdfSketchAnnotationPageKey {
  return value === 'renderSketch' || value === 'openClosed';
}

export function isOrderPdfSketchShapeTool(tool: OrderPdfSketchTool | null | undefined): boolean {
  return tool === 'line' || tool === 'square' || tool === 'circle' || tool === 'ellipse';
}

export function isOrderPdfSketchStroke(value: unknown): value is OrderPdfSketchStroke {
  const stroke = asUnknownRecord(value);
  if (!stroke) return false;
  if (!isOrderPdfSketchStrokeTool(stroke.tool)) return false;
  if (typeof stroke.color !== 'string' || !stroke.color.trim()) return false;
  if (!isFiniteNumber(stroke.width) || stroke.width <= 0) return false;
  if (!Array.isArray(stroke.points) || stroke.points.length < 1) return false;
  return stroke.points.every(point => !!readOrderPdfSketchPoint(point));
}

export function isOrderPdfSketchTextBox(value: unknown): value is OrderPdfSketchTextBox {
  const textBox = asUnknownRecord(value);
  if (!textBox) return false;
  if (typeof textBox.id !== 'string' || !textBox.id.trim()) return false;
  if (!isFiniteNumber(textBox.createdAt)) return false;
  if (!isFiniteNumber(textBox.x) || !isFiniteNumber(textBox.y)) return false;
  if (!isFiniteNumber(textBox.width) || textBox.width <= 0) return false;
  if (!isFiniteNumber(textBox.height) || textBox.height <= 0) return false;
  if (typeof textBox.color !== 'string' || !textBox.color.trim()) return false;
  if (!isFiniteNumber(textBox.fontSize) || textBox.fontSize <= 0) return false;
  if (typeof textBox.bold !== 'undefined' && typeof textBox.bold !== 'boolean') return false;
  return typeof textBox.text === 'string';
}

export function buildOrderPdfSketchAnnotationId(prefix: string = 'ann'): string {
  const randomPart = Math.random().toString(36).slice(2, 10) || 'seed';
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

export function listOrderPdfSketchStrokes(
  draft: OrderPdfSketchAnnotationDraftSource | OrderPdfDraft | null | undefined,
  key: OrderPdfSketchAnnotationPageKey
): OrderPdfSketchStroke[] {
  const strokes = draft?.sketchAnnotations?.[key]?.strokes;
  return Array.isArray(strokes) ? strokes.filter(isOrderPdfSketchStroke) : [];
}

export function listOrderPdfSketchTextBoxes(
  draft: OrderPdfSketchAnnotationDraftSource | OrderPdfDraft | null | undefined,
  key: OrderPdfSketchAnnotationPageKey
): OrderPdfSketchTextBox[] {
  const textBoxes = draft?.sketchAnnotations?.[key]?.textBoxes;
  return Array.isArray(textBoxes) ? textBoxes.filter(isOrderPdfSketchTextBox) : [];
}
