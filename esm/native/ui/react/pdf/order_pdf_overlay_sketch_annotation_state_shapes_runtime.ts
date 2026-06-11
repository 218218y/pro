import type {
  OrderPdfSketchPoint,
  OrderPdfSketchStroke,
  OrderPdfSketchStrokeTool,
} from './order_pdf_overlay_contracts.js';
import {
  clamp01,
  buildOrderPdfSketchAnnotationId,
  isFiniteNumber,
  isOrderPdfSketchShapeTool,
  isOrderPdfSketchStroke,
  type OrderPdfSketchSurfaceSize,
} from './order_pdf_overlay_sketch_annotation_state_shared.js';

const ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH = 595;
const ORDER_PDF_SKETCH_SHAPE_SNAP_THRESHOLD = 0.14;

function normalizeOrderPdfSketchPoint(point: OrderPdfSketchPoint): OrderPdfSketchPoint {
  return {
    x: clamp01(point.x),
    y: clamp01(point.y),
  };
}

function buildOrderPdfSketchRectBounds(start: OrderPdfSketchPoint, end: OrderPdfSketchPoint) {
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return { left, right, top, bottom };
}

function closeOrderPdfSketchPointLoop(points: OrderPdfSketchPoint[]): OrderPdfSketchPoint[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return points;
  if (Object.is(first.x, last.x) && Object.is(first.y, last.y)) return points;
  return [...points, { x: first.x, y: first.y }];
}

function isValidOrderPdfSketchSurfaceSize(
  surfaceSize: OrderPdfSketchSurfaceSize | null | undefined
): surfaceSize is OrderPdfSketchSurfaceSize {
  return (
    !!surfaceSize &&
    Number.isFinite(surfaceSize.width) &&
    Number.isFinite(surfaceSize.height) &&
    surfaceSize.width > 0 &&
    surfaceSize.height > 0
  );
}

function resolveOrderPdfSketchAxisDeltas(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
}) {
  const { start, end, surfaceSize } = args;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (isValidOrderPdfSketchSurfaceSize(surfaceSize)) {
    return {
      dx,
      dy,
      deltaXPx: dx * surfaceSize.width,
      deltaYPx: dy * surfaceSize.height,
      width: surfaceSize.width,
      height: surfaceSize.height,
    };
  }
  return {
    dx,
    dy,
    deltaXPx: dx * ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH,
    deltaYPx: dy * ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH,
    width: ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH,
    height: ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH,
  };
}

function shouldSnapOrderPdfShapeToEqualSides(args: { deltaXPx: number; deltaYPx: number }): boolean {
  const widthPx = Math.abs(args.deltaXPx);
  const heightPx = Math.abs(args.deltaYPx);
  const dominant = Math.max(widthPx, heightPx);
  const minor = Math.min(widthPx, heightPx);
  if (dominant <= 0 || minor <= 0) return false;
  return (dominant - minor) / dominant <= ORDER_PDF_SKETCH_SHAPE_SNAP_THRESHOLD;
}

function buildOrderPdfResolvedDragEnd(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
  snapEqualSides?: boolean;
}): OrderPdfSketchPoint {
  const { start, end, surfaceSize, snapEqualSides = false } = args;
  const deltas = resolveOrderPdfSketchAxisDeltas({ start, end, surfaceSize });
  if (!snapEqualSides || !shouldSnapOrderPdfShapeToEqualSides(deltas)) return end;
  const sizePx = Math.min(Math.abs(deltas.deltaXPx), Math.abs(deltas.deltaYPx));
  if (sizePx <= 0) return end;
  return {
    x: clamp01(start.x + (Math.sign(deltas.dx || 1) * sizePx) / deltas.width),
    y: clamp01(start.y + (Math.sign(deltas.dy || 1) * sizePx) / deltas.height),
  };
}

function buildOrderPdfRectPoints(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
  snapEqualSides?: boolean;
}): OrderPdfSketchPoint[] {
  const resolvedEnd = buildOrderPdfResolvedDragEnd(args);
  const { left, right, top, bottom } = buildOrderPdfSketchRectBounds(args.start, resolvedEnd);
  if (Math.abs(right - left) <= 0 && Math.abs(bottom - top) <= 0) return [args.start];
  return closeOrderPdfSketchPointLoop([
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ]);
}

