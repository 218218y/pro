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
