import type { OrderPdfSketchAnnotationPageKey } from './order_pdf_overlay_contracts.js';
import {
  buildOrderPdfSketchStrokeCounts,
  clearOrderPdfSketchRedoKey,
  haveOrderPdfSketchStrokeCountsChanged,
  popOrderPdfSketchRedoStroke,
  pushOrderPdfSketchRedoStroke,
  type OrderPdfSketchAnnotationItem,
  type OrderPdfSketchStrokeCounts,
  type OrderPdfSketchStrokeMap,
  type OrderPdfSketchTextBoxMap,
  type RedoStrokeMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  isOrderPdfSketchHistoryShortcut,
  isOrderPdfSketchRedoShortcut,
  isOrderPdfSketchUndoShortcut,
} from './order_pdf_overlay_sketch_shortcuts.js';

export type OrderPdfSketchRedoStateSnapshot = {
  redoStacks: RedoStrokeMap;
  expectedCounts: OrderPdfSketchStrokeCounts;
};

export function createOrderPdfSketchRedoStateSnapshot(args: {
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
}): OrderPdfSketchRedoStateSnapshot {
  return {
    redoStacks: {},
    expectedCounts: buildOrderPdfSketchStrokeCounts(args.strokesByKey, args.textBoxesByKey),
  };
}

export function syncOrderPdfSketchRedoStateSnapshot(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
}): OrderPdfSketchRedoStateSnapshot {
  const nextCounts = buildOrderPdfSketchStrokeCounts(args.strokesByKey, args.textBoxesByKey);
  if (!haveOrderPdfSketchStrokeCountsChanged(args.state.expectedCounts, nextCounts)) {
    return args.state.expectedCounts === nextCounts
      ? args.state
      : { ...args.state, expectedCounts: nextCounts };
  }
  return {
    redoStacks: Object.keys(args.state.redoStacks).length ? {} : args.state.redoStacks,
    expectedCounts: nextCounts,
  };
}

export function closeOrderPdfSketchRedoStateSnapshot(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
}): OrderPdfSketchRedoStateSnapshot {
  return {
    redoStacks: Object.keys(args.state.redoStacks).length ? {} : args.state.redoStacks,
    expectedCounts: buildOrderPdfSketchStrokeCounts(args.strokesByKey, args.textBoxesByKey),
  };
}

export function clearOrderPdfSketchRedoStateSnapshotKey(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  key: OrderPdfSketchAnnotationPageKey;
}): OrderPdfSketchRedoStateSnapshot {
  return {
    ...args.state,
    redoStacks: clearOrderPdfSketchRedoKey(args.state.redoStacks, args.key),
  };
}

export function noteOrderPdfSketchRedoStateSnapshotAppend(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  key: OrderPdfSketchAnnotationPageKey;
}): OrderPdfSketchRedoStateSnapshot {
  return {
    redoStacks: clearOrderPdfSketchRedoKey(args.state.redoStacks, args.key),
    expectedCounts: {
      ...args.state.expectedCounts,
      [args.key]: args.state.expectedCounts[args.key] + 1,
    },
  };
}

export function noteOrderPdfSketchRedoStateSnapshotUndo(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  key: OrderPdfSketchAnnotationPageKey;
  stroke: OrderPdfSketchAnnotationItem;
}): OrderPdfSketchRedoStateSnapshot {
  return {
    redoStacks: pushOrderPdfSketchRedoStroke({
      redoStacks: args.state.redoStacks,
      key: args.key,
      stroke: args.stroke,
    }),
    expectedCounts: {
      ...args.state.expectedCounts,
      [args.key]: Math.max(0, args.state.expectedCounts[args.key] - 1),
    },
  };
}

export function takeOrderPdfSketchRedoStateSnapshotStroke(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  key: OrderPdfSketchAnnotationPageKey;
}): {
  state: OrderPdfSketchRedoStateSnapshot;
  stroke: OrderPdfSketchAnnotationItem | null;
} {
  const next = popOrderPdfSketchRedoStroke({ redoStacks: args.state.redoStacks, key: args.key });
  if (!next.stroke) return { state: { ...args.state, redoStacks: next.redoStacks }, stroke: null };
  return {
    stroke: next.stroke,
    state: {
      redoStacks: next.redoStacks,
      expectedCounts: {
        ...args.state.expectedCounts,
        [args.key]: args.state.expectedCounts[args.key] + 1,
      },
    },
  };
}

export function clearOrderPdfSketchRedoStateSnapshotPage(args: {
  state: OrderPdfSketchRedoStateSnapshot;
  key: OrderPdfSketchAnnotationPageKey;
}): OrderPdfSketchRedoStateSnapshot {
  return {
    redoStacks: clearOrderPdfSketchRedoKey(args.state.redoStacks, args.key),
    expectedCounts: {
      ...args.state.expectedCounts,
      [args.key]: 0,
    },
  };
}

export function resolveOrderPdfSketchHistoryShortcutAction(args: {
  event: globalThis.KeyboardEvent;
  activeHasStrokes: boolean;
  activeHasRedo: boolean;
}): 'undo' | 'redo' | null {
  const { event, activeHasStrokes, activeHasRedo } = args;
  if (!isOrderPdfSketchHistoryShortcut(event)) return null;
  if (isOrderPdfSketchUndoShortcut(event)) return activeHasStrokes ? 'undo' : null;
  return activeHasRedo && isOrderPdfSketchRedoShortcut(event) ? 'redo' : null;
}
