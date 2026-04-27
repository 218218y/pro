import { useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import {
  createOrderPdfSketchTextLayerInteractionPreview,
  isOrderPdfSketchTextBoxChromeTarget,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_runtime.js';
import {
  preventOrderPdfSketchPointerEvent,
  type OrderPdfSketchCardTextLayerPointerHooksArgs,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared.js';
import type { OrderPdfSketchTextLayerInteractionSession } from './order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.js';

type OrderPdfSketchTextLayerBoxHooksArgs = Pick<
  OrderPdfSketchCardTextLayerPointerHooksArgs,
  | 'closeTextBoxPalettes'
  | 'entryKey'
  | 'getHostRect'
  | 'onSelect'
  | 'persistLiveTextBox'
  | 'readEditorText'
  | 'setActiveTextBoxId'
> & {
  textMode: boolean;
  setInteractionSession: (value: OrderPdfSketchTextLayerInteractionSession | null) => void;
};

export function useOrderPdfSketchTextLayerBoxPointerHooks(args: OrderPdfSketchTextLayerBoxHooksArgs) {
  const {
    closeTextBoxPalettes,
    entryKey,
    getHostRect,
    onSelect,
    persistLiveTextBox,
    readEditorText,
    setActiveTextBoxId,
    setInteractionSession,
    textMode,
  } = args;
  const startTextBoxInteractionRef = useRef<
    | ((textBox: OrderPdfSketchTextBox, dir: string | null, event: ReactPointerEvent<HTMLDivElement>) => void)
    | null
  >(null);

  const startTextBoxInteraction = useCallback(
    (textBox: OrderPdfSketchTextBox, dir: string | null, event: ReactPointerEvent<HTMLDivElement>) => {
      if (!textMode || typeof event.pointerId !== 'number') return;
      const previewStart = createOrderPdfSketchTextLayerInteractionPreview({
        textBox,
        liveText: readEditorText(textBox.id, textBox.text),
        dir,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        surfaceRect: getHostRect('fresh'),
      });
      if (!previewStart) return;
      onSelect(entryKey);
      setActiveTextBoxId(textBox.id);
      closeTextBoxPalettes();
      setInteractionSession(previewStart.previewSession);
      persistLiveTextBox(previewStart.liveSource, false);
      preventOrderPdfSketchPointerEvent(event);
    },
    [
      closeTextBoxPalettes,
      entryKey,
      getHostRect,
      onSelect,
      persistLiveTextBox,
      readEditorText,
      setActiveTextBoxId,
      setInteractionSession,
      textMode,
    ]
  );

  startTextBoxInteractionRef.current = startTextBoxInteraction;

  const handleBoxPointerDown = useCallback(
    (textBox: OrderPdfSketchTextBox, event: ReactPointerEvent<HTMLDivElement>) => {
      if (!textMode || isOrderPdfSketchTextBoxChromeTarget(event.target)) return;
      startTextBoxInteractionRef.current?.(textBox, null, event);
    },
    [textMode]
  );

  const handleResizeHandlePointerDown = useCallback(
    (textBox: OrderPdfSketchTextBox, dir: string, event: ReactPointerEvent<HTMLDivElement>) => {
      startTextBoxInteractionRef.current?.(textBox, dir, event);
    },
    []
  );

  return {
    handleBoxPointerDown,
    handleResizeHandlePointerDown,
  };
}
