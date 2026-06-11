import {
  buildOrderPdfDrawingPointFromClient,
  normalizeOrderPdfDrawingRect,
  type DrawingPoint,
  type DrawingRect,
} from './order_pdf_overlay_sketch_panel_runtime.js';

export type OrderPdfSketchTextCreateSession = {
  pointerId: number;
  start: DrawingPoint;
  current: DrawingPoint;
  startClientX: number;
  startClientY: number;
  surfaceRect: DrawingRect;
};

function cloneOrderPdfDrawingPoint(point: DrawingPoint): DrawingPoint {
  return { x: point.x, y: point.y };
}

export function createOrderPdfSketchTextCreateSession(args: {
  pointerId: number;
  start: DrawingPoint;
  startClientX: number;
  startClientY: number;
  surfaceRect: DrawingRect | null | undefined;
}): OrderPdfSketchTextCreateSession | null {
  const { pointerId, start, startClientX, startClientY } = args;
  const surfaceRect = normalizeOrderPdfDrawingRect(args.surfaceRect);
  if (!surfaceRect) return null;
  return {
    pointerId,
    start: cloneOrderPdfDrawingPoint(start),
    current: cloneOrderPdfDrawingPoint(start),
    startClientX,
    startClientY,
    surfaceRect,
  };
}

export function updateOrderPdfSketchTextCreateSession(args: {
  session: OrderPdfSketchTextCreateSession;
  clientX: number;
  clientY: number;
}): OrderPdfSketchTextCreateSession {
  const { session, clientX, clientY } = args;
  const point = buildOrderPdfDrawingPointFromClient({
    clientX,
    clientY,
    rect: session.surfaceRect,
  });
  if (!point) return session;
  if (Object.is(point.x, session.current.x) && Object.is(point.y, session.current.y)) return session;
  return {
    ...session,
    current: point,
  };
}

export function resolveOrderPdfSketchTextCreateSessionPoint(args: {
  session: OrderPdfSketchTextCreateSession;
  clientX: number;
  clientY: number;
}): DrawingPoint {
  const { session, clientX, clientY } = args;
  return (
    buildOrderPdfDrawingPointFromClient({
      clientX,
      clientY,
      rect: session.surfaceRect,
    }) || session.current
  );
}
