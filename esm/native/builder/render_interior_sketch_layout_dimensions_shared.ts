import type { InteriorTHREESurface } from './render_interior_ops_contracts.js';
import type { InteriorDimensionLineFn } from './render_interior_sketch_shared.js';

export type SketchFreeBoxDimensionEntry = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type SketchFreeBoxDimensionSegment = SketchFreeBoxDimensionEntry & {
  minX: number;
  maxX: number;
  bottomY: number;
  topY: number;
  backZ: number;
  frontZ: number;
};

export type SketchFreeBoxDimensionSpan = {
  min: number;
  max: number;
};

export type RenderSketchFreeBoxDimensionsArgs = {
  THREE: InteriorTHREESurface;
  addDimensionLine: InteriorDimensionLineFn;
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type RenderSketchFreeBoxDimensionGroupArgs = {
  THREE: InteriorTHREESurface;
  addDimensionLine: InteriorDimensionLineFn;
  entries: SketchFreeBoxDimensionSegment[];
};

export function normalizeSketchFreeBoxDimensionEntry(
  entry: SketchFreeBoxDimensionEntry
): SketchFreeBoxDimensionSegment | null {
  const centerX = Number(entry.centerX);
  const centerY = Number(entry.centerY);
  const centerZ = Number(entry.centerZ);
  const width = Number(entry.width);
  const height = Number(entry.height);
  const depth = Number(entry.depth);
  if (!(width > 0) || !(height > 0) || !(depth > 0)) return null;
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || !Number.isFinite(centerZ)) return null;

  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  return {
    centerX,
    centerY,
    centerZ,
    width,
    height,
    depth,
    minX: centerX - halfW,
    maxX: centerX + halfW,
    bottomY: centerY - halfH,
    topY: centerY + halfH,
    backZ: centerZ - halfD,
    frontZ: centerZ + halfD,
  };
}

export function resolveSketchFreeBoxDimensionTolerance(span: number, min: number, max: number): number {
  if (!(span > 0) || !Number.isFinite(span)) return min;
  return Math.max(min, Math.min(max, span * 0.08));
}