function buildOrderPdfEllipsePoints(args: {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  segments?: number;
}): OrderPdfSketchPoint[] {
  const { centerX, centerY, radiusX, radiusY } = args;
  const segments = Math.max(12, Math.round(args.segments || 40));
  if (radiusX <= 0 && radiusY <= 0) return [{ x: centerX, y: centerY }];
  const points: OrderPdfSketchPoint[] = [];
  for (let i = 0; i < segments; i += 1) {
    const theta = (Math.PI * 2 * i) / segments;
    points.push({
      x: centerX + Math.cos(theta) * Math.max(0, radiusX),
      y: centerY + Math.sin(theta) * Math.max(0, radiusY),
    });
  }
  return closeOrderPdfSketchPointLoop(points);
}

function buildOrderPdfCirclePoints(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
  snapEqualSides?: boolean;
}): OrderPdfSketchPoint[] {
  const resolvedEnd = buildOrderPdfResolvedDragEnd(args);
  const { left, right, top, bottom } = buildOrderPdfSketchRectBounds(args.start, resolvedEnd);
  const radiusX = Math.abs(right - left) / 2;
  const radiusY = Math.abs(bottom - top) / 2;
  if (radiusX <= 0 && radiusY <= 0) return [args.start];
  return buildOrderPdfEllipsePoints({
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
    radiusX,
    radiusY,
  });
}

function buildOrderPdfEllipsePathPoints(args: {
  start: OrderPdfSketchPoint;
  end: OrderPdfSketchPoint;
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
}): OrderPdfSketchPoint[] {
  return buildOrderPdfCirclePoints({ ...args, snapEqualSides: false });
}

function shouldRebuildOrderPdfSketchShapePoints(args: {
  tool: OrderPdfSketchStrokeTool;
  points: readonly OrderPdfSketchPoint[];
}): boolean {
  if (!isOrderPdfSketchShapeTool(args.tool)) return false;
  if (args.tool === 'line') return true;
  return args.points.length <= 2;
}

export function buildOrderPdfSketchShapePoints(args: {
  tool: OrderPdfSketchStrokeTool;
  points: readonly OrderPdfSketchPoint[];
  surfaceSize?: OrderPdfSketchSurfaceSize | null;
}): OrderPdfSketchPoint[] {
  const { tool } = args;
  const first = args.points[0];
  const last = args.points[args.points.length - 1] || first;
  if (!first || !last) return [];
  const normalizedPoints = args.points.map(normalizeOrderPdfSketchPoint);
  if (!isOrderPdfSketchShapeTool(tool)) return normalizedPoints;
  if (!shouldRebuildOrderPdfSketchShapePoints({ tool, points: normalizedPoints })) return normalizedPoints;
  const normalizedFirst = normalizedPoints[0];
  const normalizedLast = normalizedPoints[normalizedPoints.length - 1] || normalizedFirst;
  switch (tool) {
    case 'line':
      if (Object.is(normalizedFirst.x, normalizedLast.x) && Object.is(normalizedFirst.y, normalizedLast.y)) {
        return [normalizedFirst];
      }
      return [normalizedFirst, normalizedLast];
    case 'square':
      return buildOrderPdfRectPoints({
        start: normalizedFirst,
        end: normalizedLast,
        surfaceSize: args.surfaceSize,
        snapEqualSides: true,
      });
    case 'circle':
      return buildOrderPdfCirclePoints({
        start: normalizedFirst,
        end: normalizedLast,
        surfaceSize: args.surfaceSize,
        snapEqualSides: true,
      });
    case 'ellipse':
      return buildOrderPdfEllipsePathPoints({
        start: normalizedFirst,
        end: normalizedLast,
        surfaceSize: args.surfaceSize,
      });
    default:
      return normalizedPoints;
  }
}

export function normalizeOrderPdfSketchStroke(stroke: unknown): OrderPdfSketchStroke | null {
  if (!stroke || !isOrderPdfSketchStroke(stroke)) return null;
  const rawPoints = stroke.points
    .map(point => ({
      x: clamp01(point.x),
      y: clamp01(point.y),
    }))
    .filter(point => isFiniteNumber(point.x) && isFiniteNumber(point.y));
  const points = buildOrderPdfSketchShapePoints({ tool: stroke.tool, points: rawPoints });
  if (!points.length) return null;
  return {
    id:
      typeof stroke.id === 'string' && stroke.id.trim() ? stroke.id : buildOrderPdfSketchAnnotationId('stk'),
    createdAt: isFiniteNumber(stroke.createdAt) ? stroke.createdAt : Date.now(),
    tool: stroke.tool,
    color: String(stroke.color || '#111827'),
    width: Math.max(1, Number(stroke.width) || 1),
    points,
  };
}
