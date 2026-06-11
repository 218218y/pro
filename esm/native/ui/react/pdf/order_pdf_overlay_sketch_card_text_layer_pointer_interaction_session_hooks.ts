import { useCallback, useEffect, useRef, useState } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import { getNodeWindow } from '../viewport_layout_runtime.js';
import { composeDomEventCleanups, installDomEventListener } from '../effects/dom_event_cleanup.js';
import { updateOrderPdfSketchTextBoxInteractionPreview } from './order_pdf_overlay_sketch_text_box_interaction_preview.js';
import type {
  OrderPdfSketchClientPoint,
  OrderPdfSketchTextLayerInteractionSession,
  OrderPdfSketchTextLayerInteractionSessionArgs,
  OrderPdfSketchTextLayerInteractionSessionResult,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks_types.js';

export function useOrderPdfSketchTextLayerInteractionSession(
  args: OrderPdfSketchTextLayerInteractionSessionArgs
): OrderPdfSketchTextLayerInteractionSessionResult {
  const { hostRef, persistLiveTextBox } = args;
  const interactionRef = useRef<OrderPdfSketchTextLayerInteractionSession | null>(null);
  const interactionFrameRef = useRef<number>(0);
  const interactionPointRef = useRef<OrderPdfSketchClientPoint | null>(null);
  const [interactionSession, setInteractionSession] =
    useState<OrderPdfSketchTextLayerInteractionSession | null>(null);
  const [interactionPreviewBox, setInteractionPreviewBox] = useState<OrderPdfSketchTextBox | null>(null);

  const setInteractionSessionState = useCallback((next: OrderPdfSketchTextLayerInteractionSession | null) => {
    interactionRef.current = next;
    setInteractionSession(next);
    setInteractionPreviewBox(next?.previewBox || null);
  }, []);

  const applyInteractionPoint = useCallback((point: OrderPdfSketchClientPoint | null) => {
    const activeSession = interactionRef.current;
    if (!activeSession || !point) return activeSession;
    const nextSession = updateOrderPdfSketchTextBoxInteractionPreview({
      preview: activeSession,
      clientX: point.clientX,
      clientY: point.clientY,
    });
    if (nextSession === activeSession) return activeSession;
    interactionRef.current = nextSession;
    setInteractionSession(prev => (prev === nextSession ? prev : nextSession));
    setInteractionPreviewBox(prev => (prev === nextSession.previewBox ? prev : nextSession.previewBox));
    return nextSession;
  }, []);

  const cancelScheduledInteractionFrame = useCallback(() => {
    const win = getNodeWindow(hostRef.current);
    if (win && interactionFrameRef.current && typeof win.cancelAnimationFrame === 'function') {
      win.cancelAnimationFrame(interactionFrameRef.current);
    }
    interactionFrameRef.current = 0;
    interactionPointRef.current = null;
  }, [hostRef]);

  const scheduleInteractionPoint = useCallback(
    (point: OrderPdfSketchClientPoint) => {
      interactionPointRef.current = point;
      const win = getNodeWindow(hostRef.current);
      if (!win || typeof win.requestAnimationFrame !== 'function') {
        const nextPoint = interactionPointRef.current;
        interactionPointRef.current = null;
        applyInteractionPoint(nextPoint);
        return;
      }
      if (interactionFrameRef.current) return;
      interactionFrameRef.current = win.requestAnimationFrame(() => {
        interactionFrameRef.current = 0;
        const nextPoint = interactionPointRef.current;
        interactionPointRef.current = null;
        applyInteractionPoint(nextPoint);
      });
    },
    [applyInteractionPoint, hostRef]
  );

  const flushInteractionPoint = useCallback(
    (point: OrderPdfSketchClientPoint | null) => {
      const win = getNodeWindow(hostRef.current);
      if (win && interactionFrameRef.current && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(interactionFrameRef.current);
      }
      interactionFrameRef.current = 0;
      const nextPoint = point || interactionPointRef.current;
      interactionPointRef.current = null;
      return applyInteractionPoint(nextPoint);
    },
    [applyInteractionPoint, hostRef]
  );

  const resetInteractionSession = useCallback(() => {
    cancelScheduledInteractionFrame();
    setInteractionSessionState(null);
  }, [cancelScheduledInteractionFrame, setInteractionSessionState]);

  useEffect(() => {
    if (!interactionSession) return;
    const win = getNodeWindow(hostRef.current);
    if (!win) return;

    const finishInteraction = (event: globalThis.PointerEvent) => {
      const activeSession = interactionRef.current;
      if (!activeSession || event.pointerId !== activeSession.interaction.pointerId) return;
      const nextSession =
        flushInteractionPoint({ clientX: event.clientX, clientY: event.clientY }) || activeSession;
      interactionRef.current = null;
      setInteractionSession(null);
      setInteractionPreviewBox(null);
      persistLiveTextBox(nextSession.previewBox, false);
      try {
        event.preventDefault();
      } catch {
        // ignore
      }
    };

    const onPointerMove = (event: globalThis.PointerEvent) => {
      const activeSession = interactionRef.current;
      if (!activeSession || event.pointerId !== activeSession.interaction.pointerId) return;
      scheduleInteractionPoint({ clientX: event.clientX, clientY: event.clientY });
      try {
        event.preventDefault();
      } catch {
        // ignore
      }
    };

    const cleanupPointerEvents = composeDomEventCleanups([
      installDomEventListener({
        target: win,
        type: 'pointermove',
        listener: onPointerMove as EventListener,
        options: true,
        label: 'orderPdfTextLayer:pointermove',
      }),
      installDomEventListener({
        target: win,
        type: 'pointerup',
        listener: finishInteraction as EventListener,
        options: true,
        label: 'orderPdfTextLayer:pointerup',
      }),
      installDomEventListener({
        target: win,
        type: 'pointercancel',
        listener: finishInteraction as EventListener,
        options: true,
        label: 'orderPdfTextLayer:pointercancel',
      }),
    ]);
    return () => {
      cancelScheduledInteractionFrame();
      cleanupPointerEvents();
    };
  }, [
    cancelScheduledInteractionFrame,
    flushInteractionPoint,
    hostRef,
    interactionSession,
    persistLiveTextBox,
    scheduleInteractionPoint,
  ]);

  useEffect(() => {
    return () => {
      cancelScheduledInteractionFrame();
    };
  }, [cancelScheduledInteractionFrame]);

  return {
    interactionPreviewBox,
    clearInteractionPreviewBox: () => setInteractionPreviewBox(null),
    resetInteractionSession,
    setInteractionSession: setInteractionSessionState,
  };
}
