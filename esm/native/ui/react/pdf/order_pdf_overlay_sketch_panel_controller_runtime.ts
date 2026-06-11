import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStrokeTool,
  OrderPdfSketchTextBox,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import { shouldUpsertOrderPdfSketchTextBox } from './order_pdf_overlay_sketch_text_box_runtime.js';

export type OrderPdfSketchPaletteKey = 'draw' | 'width' | 'color';
export type OrderPdfSketchFreehandTool = Extract<OrderPdfSketchStrokeTool, 'pen' | 'marker'>;
export type OrderPdfSketchTextBoxMutationKind = 'ignore' | 'append' | 'replace';

export type OrderPdfSketchRememberedStrokeTool = Exclude<OrderPdfSketchTool, 'text'>;
export type OrderPdfSketchStrokeToolWidthMap = Record<OrderPdfSketchStrokeTool, number>;

export const ORDER_PDF_SKETCH_STROKE_TOOL_DEFAULT_WIDTHS = Object.freeze({
  pen: 2,
  marker: 6,
  eraser: 2,
  line: 2,
  square: 2,
  circle: 2,
  ellipse: 2,
} satisfies OrderPdfSketchStrokeToolWidthMap);

export function createDefaultOrderPdfSketchStrokeToolWidths(): OrderPdfSketchStrokeToolWidthMap {
  return { ...ORDER_PDF_SKETCH_STROKE_TOOL_DEFAULT_WIDTHS };
}

function normalizeOrderPdfSketchStrokeWidth(value: number | null | undefined, defaultWidth: number): number {
  const width = Number(value);
  return Number.isFinite(width) && width > 0 ? width : defaultWidth;
}

export function resolveOrderPdfSketchActiveWidthTool(args: {
  tool: OrderPdfSketchTool;
  lastNonTextTool: OrderPdfSketchRememberedStrokeTool;
}): OrderPdfSketchStrokeTool {
  return args.tool === 'text' ? args.lastNonTextTool : args.tool;
}

export function resolveOrderPdfSketchStrokeToolWidth(args: {
  tool: OrderPdfSketchStrokeTool;
  widthsByTool: Partial<OrderPdfSketchStrokeToolWidthMap> | null | undefined;
}): number {
  const defaultWidth = ORDER_PDF_SKETCH_STROKE_TOOL_DEFAULT_WIDTHS[args.tool] || 2;
  return normalizeOrderPdfSketchStrokeWidth(args.widthsByTool?.[args.tool], defaultWidth);
}

export function updateOrderPdfSketchStrokeToolWidth(args: {
  tool: OrderPdfSketchStrokeTool;
  width: number;
  widthsByTool: OrderPdfSketchStrokeToolWidthMap;
}): OrderPdfSketchStrokeToolWidthMap {
  const defaultWidth = ORDER_PDF_SKETCH_STROKE_TOOL_DEFAULT_WIDTHS[args.tool] || 2;
  const nextWidth = normalizeOrderPdfSketchStrokeWidth(args.width, defaultWidth);
  if (Object.is(args.widthsByTool[args.tool], nextWidth)) return args.widthsByTool;
  return {
    ...args.widthsByTool,
    [args.tool]: nextWidth,
  };
}

export function resolveOrderPdfSketchActiveKey(args: {
  entries: OrderPdfSketchPreviewEntry[];
  activeKey: OrderPdfSketchAnnotationPageKey;
}): OrderPdfSketchAnnotationPageKey {
  const { entries, activeKey } = args;
  if (!entries.length) return activeKey;
  if (entries.some(entry => entry.key === activeKey)) return activeKey;
  return entries[0].key;
}

export function toggleOrderPdfSketchActivePalette(
  current: OrderPdfSketchPaletteKey | null,
  next: OrderPdfSketchPaletteKey
): OrderPdfSketchPaletteKey | null {
  return current === next ? null : next;
}

export function resolveOrderPdfSketchDrawTriggerResult(args: {
  freehandTool: OrderPdfSketchFreehandTool;
  activePalette: OrderPdfSketchPaletteKey | null;
}): { nextTool: OrderPdfSketchFreehandTool; nextPalette: OrderPdfSketchPaletteKey | null } {
  return {
    nextTool: args.freehandTool,
    nextPalette: toggleOrderPdfSketchActivePalette(args.activePalette, 'draw'),
  };
}

export function isOrderPdfSketchFreehandTool(
  tool: OrderPdfSketchTool | OrderPdfSketchStrokeTool
): tool is OrderPdfSketchFreehandTool {
  return tool === 'pen' || tool === 'marker';
}

export function resolveOrderPdfSketchTextBoxMutation(args: {
  current: OrderPdfSketchTextBox[];
  next: OrderPdfSketchTextBox;
}): {
  kind: OrderPdfSketchTextBoxMutationKind;
  existing: OrderPdfSketchTextBox | null;
} {
  const existing = args.current.find(entry => entry.id === args.next.id) || null;
  if (!shouldUpsertOrderPdfSketchTextBox({ current: existing, next: args.next })) {
    return { kind: 'ignore', existing };
  }
  return {
    kind: existing ? 'replace' : 'append',
    existing,
  };
}

export function resolveOrderPdfSketchDeletedTextBox(args: {
  current: OrderPdfSketchTextBox[];
  id: string;
}): OrderPdfSketchTextBox | null {
  return args.current.find(entry => entry.id === args.id) || null;
}
