import { useMemo } from 'react';

import {
  useOrderPdfSketchActiveTextLayerControls,
  useOrderPdfSketchRenderedTextLayerBoxes,
} from './order_pdf_overlay_sketch_card_text_layer_active_hooks.js';
import { useOrderPdfSketchCardTextLayerEditor } from './order_pdf_overlay_sketch_card_text_layer_editor_hooks.js';
import { useOrderPdfSketchCardTextLayerInteractions } from './order_pdf_overlay_sketch_card_text_layer_interactions_hooks.js';
import { useOrderPdfSketchCardTextLayerPaletteState } from './order_pdf_overlay_sketch_card_text_layer_palette_hooks.js';
import type {
  OrderPdfSketchCardTextLayerArgs,
  OrderPdfSketchCardTextLayerResult,
} from './order_pdf_overlay_sketch_card_text_layer_hooks_types.js';

export function useOrderPdfSketchCardTextLayer(
  args: OrderPdfSketchCardTextLayerArgs
): OrderPdfSketchCardTextLayerResult {
  const {
    entryKey,
    getHostRect,
    hostRef,
    onDeleteTextBox,
    onEnterTextMode,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    textBoxes,
    tool,
  } = args;
  const { focusTextBoxEditor, readEditorText, registerEditorRef } = useOrderPdfSketchCardTextLayerEditor({
    hostRef,
  });
  const {
    activeTextBoxId,
    colorPaletteOpen,
    sizePaletteOpen,
    setActiveTextBoxId,
    closeTextBoxPalettes,
    clearActiveTextBox,
    closeColorPalette,
    closeSizePalette,
    toggleColorPalette,
    toggleSizePalette,
  } = useOrderPdfSketchCardTextLayerPaletteState({ textBoxes });

  const {
    commitTextBoxById,
    createRectStyle,
    deleteTextBox,
    handleBoxPointerDown,
    handleCanvasPointerDown,
    handleCanvasPointerFinish,
    handleCanvasPointerMove,
    handleResizeHandlePointerDown,
    interactionPreviewBox,
    persistLiveTextBox,
  } = useOrderPdfSketchCardTextLayerInteractions({
    activeTextBoxId,
    clearActiveTextBox,
    closeTextBoxPalettes,
    entryKey,
    focusTextBoxEditor,
    getHostRect,
    hostRef,
    onDeleteTextBox,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    readEditorText,
    setActiveTextBoxId,
    textBoxes,
    tool,
  });

  const renderedTextBoxes = useOrderPdfSketchRenderedTextLayerBoxes({ textBoxes, interactionPreviewBox });
  const activeTextBox = useMemo(
    () => renderedTextBoxes.find(textBox => textBox.id === activeTextBoxId) || null,
    [activeTextBoxId, renderedTextBoxes]
  );
  const { activateTextBox, handleApplyActiveTextBoxPatch } = useOrderPdfSketchActiveTextLayerControls({
    activeTextBox,
    activeTextBoxId,
    closeColorPalette,
    closeSizePalette,
    closeTextBoxPalettes,
    commitTextBoxById,
    entryKey,
    focusTextBoxEditor,
    onEnterTextMode,
    onSelect,
    persistLiveTextBox,
    readEditorText,
    setActiveTextBoxId,
  });

  return {
    activeTextBoxId,
    colorPaletteOpen,
    createRectStyle,
    registerEditorRef,
    renderedTextBoxes,
    sizePaletteOpen,
    activateTextBox,
    clearActiveTextBox,
    commitTextBoxById,
    deleteTextBox,
    handleApplyActiveTextBoxPatch,
    handleBoxPointerDown,
    handleCanvasPointerDown,
    handleCanvasPointerFinish,
    handleCanvasPointerMove,
    handleResizeHandlePointerDown,
    toggleColorPalette,
    toggleSizePalette,
  };
}
