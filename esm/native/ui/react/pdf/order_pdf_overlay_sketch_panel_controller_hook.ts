import { useMemo } from 'react';

import { useOrderPdfSketchToolbarPlacement } from './order_pdf_overlay_sketch_panel_measurement_hooks.js';
import { useOrderPdfSketchPaletteDismiss } from './order_pdf_overlay_sketch_panel_hooks.js';
import {
  useOrderPdfSketchHistoryShortcuts,
  useOrderPdfSketchRedoState,
} from './order_pdf_overlay_sketch_panel_history_hooks.js';
import { useOrderPdfSketchPanelAnnotationActions } from './order_pdf_overlay_sketch_panel_controller_annotation_hooks.js';
import {
  resolveOrderPdfSketchPanelActiveState,
  useOrderPdfSketchPanelAnnotationMaps,
} from './order_pdf_overlay_sketch_panel_controller_active_state.js';
import { useOrderPdfSketchPanelState } from './order_pdf_overlay_sketch_panel_controller_state_hooks.js';
import type { UseOrderPdfSketchPanelControllerArgs } from './order_pdf_overlay_sketch_panel_controller_types.js';

export function useOrderPdfSketchPanelController(args: UseOrderPdfSketchPanelControllerArgs) {
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

  const { strokesByKey, textBoxesByKey, entriesByKey } = useOrderPdfSketchPanelAnnotationMaps({
    draft,
    entries,
  });
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

  const { activeHasStrokes, activeHasRedo, activeEntry } = useMemo(
    () =>
      resolveOrderPdfSketchPanelActiveState({
        activeKey,
        entriesByKey,
        redoStacks,
        strokesByKey,
        textBoxesByKey,
      }),
    [activeKey, entriesByKey, redoStacks, strokesByKey, textBoxesByKey]
  );

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
