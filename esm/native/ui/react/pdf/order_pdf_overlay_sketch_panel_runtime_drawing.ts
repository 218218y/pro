import type {
  OrderPdfSketchPoint,
  OrderPdfSketchStroke,
  OrderPdfSketchStrokeTool,
  OrderPdfSketchTool,
} from './order_pdf_overlay_contracts.js';
import {
  buildOrderPdfSketchShapePoints,
  isOrderPdfSketchShapeTool,
  type OrderPdfSketchSurfaceSize,
} from './order_pdf_overlay_sketch_annotation_state_runtime.js';

export type DrawingPoint = { x: number; y: number };
export type DrawingRect = { left: number; top: number; width: number; height: number };
type ClientPointLike = { clientX: number; clientY: number };
type DrawingRectLike = Pick<DrawingRect, 'left' | 'top' | 'width' | 'height'>;

const DEFAULT_ORDER_PDF_DRAWING_POINT_EPSILON = 0.0005;

export function normalizeOrderPdfDrawingRect(rect: DrawingRectLike | null | undefined): DrawingRect | null {
  if (!rect) return null;
  const { left, top, width, height } = rect;
  if (![left, top, width, height].every(value => Number.isFinite(value))) return null;
  return { left, top, width, height };
}

export function readOrderPdfDrawingRect(element: Element | null | undefined): DrawingRect | null {
  if (!element || typeof element.getBoundingClientRect !== 'function') return null;
  return normalizeOrderPdfDrawingRect(element.getBoundingClientRect());
}

export function areOrderPdfDrawingRectsEqual(
  prev: DrawingRect | null | undefined,
  next: DrawingRect | null | undefined
): boolean {
  return (
    prev === next ||
    (!!prev &&
      !!next &&
      Object.is(prev.left, next.left) &&
      Object.is(prev.top, next.top) &&
      Object.is(prev.width, next.width) &&
      Object.is(prev.height, next.height))
  );
}

export function areOrderPdfDrawingRectSizesEqual(
  prev: DrawingRect | null | undefined,
  next: DrawingRect | null | undefined
): boolean {
  return (
    prev === next ||
    (!!prev && !!next && Object.is(prev.width, next.width) && Object.is(prev.height, next.height))
  );
}

export function buildOrderPdfSketchSurfaceSizeFromDrawingRect(
  rect: DrawingRect | null | undefined
): OrderPdfSketchSurfaceSize | null {
  if (!rect) return null;
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    width: rect.width,
    height: rect.height,
  };
}

export function buildOrderPdfStrokeFromDrawingPoints(args: {
  tool: OrderPdfSketchStrokeTool;
  color: string;
  width: number;
  points: readonly OrderPdfSketchPoint[];
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
}): OrderPdfSketchStroke | null {
  const { tool, color, width } = args;
  const sourcePoints = Array.isArray(args.points) ? args.points : [];
  const resolvedPoints = isOrderPdfSketchShapeTool(tool)
    ? buildOrderPdfSketchShapePoints({ tool, points: sourcePoints, surfaceSize: args.surfaceSize })
    : sourcePoints.map(point => ({ x: point.x, y: point.y }));
  if (!resolvedPoints.length) return null;
  return {
    tool,
    color,
    width,
    points: resolvedPoints,
  };
}

export function buildOrderPdfDrawingPointFromClient(args: {
  clientX: number;
  clientY: number;
  rect: DrawingRect | null | undefined;
}): DrawingPoint | null {
  const { clientX, clientY, rect } = args;
  if (!rect) return null;
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

export function appendOrderPdfDrawingPointsFromClientBatch(args: {
  points: DrawingPoint[];
  events: readonly ClientPointLike[];
  rect: DrawingRect | null | undefined;
  epsilon?: number;
}): boolean {
  const { points, events, rect, epsilon } = args;
  if (!rect || !events.length) return false;
  let changed = false;
  for (const rawEvent of events) {
    const point = buildOrderPdfDrawingPointFromClient({
      clientX: rawEvent.clientX,
      clientY: rawEvent.clientY,
      rect,
    });
    if (!point) continue;
    if (appendUniqueOrderPdfDrawingPoint(points, point, epsilon)) changed = true;
  }
  return changed;
}

export function updateOrderPdfDrawingPointsFromClientBatch(args: {
  tool: OrderPdfSketchTool;
  points: DrawingPoint[];
  events: readonly ClientPointLike[];
  rect: DrawingRect | null | undefined;
  epsilon?: number;
}): boolean {
  const { tool, points, events, rect, epsilon } = args;
  if (!isOrderPdfSketchShapeTool(tool)) {
    return appendOrderPdfDrawingPointsFromClientBatch({ points, events, rect, epsilon });
  }
  if (!rect || !events.length) return false;
  const resolvedPoints: DrawingPoint[] = [];
  for (const rawEvent of events) {
    const point = buildOrderPdfDrawingPointFromClient({
      clientX: rawEvent.clientX,
      clientY: rawEvent.clientY,
      rect,
    });
    if (point) resolvedPoints.push(point);
  }
  if (!resolvedPoints.length) return false;
  const anchorPoint = resolvedPoints[0];
  const point = resolvedPoints[resolvedPoints.length - 1];
  if (!points.length) {
    points.push(anchorPoint);
    if (resolvedPoints.length === 1) return true;
    return appendUniqueOrderPdfDrawingPoint(points, point, epsilon) || true;
  }
  if (points.length === 1) {
    return appendUniqueOrderPdfDrawingPoint(points, point, epsilon);
  }
  const prev = points[1];
  const safeEpsilon = epsilon || DEFAULT_ORDER_PDF_DRAWING_POINT_EPSILON;
  if (prev && Math.abs(prev.x - point.x) < safeEpsilon && Math.abs(prev.y - point.y) < safeEpsilon) {
    return false;
  }
  points[1] = point;
  return true;
}

export function appendUniqueOrderPdfDrawingPoint(
  points: DrawingPoint[],
  point: DrawingPoint,
  epsilon: number = DEFAULT_ORDER_PDF_DRAWING_POINT_EPSILON
): boolean {
  const prev = points[points.length - 1];
  if (prev && Math.abs(prev.x - point.x) < epsilon && Math.abs(prev.y - point.y) < epsilon) {
    return false;
  }
  points.push(point);
  return true;
}
