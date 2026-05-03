import { useCallback, useEffect, useState } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';

type OrderPdfSketchCardTextLayerPaletteStateArgs = {
  textBoxes: OrderPdfSketchTextBox[];
};

type OrderPdfSketchCardTextLayerPaletteStateResult = {
  activeTextBoxId: string | null;
  colorPaletteOpen: boolean;
  sizePaletteOpen: boolean;
  setActiveTextBoxId: (id: string | null) => void;
  closeTextBoxPalettes: () => void;
  clearActiveTextBox: () => void;
  closeColorPalette: () => void;
  closeSizePalette: () => void;
  toggleColorPalette: () => void;
  toggleSizePalette: () => void;
};

export function useOrderPdfSketchCardTextLayerPaletteState(
  args: OrderPdfSketchCardTextLayerPaletteStateArgs
): OrderPdfSketchCardTextLayerPaletteStateResult {
  const { textBoxes } = args;
  const [activeTextBoxId, setActiveTextBoxId] = useState<string | null>(null);
  const [colorPaletteOpen, setColorPaletteOpen] = useState<boolean>(false);
  const [sizePaletteOpen, setSizePaletteOpen] = useState<boolean>(false);

  const closeTextBoxPalettes = useCallback(() => {
    setColorPaletteOpen(false);
    setSizePaletteOpen(false);
  }, []);

  const clearActiveTextBox = useCallback(() => {
    setActiveTextBoxId(null);
    closeTextBoxPalettes();
  }, [closeTextBoxPalettes]);

  const closeColorPalette = useCallback(() => {
    setColorPaletteOpen(false);
  }, []);

  const closeSizePalette = useCallback(() => {
    setSizePaletteOpen(false);
  }, []);

  const toggleColorPalette = useCallback(() => {
    setSizePaletteOpen(false);
    setColorPaletteOpen(prev => !prev);
  }, []);

  const toggleSizePalette = useCallback(() => {
    setColorPaletteOpen(false);
    setSizePaletteOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (!activeTextBoxId) return;
    if (textBoxes.some(textBox => textBox.id === activeTextBoxId)) return;
    clearActiveTextBox();
  }, [activeTextBoxId, clearActiveTextBox, textBoxes]);

  return {
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
  };
}
