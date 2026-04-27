import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

import { getNodeWindow } from '../viewport_layout_runtime.js';
import type { OrderPdfSketchStroke, OrderPdfSketchTextBox } from './order_pdf_overlay_contracts.js';
import type { DrawingRect } from './order_pdf_overlay_sketch_panel_runtime.js';
import {
  nextOrderPdfSketchCanvasFrameVersion,
  paintOrderPdfSketchCanvasFrame,
  resolveOrderPdfSketchCanvasDrawState,
  resolveOrderPdfSketchCanvasRect,
  shouldRepaintOrderPdfSketchCanvas,
  shouldRunOrderPdfSketchCanvasFrame,
  type OrderPdfSketchCanvasDrawState,
} from './order_pdf_overlay_sketch_panel_canvas_runtime.js';

type CachedCanvasRect = {
  host: HTMLDivElement | null;
  rect: DrawingRect;
};

export function useCanvasRedraw(args: {
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  hostRef: MutableRefObject<HTMLDivElement | null>;
  hostRect: DrawingRect | null;
  refreshHostRect: () => DrawingRect | null;
  strokes: OrderPdfSketchStroke[];
  textBoxes: OrderPdfSketchTextBox[];
  pendingStrokeRef: MutableRefObject<OrderPdfSketchStroke | null>;
}) {
  const { canvasRef, hostRef, hostRect, refreshHostRect, strokes, textBoxes, pendingStrokeRef } = args;
  const frameRef = useRef<number>(0);
  const frameVersionRef = useRef<number>(0);
  const strokesRef = useRef(strokes);
  const textBoxesRef = useRef(textBoxes);
  const lastDrawRef = useRef<OrderPdfSketchCanvasDrawState | null>(null);
  const cachedRectRef = useRef<CachedCanvasRect | null>(null);

  const invalidateScheduledFrame = useCallback(() => {
    frameVersionRef.current = nextOrderPdfSketchCanvasFrameVersion(frameVersionRef.current);
  }, []);

  const cancelScheduledFrame = useCallback(() => {
    invalidateScheduledFrame();
    const win = getNodeWindow(hostRef.current || canvasRef.current);
    if (win && frameRef.current) {
      win.cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = 0;
  }, [canvasRef, hostRef, invalidateScheduledFrame]);

  const redrawNow = useCallback(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const rect = resolveOrderPdfSketchCanvasRect({
      host,
      measuredRect: hostRect,
      cachedRect: cachedRectRef.current?.host === host ? cachedRectRef.current.rect : null,
      refreshRect: refreshHostRect,
    });
    if (!rect) return;
    cachedRectRef.current = { host, rect };
    const win = getNodeWindow(host);
    const nextDraw = resolveOrderPdfSketchCanvasDrawState({
      host,
      canvas,
      rect,
      devicePixelRatio: win?.devicePixelRatio ?? 1,
      strokes: strokesRef.current,
      textBoxes: textBoxesRef.current,
      pendingStroke: pendingStrokeRef.current,
    });
    if (!shouldRepaintOrderPdfSketchCanvas({ prev: lastDrawRef.current, next: nextDraw })) return;
    if (!paintOrderPdfSketchCanvasFrame(nextDraw)) return;
    lastDrawRef.current = nextDraw;
  }, [canvasRef, hostRect, hostRef, pendingStrokeRef, refreshHostRect]);

  const scheduleRedraw = useCallback(() => {
    const win = getNodeWindow(hostRef.current || canvasRef.current);
    if (!win) {
      redrawNow();
      return;
    }
    if (frameRef.current) return;
    const version = nextOrderPdfSketchCanvasFrameVersion(frameVersionRef.current);
    frameVersionRef.current = version;
    frameRef.current = win.requestAnimationFrame(() => {
      frameRef.current = 0;
      if (
        !shouldRunOrderPdfSketchCanvasFrame({
          scheduledVersion: version,
          activeVersion: frameVersionRef.current,
        })
      ) {
        return;
      }
      redrawNow();
    });
  }, [canvasRef, hostRef, redrawNow]);

  useLayoutEffect(() => {
    strokesRef.current = strokes;
    scheduleRedraw();
  }, [scheduleRedraw, strokes]);

  useLayoutEffect(() => {
    textBoxesRef.current = textBoxes;
    scheduleRedraw();
  }, [scheduleRedraw, textBoxes]);

  useLayoutEffect(() => {
    if (hostRect && hostRef.current) {
      cachedRectRef.current = { host: hostRef.current, rect: hostRect };
    }
    scheduleRedraw();
  }, [hostRect?.width, hostRect?.height, hostRef, hostRect, scheduleRedraw]);

  useEffect(() => {
    return () => {
      cancelScheduledFrame();
      cachedRectRef.current = null;
      lastDrawRef.current = null;
    };
  }, [cancelScheduledFrame]);

  return scheduleRedraw;
}
