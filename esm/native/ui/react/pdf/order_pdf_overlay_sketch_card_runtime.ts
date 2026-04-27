import type { OrderPdfSketchStroke, OrderPdfSketchTool } from './order_pdf_overlay_contracts.js';
import { ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH } from './order_pdf_overlay_sketch_note_box_runtime.js';
import {
  buildOrderPdfSketchSurfaceSizeFromDrawingRect,
  buildOrderPdfStrokeFromDrawingPoints,
  type DrawingPoint,
  type DrawingRect,
} from './order_pdf_overlay_sketch_panel_runtime.js';

export type OrderPdfSketchCardDrawConfig = {
  tool: OrderPdfSketchTool;
  color: string;
  width: number;
};

function resolveFiniteOrderPdfSketchCardWidth(value: number | null | undefined): number {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : 0;
}

export function resolveOrderPdfSketchCardStageWidth(args: {
  hostWidth: number | null | undefined;
  entryWidth: number | null | undefined;
}): number {
  const hostWidth = resolveFiniteOrderPdfSketchCardWidth(args.hostWidth);
  if (hostWidth) return hostWidth;
  const entryWidth = resolveFiniteOrderPdfSketchCardWidth(args.entryWidth);
  if (entryWidth) return entryWidth;
  return ORDER_PDF_SKETCH_REFERENCE_PAGE_WIDTH;
}

export function resolveOrderPdfSketchCardCanvasToolClassName(tool: OrderPdfSketchTool): string {
  if (tool === 'text') return ' is-text';
  if (tool === 'eraser') return ' is-eraser';
  if (tool === 'marker') return ' is-marker';
  return ' is-pen';
}

export function resolveOrderPdfSketchCardPendingStroke(args: {
  drawConfig: OrderPdfSketchCardDrawConfig;
  points: readonly DrawingPoint[];
  rect: DrawingRect | null;
}): OrderPdfSketchStroke | null {
  const { drawConfig, points, rect } = args;
  if (!points.length || drawConfig.tool === 'text') return null;
  return buildOrderPdfStrokeFromDrawingPoints({
    tool: drawConfig.tool,
    color: drawConfig.color,
    width: drawConfig.width,
    points,
    surfaceSize: buildOrderPdfSketchSurfaceSizeFromDrawingRect(rect),
  });
}

export function shouldCommitOrderPdfSketchCardStroke(args: {
  stroke: OrderPdfSketchStroke | null;
  committedStrokeCount: number;
}): boolean {
  const { stroke, committedStrokeCount } = args;
  if (!stroke || !stroke.points.length) return false;
  return !(stroke.tool === 'eraser' && committedStrokeCount <= 0);
}
