import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import { getNodeWindow } from '../viewport_layout_runtime.js';
import { installDomEventListener } from '../effects/dom_event_cleanup.js';
import type { OrderPdfSketchAnnotationPageKey } from './order_pdf_overlay_contracts.js';
import type {
  OrderPdfSketchAnnotationItem,
  OrderPdfSketchStrokeMap,
  OrderPdfSketchTextBoxMap,
  RedoStrokeMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  clearOrderPdfSketchRedoStateSnapshotKey,
  clearOrderPdfSketchRedoStateSnapshotPage,
  closeOrderPdfSketchRedoStateSnapshot,
  createOrderPdfSketchRedoStateSnapshot,
  noteOrderPdfSketchRedoStateSnapshotAppend,
  noteOrderPdfSketchRedoStateSnapshotUndo,
  resolveOrderPdfSketchHistoryShortcutAction,
  syncOrderPdfSketchRedoStateSnapshot,
  takeOrderPdfSketchRedoStateSnapshotStroke,
  type OrderPdfSketchRedoStateSnapshot,
} from './order_pdf_overlay_sketch_panel_history_runtime.js';

export function useOrderPdfSketchRedoState(args: {
  open: boolean;
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
}) {
  const { open, strokesByKey, textBoxesByKey } = args;
  const initialState = createOrderPdfSketchRedoStateSnapshot({ strokesByKey, textBoxesByKey });
  const [redoStacks, setRedoStacks] = useState<RedoStrokeMap>(initialState.redoStacks);
  const stateRef = useRef<OrderPdfSketchRedoStateSnapshot>(initialState);

  const commitState = useCallback((next: OrderPdfSketchRedoStateSnapshot) => {
    stateRef.current = next;
    setRedoStacks(prev => (prev === next.redoStacks ? prev : next.redoStacks));
  }, []);

  useEffect(() => {
    commitState(
      syncOrderPdfSketchRedoStateSnapshot({
        state: stateRef.current,
        strokesByKey,
        textBoxesByKey,
      })
    );
  }, [commitState, strokesByKey, textBoxesByKey]);

  useEffect(() => {
    if (open) return;
    commitState(
      closeOrderPdfSketchRedoStateSnapshot({
        state: stateRef.current,
        strokesByKey,
        textBoxesByKey,
      })
    );
  }, [commitState, open, strokesByKey, textBoxesByKey]);

  const clearRedoStack = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      commitState(clearOrderPdfSketchRedoStateSnapshotKey({ state: stateRef.current, key }));
    },
    [commitState]
  );

  const noteAppendStroke = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      commitState(noteOrderPdfSketchRedoStateSnapshotAppend({ state: stateRef.current, key }));
    },
    [commitState]
  );

  const noteUndoStroke = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchAnnotationItem) => {
      commitState(noteOrderPdfSketchRedoStateSnapshotUndo({ state: stateRef.current, key, stroke }));
    },
    [commitState]
  );

  const takeRedoStroke = useCallback(
    (key: OrderPdfSketchAnnotationPageKey): OrderPdfSketchAnnotationItem | null => {
      const next = takeOrderPdfSketchRedoStateSnapshotStroke({ state: stateRef.current, key });
      commitState(next.state);
      return next.stroke;
    },
    [commitState]
  );

  const noteClear = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      commitState(clearOrderPdfSketchRedoStateSnapshotPage({ state: stateRef.current, key }));
    },
    [commitState]
  );

  return {
    redoStacks,
    clearRedoStack,
    noteAppendStroke,
    noteUndoStroke,
    takeRedoStroke,
    noteClear,
  };
}

export function useOrderPdfSketchHistoryShortcuts(args: {
  open: boolean;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  activeKey: OrderPdfSketchAnnotationPageKey;
  activeHasStrokes: boolean;
  activeHasRedo: boolean;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (key: OrderPdfSketchAnnotationPageKey) => void;
}): void {
  const { open, toolbarRef, activeKey, activeHasStrokes, activeHasRedo, onUndo, onRedo } = args;

  useEffect(() => {
    if (!open) return;
    const win = getNodeWindow(toolbarRef.current);
    if (!win) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      const action = resolveOrderPdfSketchHistoryShortcutAction({
        event,
        activeHasStrokes,
        activeHasRedo,
      });
      if (!action) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      if (action === 'undo') {
        onUndo(activeKey);
        return;
      }
      onRedo(activeKey);
    };
    return installDomEventListener({
      target: win,
      type: 'keydown',
      listener: onKeyDown as EventListener,
      options: true,
      label: 'orderPdfSketchHistoryShortcuts',
    });
  }, [open, activeKey, activeHasStrokes, activeHasRedo, onUndo, onRedo, toolbarRef]);
}
