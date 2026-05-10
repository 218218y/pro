import { useCallback, useMemo } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchTextBox,
} from './order_pdf_overlay_contracts.js';
import { resolveOrderPdfSketchRenderedTextBoxes } from './order_pdf_overlay_sketch_text_box_interaction_preview.js';

type OrderPdfSketchRenderedTextLayerBoxesArgs = {
  textBoxes: OrderPdfSketchTextBox[];
  interactionPreviewBox: OrderPdfSketchTextBox | null;
};

type OrderPdfSketchActiveTextLayerControlsArgs = {
  activeTextBox: OrderPdfSketchTextBox | null;
  activeTextBoxId: string | null;
  closeColorPalette: () => void;
  closeSizePalette: () => void;
  closeTextBoxPalettes: () => void;
  commitTextBoxById: (id: string) => boolean;
  entryKey: OrderPdfSketchAnnotationPageKey;
  focusTextBoxEditor: (id: string) => void;
  onEnterTextMode: () => void;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
  persistLiveTextBox: (textBox: OrderPdfSketchTextBox, allowDelete: boolean) => boolean;
  readEditorText: (id: string, defaultText: string) => string;
  setActiveTextBoxId: (id: string | null) => void;
};

type OrderPdfSketchActiveTextLayerControlsResult = {
  activateTextBox: (id: string) => void;
  handleApplyActiveTextBoxPatch: (patch: Partial<OrderPdfSketchTextBox>) => void;
};

export function useOrderPdfSketchRenderedTextLayerBoxes(
  args: OrderPdfSketchRenderedTextLayerBoxesArgs
): OrderPdfSketchTextBox[] {
  const { interactionPreviewBox, textBoxes } = args;
  return useMemo(
    () => resolveOrderPdfSketchRenderedTextBoxes({ textBoxes, previewBox: interactionPreviewBox }),
    [interactionPreviewBox, textBoxes]
  );
}

export function useOrderPdfSketchActiveTextLayerControls(
  args: OrderPdfSketchActiveTextLayerControlsArgs
): OrderPdfSketchActiveTextLayerControlsResult {
  const {
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
  } = args;

  const activateTextBox = useCallback(
    (id: string) => {
      onEnterTextMode();
      onSelect(entryKey);
      if (activeTextBoxId && activeTextBoxId !== id) commitTextBoxById(activeTextBoxId);
      setActiveTextBoxId(id);
      closeTextBoxPalettes();
      focusTextBoxEditor(id);
    },
    [
      activeTextBoxId,
      closeTextBoxPalettes,
      commitTextBoxById,
      entryKey,
      focusTextBoxEditor,
      onEnterTextMode,
      onSelect,
      setActiveTextBoxId,
    ]
  );

  const handleApplyActiveTextBoxPatch = useCallback(
    (patch: Partial<OrderPdfSketchTextBox>) => {
      if (!activeTextBox) return;
      const next = { ...activeTextBox, text: readEditorText(activeTextBox.id, activeTextBox.text), ...patch };
      persistLiveTextBox(next, false);
      if (patch.color) closeColorPalette();
      if (typeof patch.fontSize === 'number') closeSizePalette();
      focusTextBoxEditor(activeTextBox.id);
    },
    [
      activeTextBox,
      closeColorPalette,
      closeSizePalette,
      focusTextBoxEditor,
      persistLiveTextBox,
      readEditorText,
    ]
  );

  return { activateTextBox, handleApplyActiveTextBoxPatch };
}
