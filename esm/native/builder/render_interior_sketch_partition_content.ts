import {
  findSketchPartitionCellAtNorm,
  resolveSketchPartitionCells,
  resolveSketchPartitionContentCells,
  type SketchPartitionCell,
} from './render_interior_sketch_layout_dividers.js';
import { toFiniteNumber } from './render_interior_sketch_shared.js';

type InteriorSketchPartitionSource = {
  dividers: readonly { xNorm: number; yNorm?: number; order?: number }[];
  horizontalDividers: readonly { yNorm: number; xNorm?: number; order?: number }[];
  internalCenterX: number;
  effectiveBottomY: number;
  effectiveTopY: number;
  innerW: number;
  spanH: number;
  woodThick: number;
};

function partitionArgs(resolved: InteriorSketchPartitionSource) {
  return {
    verticalDividers: resolved.dividers,
    horizontalDividers: resolved.horizontalDividers,
    centerX: resolved.internalCenterX,
    centerY: (resolved.effectiveBottomY + resolved.effectiveTopY) / 2,
    innerW: resolved.innerW,
    innerH: resolved.spanH,
    woodThick: resolved.woodThick,
  };
}

export function resolveInteriorSketchPartitionCells(
  resolved: InteriorSketchPartitionSource
): SketchPartitionCell[] {
  return resolveSketchPartitionCells(partitionArgs(resolved));
}

export function resolveInteriorSketchPartitionCellAtNorm(
  resolved: InteriorSketchPartitionSource,
  xNorm: unknown,
  yNorm: unknown
): SketchPartitionCell | null {
  return findSketchPartitionCellAtNorm({
    ...partitionArgs(resolved),
    xNorm: toFiniteNumber(xNorm),
    yNorm: toFiniteNumber(yNorm),
  });
}

export function resolveInteriorSketchContentCells(
  resolved: InteriorSketchPartitionSource,
  item: { xNorm?: unknown; yNorm?: unknown; yNormC?: unknown; scopeOrder?: unknown } | null | undefined
): SketchPartitionCell[] {
  if (!item) return [];
  return resolveSketchPartitionContentCells({
    ...partitionArgs(resolved),
    xNorm: toFiniteNumber(item.xNorm),
    yNorm: toFiniteNumber(item.yNormC) ?? toFiniteNumber(item.yNorm),
    scopeOrder: toFiniteNumber(item.scopeOrder),
  });
}
