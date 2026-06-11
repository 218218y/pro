import { useCallback } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import {
  resolveOrderPdfSketchTextLayerCanvasPointerAction,
  resolveOrderPdfSketchTextLayerCreateCommitAction,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_runtime.js';
import {
  preventOrderPdfSketchPointerEvent,
  tryReleaseOrderPdfSketchPointerCapture,
  trySetOrderPdfSketchPointerCapture,
  type OrderPdfSketchCardTextLayerPointerHooksArgs,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_hooks_shared.js';
import type { OrderPdfSketchTextLayerCreateSession } from './order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks.js';

type OrderPdfSketchTextLayerCanvasHooksArgs = Pick<
  OrderPdfSketchCardTextLayerPointerHooksArgs,
  | 'activeTextBoxId'
  | 'clearActiveTextBox'
  | 'closeTextBoxPalettes'
  | 'commitTextBoxByIdRef'
  | 'entryKey'
  | 'getHostRect'
  | 'onExitTextMode'
  | 'onSelect'
  | 'onUpsertTextBox'
  | 'setActiveTextBoxId'
> & {
  textMode: boolean;
  clearInteractionPreviewBox: () => void;
  cancelScheduledCreateSessionFrame: () => void;
  createSessionRef: MutableRefObject<OrderPdfSketchTextLayerCreateSession | null>;
  flushCreateSessionPoint: (point: {
    clientX: number;
    clientY: number;
  }) => OrderPdfSketchTextLayerCreateSession | null;
  focusTextBoxEditor: (id: string) => void;
  scheduleCreateSessionPoint: (point: { clientX: number; clientY: number }) => void;
  setCreateSessionState: (session: OrderPdfSketchTextLayerCreateSession | null) => void;
};

export function useOrderPdfSketchTextLayerCanvasPointerHooks(args: OrderPdfSketchTextLayerCanvasHooksArgs) {
  const {
    activeTextBoxId,
    cancelScheduledCreateSessionFrame,
    clearActiveTextBox,
    clearInteractionPreviewBox,
    closeTextBoxPalettes,
    commitTextBoxByIdRef,
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
  } = args;

  const handleCanvasPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      onSelect(entryKey);
      const action = resolveOrderPdfSketchTextLayerCanvasPointerAction({
        activeTextBoxId,
        textMode,
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        rect: getHostRect('fresh'),
      });
      if (action.kind === 'draw') return false;
      if (action.kind === 'commit-exit') {
        commitTextBoxByIdRef.current?.(action.activeTextBoxId);
        clearActiveTextBox();
        onExitTextMode();
        preventOrderPdfSketchPointerEvent(event);
        return true;
      }
      if (action.kind === 'start-create') {
        clearInteractionPreviewBox();
        cancelScheduledCreateSessionFrame();
        setCreateSessionState(action.session);
        trySetOrderPdfSketchPointerCapture(event.currentTarget, event.pointerId);
      }
      preventOrderPdfSketchPointerEvent(event);
      return true;
    },
    [
      activeTextBoxId,
      cancelScheduledCreateSessionFrame,
      clearActiveTextBox,
      clearInteractionPreviewBox,
      commitTextBoxByIdRef,
      entryKey,
      getHostRect,
      onExitTextMode,
      onSelect,
      setCreateSessionState,
      textMode,
    ]
  );

  const handleCanvasPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const activeCreateSession = createSessionRef.current;
      if (!activeCreateSession) return false;
      if (activeCreateSession.pointerId !== event.pointerId) return true;
      scheduleCreateSessionPoint({ clientX: event.clientX, clientY: event.clientY });
      event.preventDefault();
      return true;
    },
    [createSessionRef, scheduleCreateSessionPoint]
  );

  const handleCanvasPointerFinish = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const activeCreateSession = createSessionRef.current;
      if (!activeCreateSession) return false;
      if (activeCreateSession.pointerId !== event.pointerId) return true;
      tryReleaseOrderPdfSketchPointerCapture(event.currentTarget, event.pointerId);
      const nextSession =
        flushCreateSessionPoint({ clientX: event.clientX, clientY: event.clientY }) || activeCreateSession;
      setCreateSessionState(null);
      const action = resolveOrderPdfSketchTextLayerCreateCommitAction({
        session: nextSession,
        clientX: event.clientX,
        clientY: event.clientY,
      });
      if (action.kind === 'create') {
        onUpsertTextBox(entryKey, action.textBox);
        setActiveTextBoxId(action.textBox.id);
        closeTextBoxPalettes();
        focusTextBoxEditor(action.textBox.id);
      }
      event.preventDefault();
      return true;
    },
    [
      closeTextBoxPalettes,
      createSessionRef,
      entryKey,
      flushCreateSessionPoint,
      focusTextBoxEditor,
      onUpsertTextBox,
      setActiveTextBoxId,
      setCreateSessionState,
    ]
  );

  return {
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerFinish,
  };
}
