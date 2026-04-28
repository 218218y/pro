import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';

import type { OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import { getNodeWindow } from '../viewport_layout_runtime.js';
import { composeDomEventCleanups, installDomEventListener } from '../effects/dom_event_cleanup.js';
import {
  updateOrderPdfSketchTextBoxInteractionPreview,
  type OrderPdfSketchTextBoxInteractionPreview,
} from './order_pdf_overlay_sketch_text_box_interaction_preview.js';
import {
  updateOrderPdfSketchTextCreateSession,
  type OrderPdfSketchTextCreateSession,
} from './order_pdf_overlay_sketch_text_box_create_interaction.js';

type OrderPdfSketchClientPoint = { clientX: number; clientY: number };

export type OrderPdfSketchTextLayerInteractionSession = OrderPdfSketchTextBoxInteractionPreview;
export type OrderPdfSketchTextLayerCreateSession = OrderPdfSketchTextCreateSession;

type OrderPdfSketchTextLayerInteractionSessionArgs = {
  hostRef: MutableRefObject<HTMLDivElement | null>;
  persistLiveTextBox: (textBox: OrderPdfSketchTextBox, allowDelete: boolean) => boolean;
};

type OrderPdfSketchTextLayerInteractionSessionResult = {
  interactionPreviewBox: OrderPdfSketchTextBox | null;
  clearInteractionPreviewBox: () => void;
  resetInteractionSession: () => void;
  setInteractionSession: (session: OrderPdfSketchTextLayerInteractionSession | null) => void;
};

type OrderPdfSketchTextLayerCreateSessionArgs = {
  hostRef: MutableRefObject<HTMLDivElement | null>;
};

type OrderPdfSketchTextLayerCreateSessionResult = {
  createSession: OrderPdfSketchTextLayerCreateSession | null;
  createSessionRef: MutableRefObject<OrderPdfSketchTextLayerCreateSession | null>;
  cancelScheduledCreateSessionFrame: () => void;
  flushCreateSessionPoint: (
    point: OrderPdfSketchClientPoint | null
  ) => OrderPdfSketchTextLayerCreateSession | null;
  resetCreateSession: () => void;
  scheduleCreateSessionPoint: (point: OrderPdfSketchClientPoint) => void;
  setCreateSessionState: (session: OrderPdfSketchTextLayerCreateSession | null) => void;
};

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
