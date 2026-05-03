import { useMemo } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
} from './order_pdf_overlay_contracts.js';
import {
  buildOrderPdfSketchPreviewEntryMap,
  buildOrderPdfSketchStrokeMap,
  buildOrderPdfSketchTextBoxMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import type {
  OrderPdfSketchStrokeMap,
  OrderPdfSketchTextBoxMap,
  RedoStrokeMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';

type OrderPdfSketchPanelAnnotationMaps = {
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
  entriesByKey: Partial<Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchPreviewEntry>>;
};

type OrderPdfSketchPanelActiveStateArgs = {
  activeKey: OrderPdfSketchAnnotationPageKey;
  entriesByKey: Partial<Record<OrderPdfSketchAnnotationPageKey, OrderPdfSketchPreviewEntry>>;
  redoStacks: RedoStrokeMap;
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
};

type OrderPdfSketchPanelActiveState = {
  activeHasRedo: boolean;
  activeHasStrokes: boolean;
  activeEntry: OrderPdfSketchPreviewEntry | null;
};

export function useOrderPdfSketchPanelAnnotationMaps(args: {
  draft: OrderPdfDraft | null;
  entries: OrderPdfSketchPreviewEntry[];
}): OrderPdfSketchPanelAnnotationMaps {
  const { draft, entries } = args;
  const strokesByKey = useMemo(() => buildOrderPdfSketchStrokeMap(draft), [draft]);
  const textBoxesByKey = useMemo(() => buildOrderPdfSketchTextBoxMap(draft), [draft]);
  const entriesByKey = useMemo(() => buildOrderPdfSketchPreviewEntryMap(entries), [entries]);
  return { strokesByKey, textBoxesByKey, entriesByKey };
}

export function resolveOrderPdfSketchPanelActiveState(
  args: OrderPdfSketchPanelActiveStateArgs
): OrderPdfSketchPanelActiveState {
  const { activeKey, entriesByKey, redoStacks, strokesByKey, textBoxesByKey } = args;
  const activeStrokes = strokesByKey[activeKey] || [];
  const activeTextBoxes = textBoxesByKey[activeKey] || [];
  return {
    activeHasStrokes: activeStrokes.length > 0 || activeTextBoxes.length > 0,
    activeHasRedo: (redoStacks[activeKey]?.length || 0) > 0,
    activeEntry: entriesByKey[activeKey] || null,
  };
}
