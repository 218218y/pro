import { useCallback, useRef } from 'react';
import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';

import type { OrderPdfSketchAnnotationPageKey, OrderPdfSketchStroke } from './order_pdf_overlay_contracts.js';
import {
  updateOrderPdfDrawingPointsFromClientBatch,
  type DrawingPoint,
  type DrawingRect,
} from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  resolveOrderPdfSketchCardPendingStroke,
  shouldCommitOrderPdfSketchCardStroke,
  type OrderPdfSketchCardDrawConfig,
} from './order_pdf_overlay_sketch_card_runtime.js';

type OrderPdfSketchCardDrawingTextLayerHandlers = {
  handleCanvasPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
  handleCanvasPointerFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => boolean;
};

type OrderPdfSketchCardDrawingHooksArgs = {
  entryKey: OrderPdfSketchAnnotationPageKey;
  drawConfigRef: MutableRefObject<OrderPdfSketchCardDrawConfig>;
  getHostRect: (mode?: 'cached' | 'fresh') => DrawingRect | null;
  committedStrokeCount: number;
  pendingStrokeRef: MutableRefObject<OrderPdfSketchStroke | null>;
  redraw: () => void;
  textLayer: OrderPdfSketchCardDrawingTextLayerHandlers;
  onCommitStroke: (key: OrderPdfSketchAnnotationPageKey, stroke: OrderPdfSketchStroke) => void;
  onSelect: (key: OrderPdfSketchAnnotationPageKey) => void;
};

type OrderPdfSketchCardDrawingHooksResult = {
  resetPendingStroke: () => void;
  handlePointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  handlePointerFinish: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
};

export function useOrderPdfSketchCardDrawingHooks(
  args: OrderPdfSketchCardDrawingHooksArgs
): OrderPdfSketchCardDrawingHooksResult {
  const {
    committedStrokeCount,
    drawConfigRef,
    entryKey,
    getHostRect,
    onCommitStroke,
    onSelect,
    pendingStrokeRef,
    redraw,
    textLayer,
  } = args;
  const pointerIdRef = useRef<number | null>(null);
  const pendingPointsRef = useRef<DrawingPoint[]>([]);

  const resetPendingStroke = useCallback(() => {
    pointerIdRef.current = null;
    pendingPointsRef.current = [];
    pendingStrokeRef.current = null;
    redraw();
  }, [pendingStrokeRef, redraw]);

  const updatePendingStroke = useCallback(() => {
    pendingStrokeRef.current = resolveOrderPdfSketchCardPendingStroke({
      drawConfig: drawConfigRef.current,
      points: pendingPointsRef.current,
      rect: getHostRect(),
    });
    redraw();
  }, [drawConfigRef, getHostRect, pendingStrokeRef, redraw]);

  const collectPoints = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      const nativeEvent = event.nativeEvent;
      const getCoalescedEvents = Reflect.get(nativeEvent, 'getCoalescedEvents');
      const events =
        typeof getCoalescedEvents === 'function'
          ? (Reflect.apply(getCoalescedEvents, nativeEvent, []) as globalThis.PointerEvent[])
          : [nativeEvent];
      const changed = updateOrderPdfDrawingPointsFromClientBatch({
        tool: drawConfigRef.current.tool,
        points: pendingPointsRef.current,
        events,
        rect: getHostRect(),
      });
      if (changed) updatePendingStroke();
    },
    [drawConfigRef, getHostRect, updatePendingStroke]
  );

  const commitPendingStroke = useCallback(() => {
    const pendingStroke = pendingStrokeRef.current;
    if (
      pendingStroke &&
      shouldCommitOrderPdfSketchCardStroke({ stroke: pendingStroke, committedStrokeCount })
    ) {
      onCommitStroke(entryKey, pendingStroke);
    }
    resetPendingStroke();
  }, [committedStrokeCount, entryKey, onCommitStroke, pendingStrokeRef, resetPendingStroke]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (textLayer.handleCanvasPointerDown(event)) return;
      onSelect(entryKey);
      pointerIdRef.current = event.pointerId;
      pendingPointsRef.current = [];
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // ignore capture errors
      }
      event.preventDefault();
      collectPoints(event);
    },
    [collectPoints, entryKey, onSelect, textLayer]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (textLayer.handleCanvasPointerMove(event)) return;
      if (pointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      collectPoints(event);
    },
    [collectPoints, textLayer]
  );

  const handlePointerFinish = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (textLayer.handleCanvasPointerFinish(event)) return;
      if (pointerIdRef.current !== event.pointerId) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore release failures
      }
      event.preventDefault();
      collectPoints(event);
      commitPendingStroke();
    },
    [collectPoints, commitPendingStroke, textLayer]
  );

  return {
    resetPendingStroke,
    handlePointerDown,
    handlePointerMove,
    handlePointerFinish,
  };
}
