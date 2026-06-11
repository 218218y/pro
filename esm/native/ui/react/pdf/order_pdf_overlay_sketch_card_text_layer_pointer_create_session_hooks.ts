import { useCallback, useEffect, useRef, useState } from 'react';

import { getNodeWindow } from '../viewport_layout_runtime.js';
import { updateOrderPdfSketchTextCreateSession } from './order_pdf_overlay_sketch_text_box_create_interaction.js';
import type {
  OrderPdfSketchClientPoint,
  OrderPdfSketchTextLayerCreateSession,
  OrderPdfSketchTextLayerCreateSessionArgs,
  OrderPdfSketchTextLayerCreateSessionResult,
} from './order_pdf_overlay_sketch_card_text_layer_pointer_session_hooks_types.js';

export function useOrderPdfSketchTextLayerCreateSession(
  args: OrderPdfSketchTextLayerCreateSessionArgs
): OrderPdfSketchTextLayerCreateSessionResult {
  const { hostRef } = args;
  const createSessionRef = useRef<OrderPdfSketchTextLayerCreateSession | null>(null);
  const createSessionFrameRef = useRef<number>(0);
  const createSessionPointRef = useRef<OrderPdfSketchClientPoint | null>(null);
  const [createSession, setCreateSession] = useState<OrderPdfSketchTextLayerCreateSession | null>(null);

  const setCreateSessionState = useCallback((next: OrderPdfSketchTextLayerCreateSession | null) => {
    createSessionRef.current = next;
    setCreateSession(next);
  }, []);

  const applyCreateSessionPoint = useCallback((point: OrderPdfSketchClientPoint | null) => {
    const activeSession = createSessionRef.current;
    if (!activeSession || !point) return activeSession;
    const nextSession = updateOrderPdfSketchTextCreateSession({
      session: activeSession,
      clientX: point.clientX,
      clientY: point.clientY,
    });
    if (nextSession === activeSession) return activeSession;
    createSessionRef.current = nextSession;
    setCreateSession(nextSession);
    return nextSession;
  }, []);

  const cancelScheduledCreateSessionFrame = useCallback(() => {
    const win = getNodeWindow(hostRef.current);
    if (win && createSessionFrameRef.current && typeof win.cancelAnimationFrame === 'function') {
      win.cancelAnimationFrame(createSessionFrameRef.current);
    }
    createSessionFrameRef.current = 0;
    createSessionPointRef.current = null;
  }, [hostRef]);

  const scheduleCreateSessionPoint = useCallback(
    (point: OrderPdfSketchClientPoint) => {
      createSessionPointRef.current = point;
      const win = getNodeWindow(hostRef.current);
      if (!win || typeof win.requestAnimationFrame !== 'function') {
        const nextPoint = createSessionPointRef.current;
        createSessionPointRef.current = null;
        applyCreateSessionPoint(nextPoint);
        return;
      }
      if (createSessionFrameRef.current) return;
      createSessionFrameRef.current = win.requestAnimationFrame(() => {
        createSessionFrameRef.current = 0;
        const nextPoint = createSessionPointRef.current;
        createSessionPointRef.current = null;
        applyCreateSessionPoint(nextPoint);
      });
    },
    [applyCreateSessionPoint, hostRef]
  );

  const flushCreateSessionPoint = useCallback(
    (point: OrderPdfSketchClientPoint | null) => {
      const win = getNodeWindow(hostRef.current);
      if (win && createSessionFrameRef.current && typeof win.cancelAnimationFrame === 'function') {
        win.cancelAnimationFrame(createSessionFrameRef.current);
      }
      createSessionFrameRef.current = 0;
      const nextPoint = point || createSessionPointRef.current;
      createSessionPointRef.current = null;
      return applyCreateSessionPoint(nextPoint);
    },
    [applyCreateSessionPoint, hostRef]
  );

  const resetCreateSession = useCallback(() => {
    cancelScheduledCreateSessionFrame();
    setCreateSessionState(null);
  }, [cancelScheduledCreateSessionFrame, setCreateSessionState]);

  useEffect(() => {
    return () => {
      cancelScheduledCreateSessionFrame();
    };
  }, [cancelScheduledCreateSessionFrame]);

  return {
    createSession,
    createSessionRef,
    cancelScheduledCreateSessionFrame,
    flushCreateSessionPoint,
    resetCreateSession,
    scheduleCreateSessionPoint,
    setCreateSessionState,
  };
}
