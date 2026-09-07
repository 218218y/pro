import type { BuilderSketchExtrasLike } from '../../../types';
import {
  findSketchPartitionCellAtNorm,
  resolveSketchPartitionCells,
  resolveSketchPartitionDoorCount,
  resolveSketchPartitionMaxOrder,
  type SketchPartitionCell,
} from './render_interior_sketch_layout_dividers.js';
import { readSketchBoxDividers, readSketchBoxHorizontalDividers } from './render_interior_sketch_layout.js';

export type InteriorModulePartitionGeometry = {
  centerX: number;
  bottomY: number;
  topY: number;
  innerW: number;
  woodThick: number;
};

const EPS = 1e-7;

function partitionArgs(sketchExtras: unknown, geometry: InteriorModulePartitionGeometry) {
  return {
    verticalDividers: readSketchBoxDividers(sketchExtras),
    horizontalDividers: readSketchBoxHorizontalDividers(sketchExtras),
    centerX: geometry.centerX,
    centerY: (geometry.bottomY + geometry.topY) / 2,
    innerW: geometry.innerW,
    innerH: Math.max(0.0001, geometry.topY - geometry.bottomY),
    woodThick: geometry.woodThick,
  };
}

export function resolveInteriorModulePartitionCells(args: {
  sketchExtras: unknown;
  geometry: InteriorModulePartitionGeometry;
}): SketchPartitionCell[] {
  return resolveSketchPartitionCells(partitionArgs(args.sketchExtras, args.geometry));
}

export function resolveInteriorModulePartitionOrder(sketchExtras: unknown): number {
  return resolveSketchPartitionMaxOrder(
    partitionArgs(sketchExtras, {
      centerX: 0,
      bottomY: 0,
      topY: 1,
      innerW: 1,
      woodThick: 0.018,
    })
  );
}

export function resolveInteriorModulePartitionCellsAtY(args: {
  cells: readonly SketchPartitionCell[];
  y: number;
}): SketchPartitionCell[] {
  return args.cells.filter(cell => args.y >= cell.bottomY - EPS && args.y <= cell.topY + EPS);
}

export function hasInteriorModulePartitions(sketchExtras: unknown): boolean {
  const extra = sketchExtras as BuilderSketchExtrasLike | null | undefined;
  return !!(
    extra &&
    ((Array.isArray(extra.dividers) && extra.dividers.length > 0) ||
      (Array.isArray(extra.horizontalDividers) && extra.horizontalDividers.length > 0))
  );
}

type PartitionCellBounds = Pick<SketchPartitionCell, 'normLeft' | 'normRight' | 'normBottom' | 'normTop'>;

function partitionCellContainsCell(owner: SketchPartitionCell | null, cell: PartitionCellBounds): boolean {
  if (!owner) return false;
  return (
    cell.normLeft >= owner.normLeft - EPS &&
    cell.normRight <= owner.normRight + EPS &&
    cell.normBottom >= owner.normBottom - EPS &&
    cell.normTop <= owner.normTop + EPS
  );
}

export function isInteriorModuleBaseShelfSuppressedInCell(args: {
  sketchExtras: unknown;
  geometry: InteriorModulePartitionGeometry;
  shelfIndex: number;
  cell: PartitionCellBounds;
}): boolean {
  const extra = args.sketchExtras as BuilderSketchExtrasLike | null | undefined;
  const suppressions = Array.isArray(extra?.baseShelfSuppressions) ? extra.baseShelfSuppressions : [];
  const partition = partitionArgs(args.sketchExtras, args.geometry);
  return suppressions.some(item => {
    const shelfIndex =
      typeof item.shelfIndex === 'number' && Number.isFinite(item.shelfIndex)
        ? Math.round(item.shelfIndex)
        : null;
    if (shelfIndex !== Math.round(args.shelfIndex)) return false;
    const xNorm = typeof item.xNorm === 'number' && Number.isFinite(item.xNorm) ? item.xNorm : null;
    const yNorm = typeof item.yNorm === 'number' && Number.isFinite(item.yNorm) ? item.yNorm : null;
    const scopeOrder =
      typeof item.scopeOrder === 'number' && Number.isFinite(item.scopeOrder) && item.scopeOrder >= 0
        ? item.scopeOrder
        : null;
    if (xNorm == null || yNorm == null || scopeOrder == null) return false;
    const owner = findSketchPartitionCellAtNorm({
      ...partition,
      maxOrder: scopeOrder,
      xNorm,
      yNorm,
    });
    return partitionCellContainsCell(owner, args.cell);
  });
}

export function resolveInteriorModulePartitionDoorCount(args: {
  sketchExtras: unknown;
  geometry: InteriorModulePartitionGeometry;
  cell: SketchPartitionCell;
  moduleDoorCount: number;
}): 1 | 2 {
  const extra = args.sketchExtras as BuilderSketchExtrasLike | null | undefined;
  return resolveSketchPartitionDoorCount({
    cell: args.cell,
    moduleDoorCount: args.moduleDoorCount,
    overrides: (Array.isArray(extra?.cellDoors) ? extra.cellDoors : []).map(item => ({
      ...(typeof item.xNorm === 'number' && Number.isFinite(item.xNorm) ? { xNorm: item.xNorm } : {}),
      ...(typeof item.yNorm === 'number' && Number.isFinite(item.yNorm) ? { yNorm: item.yNorm } : {}),
      ...(typeof item.count === 'number' && Number.isFinite(item.count) ? { count: item.count } : {}),
      ...(typeof item.scopeOrder === 'number' && Number.isFinite(item.scopeOrder)
        ? { scopeOrder: item.scopeOrder }
        : {}),
    })),
    partition: partitionArgs(args.sketchExtras, args.geometry),
  });
}
