import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import {
  listOrderPdfSketchStrokes,
  listOrderPdfSketchTextBoxes,
} from './order_pdf_overlay_sketch_annotation_state_runtime.js';

export type OrderPdfSketchAnnotationItem = OrderPdfSketchStroke | OrderPdfSketchTextBox;
export type RedoStrokeMap = Partial<Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchAnnotationItem[]>>;
export type OrderPdfSketchStrokeMap = Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchStroke[]>;
export type OrderPdfSketchTextBoxMap = Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchTextBox[]>;
export type OrderPdfSketchStrokeCounts = Record<OrderPdfSketchAnnotationPageKey, number>;

const ORDER_PDF_SKETCH_PAGE_KEYS: readonly OrderPdfSketchAnnotationPageKey[] = ['renderSketch', 'openClosed'];

export function readOrderPdfSketchAnnotationSortKey(
  value: { createdAt?: number },
  defaultValue: number
): number {
  return typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
    ? value.createdAt
    : defaultValue;
}

export function buildOrderPdfSketchPreviewEntryMap(
  entries: OrderPdfSketchPreviewEntry[]
): Partial<Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchPreviewEntry>> {
  return entries.reduce<Partial<Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchPreviewEntry>>>(
    (acc, entry) => {
      acc[entry.key] = entry;
      return acc;
    },
    {}
  );
}

export function resolveOrderPdfSketchLatestAnnotationItem(args: {
  strokes: OrderPdfSketchStroke[];
  textBoxes: OrderPdfSketchTextBox[];
}): OrderPdfSketchAnnotationItem | null {
  const { strokes, textBoxes } = args;
  const removedStroke = strokes[strokes.length - 1] || null;
  const removedTextBox = textBoxes[textBoxes.length - 1] || null;
  const removed =
    readOrderPdfSketchAnnotationSortKey(removedTextBox || {}, -1) >
    readOrderPdfSketchAnnotationSortKey(removedStroke || {}, -1)
      ? removedTextBox
      : removedStroke;
  return removed || null;
}

export function cloneOrderPdfSketchStroke(stroke: OrderPdfSketchStroke): OrderPdfSketchStroke {
  return {
    id: stroke.id,
    createdAt: stroke.createdAt,
    tool: stroke.tool,
    color: stroke.color,
    width: stroke.width,
    points: Array.isArray(stroke.points) ? stroke.points.map(point => ({ x: point.x, y: point.y })) : [],
  };
}

export function cloneOrderPdfSketchTextBox(textBox: OrderPdfSketchTextBox): OrderPdfSketchTextBox {
  return {
    id: textBox.id,
    createdAt: textBox.createdAt,
    x: textBox.x,
    y: textBox.y,
    width: textBox.width,
    height: textBox.height,
    color: textBox.color,
    fontSize: textBox.fontSize,
    bold: textBox.bold,
    text: textBox.text,
  };
}

export function isOrderPdfSketchTextBoxItem(
  value: OrderPdfSketchAnnotationItem
): value is OrderPdfSketchTextBox {
  return 'text' in value && 'fontSize' in value && 'height' in value;
}

export function cloneOrderPdfSketchAnnotationItem(
  item: OrderPdfSketchAnnotationItem
): OrderPdfSketchAnnotationItem {
  return isOrderPdfSketchTextBoxItem(item)
    ? cloneOrderPdfSketchTextBox(item)
    : cloneOrderPdfSketchStroke(item);
}

export function buildOrderPdfSketchStrokeMap(draft: OrderPdfDraft | null): OrderPdfSketchStrokeMap {
  return {
    renderSketch: listOrderPdfSketchStrokes(draft, 'renderSketch'),
    openClosed: listOrderPdfSketchStrokes(draft, 'openClosed'),
  };
}

export function buildOrderPdfSketchTextBoxMap(draft: OrderPdfDraft | null): OrderPdfSketchTextBoxMap {
  return {
    renderSketch: listOrderPdfSketchTextBoxes(draft, 'renderSketch'),
    openClosed: listOrderPdfSketchTextBoxes(draft, 'openClosed'),
  };
}

export function buildOrderPdfSketchStrokeCounts(
  strokesByKey: OrderPdfSketchStrokeMap,
  textBoxesByKey?: OrderPdfSketchTextBoxMap
): OrderPdfSketchStrokeCounts {
  return {
    renderSketch: strokesByKey.renderSketch.length + (textBoxesByKey?.renderSketch.length || 0),
    openClosed: strokesByKey.openClosed.length + (textBoxesByKey?.openClosed.length || 0),
  };
}

export function haveOrderPdfSketchStrokeCountsChanged(
  prev: OrderPdfSketchStrokeCounts,
  next: OrderPdfSketchStrokeCounts
): boolean {
  return ORDER_PDF_SKETCH_PAGE_KEYS.some(key => prev[key] !== next[key]);
}

export function clearOrderPdfSketchRedoKey(
  redoStacks: RedoStrokeMap,
  key: OrderPdfSketchAnnotationPageKey
): RedoStrokeMap {
  if (!redoStacks[key]?.length) return redoStacks;
  const next = { ...redoStacks };
  delete next[key];
  return next;
}

export function pushOrderPdfSketchRedoStroke(args: {
  redoStacks: RedoStrokeMap;
  key: OrderPdfSketchAnnotationPageKey;
  stroke: OrderPdfSketchAnnotationItem;
}): RedoStrokeMap {
  const { redoStacks, key, stroke } = args;
  const current = Array.isArray(redoStacks[key]) ? redoStacks[key] : [];
  return { ...redoStacks, [key]: [...current, cloneOrderPdfSketchAnnotationItem(stroke)] };
}

export function popOrderPdfSketchRedoStroke(args: {
  redoStacks: RedoStrokeMap;
  key: OrderPdfSketchAnnotationPageKey;
}): {
  redoStacks: RedoStrokeMap;
  stroke: OrderPdfSketchAnnotationItem | null;
} {
  const { redoStacks, key } = args;
  const current = Array.isArray(redoStacks[key]) ? redoStacks[key] : [];
  const restored = current.length ? current[current.length - 1] : null;
  if (!restored) return { redoStacks, stroke: null };
  const trimmed = current.slice(0, -1);
  if (!trimmed.length) {
    const next = { ...redoStacks };
    delete next[key];
    return { redoStacks: next, stroke: cloneOrderPdfSketchAnnotationItem(restored) };
  }
  return {
    redoStacks: { ...redoStacks, [key]: trimmed },
    stroke: cloneOrderPdfSketchAnnotationItem(restored),
  };
}
