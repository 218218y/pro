import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  OrderPdfSketchAnnotationPageKey,
  OrderPdfSketchPreviewEntry,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import {
  ORDER_PDF_SKETCH_COLOR_SWATCHES,
  ORDER_PDF_SKETCH_WIDTH_OPTIONS,
} from './order_pdf_overlay_sketch_annotations.js';
import {
  resolveOrderPdfSketchControlState,
  resolveOrderPdfSketchExitTextTool,
  resolveOrderPdfSketchToolTransition,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  isOrderPdfSketchFreehandTool,
  resolveOrderPdfSketchActiveKey,
  resolveOrderPdfSketchDrawTriggerResult,
  toggleOrderPdfSketchActivePalette,
  type OrderPdfSketchFreehandTool,
  type OrderPdfSketchPaletteKey,
} from './order_pdf_overlay_sketch_panel_controller_runtime.js';

export function useOrderPdfSketchPanelState(args: { open: boolean; entries: OrderPdfSketchPreviewEntry[] }) {
  const { open, entries } = args;
  const [tool, setToolState] = useState<OrderPdfSketchTool>('pen');
  const [freehandTool, setFreehandTool] = useState<OrderPdfSketchFreehandTool>('pen');
  const [lastNonTextTool, setLastNonTextTool] = useState<Exclude<OrderPdfSketchTool, 'text'>>('pen');
  const [color, setColor] = useState<string>(ORDER_PDF_SKETCH_COLOR_SWATCHES[0]);
  const [width, setWidth] = useState<number>(ORDER_PDF_SKETCH_WIDTH_OPTIONS[0] || 2);
  const [activeKey, setActiveKey] = useState<OrderPdfSketchAnnotationPageKey>('renderSketch');
  const [activePalette, setActivePalette] = useState<OrderPdfSketchPaletteKey | null>(null);

  const controlState = useMemo(
    () => resolveOrderPdfSketchControlState({ tool, activePalette }),
    [tool, activePalette]
  );

  useEffect(() => {
    const nextKey = resolveOrderPdfSketchActiveKey({ entries, activeKey });
    if (nextKey !== activeKey) setActiveKey(nextKey);
  }, [entries, activeKey]);

  useEffect(() => {
    if (open) return;
    setActivePalette(null);
  }, [open]);

  const setTool = useCallback(
    (nextTool: OrderPdfSketchTool) => {
      const transition = resolveOrderPdfSketchToolTransition({ lastNonTextTool, nextTool });
      if (isOrderPdfSketchFreehandTool(nextTool)) {
        setFreehandTool(nextTool);
      }
      setLastNonTextTool(transition.nextLastNonTextTool);
      setToolState(transition.nextTool);
    },
    [lastNonTextTool]
  );

  const handleExitTextMode = useCallback(() => {
    setToolState(resolveOrderPdfSketchExitTextTool(lastNonTextTool));
    setActivePalette(null);
  }, [lastNonTextTool]);

  const handleEnterTextMode = useCallback(() => {
    setTool('text');
  }, [setTool]);

  const handleActivateDrawTool = useCallback(() => {
    const { nextTool, nextPalette } = resolveOrderPdfSketchDrawTriggerResult({
      freehandTool,
      activePalette,
    });
    setToolState(nextTool);
    setActivePalette(nextPalette);
  }, [freehandTool, activePalette]);

  const handleToggleWidthPalette = useCallback(() => {
    if (controlState.widthControlDisabled) return;
    setActivePalette(prev => toggleOrderPdfSketchActivePalette(prev, 'width'));
  }, [controlState.widthControlDisabled]);

  const handleToggleColorPalette = useCallback(() => {
    if (controlState.colorControlDisabled) return;
    setActivePalette(prev => toggleOrderPdfSketchActivePalette(prev, 'color'));
  }, [controlState.colorControlDisabled]);

  const handleSelectFreehandTool = useCallback((nextTool: OrderPdfSketchFreehandTool) => {
    setFreehandTool(nextTool);
    setToolState(nextTool);
    setActivePalette(null);
  }, []);

  const handleSelectWidth = useCallback((nextWidth: number) => {
    setWidth(nextWidth);
    setActivePalette(null);
  }, []);

  const handleSelectColor = useCallback((nextColor: string) => {
    setColor(nextColor);
    setActivePalette(null);
  }, []);

  return {
    tool,
    freehandTool,
    color,
    width,
    activeKey,
    activePalette,
    setActiveKey,
    setActivePalette,
    setTool,
    handleEnterTextMode,
    handleExitTextMode,
    handleActivateDrawTool,
    handleToggleWidthPalette,
    handleToggleColorPalette,
    handleSelectFreehandTool,
    handleSelectWidth,
    handleSelectColor,
    ...controlState,
  };
}
