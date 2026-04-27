import { useMemo } from 'react';
import type { MutableRefObject } from 'react';

import type {
  OrderPdfDraft,
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchStroke,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import { useOrderPdfSketchToolbarPlacement } from './order_pdf_overlay_sketch_panel_measurement_hooks.js';
import { useOrderPdfSketchPaletteDismiss } from './order_pdf_overlay_sketch_panel_hooks.js';
import {
  useOrderPdfSketchHistoryShortcuts,
  useOrderPdfSketchRedoState,
} from './order_pdf_overlay_sketch_panel_history_hooks.js';
import {
  buildOrderPdfSketchPreviewEntryMap,
  buildOrderPdfSketchStrokeMap,
  buildOrderPdfSketchTextBoxMap,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import { useOrderPdfSketchPanelAnnotationActions } from './order_pdf_overlay_sketch_panel_controller_annotation_hooks.js';
import { useOrderPdfSketchPanelState } from './order_pdf_overlay_sketch_panel_controller_state_hooks.js';

export function useOrderPdfSketchPanelController(args: {
  open: boolean;
  entries: OrderPdfSketchPreviewEntry[];
  draft: OrderPdfDraft | null;
  onAppendStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onUpsertTextBox: (key: OrderPdfSketchAnnotationPageKey, textBox: OrderPdfSketchTextBox) => void;
  onDeleteTextBox: (key: OrderPdfSketchAnnotationPageKey, id: string) => void;
  onUndo: (key: OrderPdfSketchAnnotationPageKey) => void;
  onRedo: (
    key: OrderPdfSketchAnnotationPageKey,
    stroke: OrderPdfSketchStroke | OrderPdfSketchTextBox
  ) => void;
  onClear: (key: OrderPdfSketchAnnotationPageKey) => void;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
  shapeToolbarRef: MutableRefObject<HTMLDivElement | null>;
  drawPaletteRef: MutableRefObject<HTMLDivElement | null>;
  widthPaletteRef: MutableRefObject<HTMLDivElement | null>;
  colorPaletteRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const {
    open,
    entries,
    draft,
    onAppendStroke,
    onUpsertTextBox,
    onDeleteTextBox,
    onUndo,
    onRedo,
    onClear,
    toolbarRef,
    shapeToolbarRef,
    drawPaletteRef,
    widthPaletteRef,
    colorPaletteRef,
  } = args;

  const panelState = useOrderPdfSketchPanelState({ open, entries });
  const {
    tool,
    freehandTool,
    color,
    width,
    activeKey,
    activePalette,
    drawPaletteOpen,
    widthPaletteOpen,
    colorPaletteOpen,
    colorControlDisabled,
    widthControlDisabled,
    setTool,
    setActiveKey,
    setActivePalette,
    handleEnterTextMode,
    handleExitTextMode,
    handleActivateDrawTool,
    handleToggleWidthPalette,
    handleToggleColorPalette,
    handleSelectFreehandTool,
    handleSelectWidth,
    handleSelectColor,
  } = panelState;

  const strokesByKey = useMemo(() => buildOrderPdfSketchStrokeMap(draft), [draft]);
  const textBoxesByKey = useMemo(() => buildOrderPdfSketchTextBoxMap(draft), [draft]);
  const { redoStacks, clearRedoStack, noteAppendStroke, noteUndoStroke, takeRedoStroke, noteClear } =
    useOrderPdfSketchRedoState({
      open,
      strokesByKey,
      textBoxesByKey,
    });

  const toolbarPlacement = useOrderPdfSketchToolbarPlacement({
    open,
    toolbarRef,
  });
  const shapeToolbarPlacement = useOrderPdfSketchToolbarPlacement({
    open,
    toolbarRef: shapeToolbarRef,
    side: 'left',
  });

  const entriesByKey = useMemo(() => buildOrderPdfSketchPreviewEntryMap(entries), [entries]);
  const activeStrokes = strokesByKey[activeKey];
  const activeTextBoxes = textBoxesByKey[activeKey];
  const activeHasStrokes = activeStrokes.length > 0 || activeTextBoxes.length > 0;
  const activeHasRedo = (redoStacks[activeKey]?.length || 0) > 0;
  const activeEntry = entriesByKey[activeKey] || null;

  useOrderPdfSketchPaletteDismiss({
    open,
    active: !!activePalette,
    toolbarRef,
    paletteRefs: [drawPaletteRef, widthPaletteRef, colorPaletteRef],
    onDismiss: () => setActivePalette(null),
  });

  const annotationActions = useOrderPdfSketchPanelAnnotationActions({
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
  });
  const {
    handleAppendStroke,
    handleUpsertTextBox,
    handleDeleteTextBox,
    handleUndo,
    handleRedo,
    handleUndoActive,
    handleRedoActive,
    handleClearActive,
  } = annotationActions;

  useOrderPdfSketchHistoryShortcuts({
    open,
    toolbarRef,
    activeKey,
    activeHasStrokes,
    activeHasRedo,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  return {
    tool,
    freehandTool,
    color,
    width,
    activeKey,
    drawPaletteOpen,
    widthPaletteOpen,
    colorPaletteOpen,
    colorControlDisabled,
    widthControlDisabled,
    strokesByKey,
    textBoxesByKey,
    activeHasStrokes,
    activeHasRedo,
    activeEntry,
    toolbarPlacement,
    shapeToolbarPlacement,
    setTool,
    setActiveKey,
    handleEnterTextMode,
    handleExitTextMode,
    handleAppendStroke,
    handleUpsertTextBox,
    handleDeleteTextBox,
    handleActivateDrawTool,
    handleToggleWidthPalette,
    handleToggleColorPalette,
    handleSelectFreehandTool,
    handleSelectWidth,
    handleSelectColor,
    handleUndoActive,
    handleRedoActive,
    handleClearActive,
  };
}

export type { OrderPdfSketchFreehandTool } from './order_pdf_overlay_sketch_panel_controller_runtime.js';
