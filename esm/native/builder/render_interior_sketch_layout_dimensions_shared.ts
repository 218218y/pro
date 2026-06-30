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

export function readSketchDimensionNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readSketchPositiveDimensionNumber(value: unknown): number | null {
  const n = readSketchDimensionNumber(value);
  return n != null && n > 0 ? n : null;
}

export function normalizeSketchFreeBoxDimensionEntry(
  entry: SketchFreeBoxDimensionEntry
): SketchFreeBoxDimensionSegment | null {
  const centerX = readSketchDimensionNumber(entry.centerX);
  const centerY = readSketchDimensionNumber(entry.centerY);
  const centerZ = readSketchDimensionNumber(entry.centerZ);
  const width = readSketchPositiveDimensionNumber(entry.width);
  const height = readSketchPositiveDimensionNumber(entry.height);
  const depth = readSketchPositiveDimensionNumber(entry.depth);
  if (
    centerX == null ||
    centerY == null ||
    centerZ == null ||
    width == null ||
    height == null ||
    depth == null
  )
    return null;

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
