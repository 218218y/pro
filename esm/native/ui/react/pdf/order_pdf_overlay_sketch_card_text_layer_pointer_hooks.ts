import { useCallback, useEffect, useMemo } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

import { useOrderPdfSketchTextLayerBoxPointerHooks } from './order_pdf_overlay_sketch_card_text_layer_pointer_box_hooks.js';
import { useOrderPdfSketchTextLayerCanvasPointerHooks } from './order_pdf_overlay_sketch_card_text_layer_pointer_canvas_hooks.js';
import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import { resolveOrderPdfSketchCreateRectStyle } from './order_pdf_overlay_sketch_card_text_layer_runtime.js';
import type { OrderPdfSketchCardTextLayerPointerHooksArgs } from './order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared.js';
import {
  useOrderPdfSketchTextLayerCreateSession,
  useOrderPdfSketchTextLayerInteractionSession,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.js';

type OrderPdfSketchCardTextLayerPointerHooksResult = {
  createRectStyle: CSSProperties | null;
  interactionPreviewBox: OrderPdfSketchTextBox | null;
  clearInteractionPreviewBox: () => void;
  resetInteractionState: () => void;
  handleBoxPointerDown: (textBox: OrderPdfSketchTextBox, event: ReactPointerEvent<HTMLDivElement>) => void;
  handleCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleResizeHandlePointerDown: (
    textBox: OrderPdfSketchTextBox,
    dir: string,
    event: ReactPointerEvent<HTMLDivElement>
  ) => void;
};

export function useOrderPdfSketchCardTextLayerPointerHooks(
  args: OrderPdfSketchCardTextLayerPointerHooksArgs
): OrderPdfSketchCardTextLayerPointerHooksResult {
  const {
    activeTextBoxId,
    clearActiveTextBox,
    closeTextBoxPalettes,
    commitTextBoxByIdRef,
    entryKey,
    focusTextBoxEditor,
    getHostRect,
    hostRef,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    persistLiveTextBox,
    readEditorText,
    setActiveTextBoxId,
    textMode,
  } = args;
  const {
    interactionPreviewBox,
    clearInteractionPreviewBox,
    resetInteractionSession,
    setInteractionSession,
  } = useOrderPdfSketchTextLayerInteractionSession({
    hostRef,
    persistLiveTextBox,
  });
  const {
    createSession,
    createSessionRef,
    cancelScheduledCreateSessionFrame,
    flushCreateSessionPoint,
    resetCreateSession,
    scheduleCreateSessionPoint,
    setCreateSessionState,
  } = useOrderPdfSketchTextLayerCreateSession({ hostRef });

  const resetInteractionState = useCallback(() => {
    resetCreateSession();
    resetInteractionSession();
  }, [resetCreateSession, resetInteractionSession]);

  useEffect(() => {
    if (textMode) return;
    resetInteractionState();
    closeTextBoxPalettes();
    if (activeTextBoxId) {
      commitTextBoxByIdRef.current?.(activeTextBoxId);
      setActiveTextBoxId(null);
    }
  }, [
    activeTextBoxId,
    closeTextBoxPalettes,
    commitTextBoxByIdRef,
    resetInteractionState,
    setActiveTextBoxId,
    textMode,
  ]);

  const boxHooks = useOrderPdfSketchTextLayerBoxPointerHooks({
    closeTextBoxPalettes,
    entryKey,
    getHostRect,
    onSelect,
    persistLiveTextBox,
    readEditorText,
    setActiveTextBoxId,
    setInteractionSession,
    textMode,
  });

  const canvasHooks = useOrderPdfSketchTextLayerCanvasPointerHooks({
    activeTextBoxId,
    clearActiveTextBox,
    clearInteractionPreviewBox,
    closeTextBoxPalettes,
    commitTextBoxByIdRef,
    cancelScheduledCreateSessionFrame,
    createSessionRef,
    entryKey,
    flushCreateSessionPoint,
    focusTextBoxEditor,
    getHostRect,
    onExitTextMode,
    onSelect,
    onUpsertTextBox,
    scheduleCreateSessionPoint,
    setActiveTextBoxId,
    setCreateSessionState,
    textMode,
  });

  const createRectStyle = useMemo(
    () => resolveOrderPdfSketchCreateRectStyle({ createSession, textMode }),
    [createSession, textMode]
  );

  return {
    createRectStyle,
    interactionPreviewBox,
    clearInteractionPreviewBox,
    resetInteractionState,
    handleBoxPointerDown: boxHooks.handleBoxPointerDown,
    handleCanvasPointerDown: canvasHooks.handleCanvasPointerDown,
    handleCanvasPointerMove: canvasHooks.handleCanvasPointerMove,
    handleCanvasPointerFinish: canvasHooks.handleCanvasPointerFinish,
    handleResizeHandlePointerDown: boxHooks.handleResizeHandlePointerDown,
  };
}
