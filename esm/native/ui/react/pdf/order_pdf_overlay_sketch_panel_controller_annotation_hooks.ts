import { useCallback } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import { listOrderPdfSketchTextBoxes } from './order_pdf_overlay_sketch_annotation_state_runtime.js';
import {
  resolveOrderPdfSketchLatestAnnotationItem,
  type OrderPdfSketchStrokeMap,
  type OrderPdfSketchTextBoxMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  resolveOrderPdfSketchDeletedTextBox,
  resolveOrderPdfSketchTextBoxMutation,
} from './order_pdf_overlay_sketch_panel_controller_runtime.js';

export function useOrderPdfSketchPanelAnnotationActions(args: {
  activeKey: OrderPdfSketchAnnotationPageKey;
  draft: OrderPdfDraft | null;
  strokesByKey: OrderPdfSketchStrokeMap;
  textBoxesByKey: OrderPdfSketchTextBoxMap;
  noteAppendStroke: (key: OrderPdfSketchAnnotationPageKey) => void;
  noteUndoStroke: (
    key: OrderPdfSketchAnnotationPageKey,
    stroke: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  takeRedoStroke: (
    key: OrderPdfSketchAnnotationPageKey
  ) => OrderPdfSketchStroke | OrderPdfSketchTextBox | null;
  clearRedoStack: (key: OrderPdfSketchAnnotationPageKey) => void;
  noteClear: (key: OrderPdfSketchAnnotationPageKey) => void;
  onAppendStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (
    key: OrderPdfSketchAnnotationPageKey,
    stroke: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClear: (key: OrderPdfSketchAnnotationPageKey) => void;
}) {
  const {
    activeKey,
    draft,
    strokesByKey,
    textBoxesByKey,
    noteAppendStroke,
    noteUndoStroke,
    takeRedoStroke,
    clearRedoStack,
    noteClear,
    onAppendStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onUndo,
    onRedo,
    onClear,
  } = args;

  const handleAppendStroke = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => {
      noteAppendStroke(key);
      onAppendStroke(key, stroke);
    },
    [noteAppendStroke, onAppendStroke]
  );

  const handleUndo = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      const removed = resolveOrderPdfSketchLatestAnnotationItem({
        strokes: strokesByKey[key],
        textBoxes: textBoxesByKey[key],
      });
      if (!removed) return;
      noteUndoStroke(key, removed);
      onUndo(key);
    },
    [strokesByKey, textBoxesByKey, noteUndoStroke, onUndo]
  );

  const handleRedo = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      const restored = takeRedoStroke(key);
      if (!restored) return;
      onRedo(key, restored);
    },
    [takeRedoStroke, onRedo]
  );

  const handleClear = useCallback(
    (key: OrderPdfSketchAnnotationPageKey) => {
      noteClear(key);
      onClear(key);
    },
    [noteClear, onClear]
  );

  const handleUpsertTextBox = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => {
      const current = listOrderPdfSketchTextBoxes(draft, key);
      const mutation = resolveOrderPdfSketchTextBoxMutation({ current, next: textBox });
      if (mutation.kind === 'ignore') return;
      if (mutation.kind === 'append') {
        noteAppendStroke(key);
      } else {
        clearRedoStack(key);
      }
      onUpsertTextBox(key, textBox);
    },
    [draft, noteAppendStroke, clearRedoStack, onUpsertTextBox]
  );

  const handleDeleteTextBox = useCallback(
    (key: OrderPdfSketchAnnotationPageKey, id: string) => {
      const current = listOrderPdfSketchTextBoxes(draft, key);
      const removed = resolveOrderPdfSketchDeletedTextBox({ current, id });
      if (!removed) return;
      noteUndoStroke(key, removed);
      onDeleteTextBox(key, id);
    },
    [draft, noteUndoStroke, onDeleteTextBox]
  );

  const handleUndoActive = useCallback(() => {
    handleUndo(activeKey);
  }, [activeKey, handleUndo]);

  const handleRedoActive = useCallback(() => {
    handleRedo(activeKey);
  }, [activeKey, handleRedo]);

  const handleClearActive = useCallback(() => {
    handleClear(activeKey);
  }, [activeKey, handleClear]);

  return {
    handleAppendStroke,
    handleUpsertTextBox,
    handleDeleteTextBox,
    handleUndo,
    handleRedo,
    handleClear,
    handleUndoActive,
    handleRedoActive,
    handleClearActive,
  };
}
