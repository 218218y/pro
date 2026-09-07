import {
  findSketchPartitionCellAtNorm,
  resolveSketchPartitionContentCells,
  resolveSketchPartitionMaxOrder,
  type SketchPartitionCell,
} from './canvas_picking_sketch_box_segments.js';
import {
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
} from './canvas_picking_sketch_box_dividers.js';

export type SketchModulePartitionGeometry = {
  innerW: number;
  internalCenterX: number;
  bottomY: number;
  topY: number;
  woodThick: number;
};

function partitionArgs(sketchExtras: unknown, geometry: SketchModulePartitionGeometry) {
  return {
    verticalDividers: readSketchBoxDividers(sketchExtras),
    horizontalDividers: readSketchBoxHorizontalDividers(sketchExtras),
    centerX: geometry.internalCenterX,
    centerY: (geometry.bottomY + geometry.topY) / 2,
    innerW: geometry.innerW,
    innerH: Math.max(0.0001, geometry.topY - geometry.bottomY),
    woodThick: geometry.woodThick,
  };
}

export function resolveSketchModulePointerNorm(args: {
  geometry: SketchModulePartitionGeometry;
  pointerX: number;
  pointerY: number;
}): { xNorm: number; yNorm: number } {
  const { geometry } = args;
  const leftX = geometry.internalCenterX - geometry.innerW / 2;
  const height = Math.max(0.0001, geometry.topY - geometry.bottomY);
  return {
    xNorm: Math.max(0, Math.min(1, (args.pointerX - leftX) / Math.max(0.0001, geometry.innerW))),
    yNorm: Math.max(0, Math.min(1, (args.pointerY - geometry.bottomY) / height)),
  };
}

export function resolveSketchModulePartitionCell(args: {
  sketchExtras: unknown;
  geometry: SketchModulePartitionGeometry;
  pointerX: number;
  pointerY: number;
}): SketchPartitionCell | null {
  // Preserve the exact pre-partition geometry path when the module is not partitioned.
  // A logical cell only exists here when at least one divider actually split the module.
  if (!hasSketchModulePartitions(args.sketchExtras)) return null;
  const norm = resolveSketchModulePointerNorm(args);
  return findSketchPartitionCellAtNorm({ ...partitionArgs(args.sketchExtras, args.geometry), ...norm });
}

export function resolveSketchModulePartitionCellAtNorm(args: {
  sketchExtras: unknown;
  bottomY: number;
  topY: number;
  woodThick: number;
  xNorm: number;
  yNorm: number;
  maxOrder?: number | null;
}): SketchPartitionCell | null {
  const geometry = {
    innerW: 1,
    internalCenterX: 0,
    bottomY: args.bottomY,
    topY: args.topY,
    woodThick: args.woodThick,
  };
  return findSketchPartitionCellAtNorm({
    ...partitionArgs(args.sketchExtras, geometry),
    ...(args.maxOrder != null ? { maxOrder: args.maxOrder } : {}),
    xNorm: args.xNorm,
    yNorm: args.yNorm,
  });
}

export function resolveSketchModulePartitionScopeOrder(sketchExtras: unknown): number {
  return resolveSketchPartitionMaxOrder(
    partitionArgs(sketchExtras, {
      innerW: 1,
      internalCenterX: 0,
      bottomY: 0,
      topY: 1,
      woodThick: 0.018,
    })
  );
}

export function resolveSketchModuleContentCells(args: {
  sketchExtras: unknown;
  geometry: SketchModulePartitionGeometry;
  item: { xNorm?: unknown; yNorm?: unknown; yNormC?: unknown; scopeOrder?: unknown };
}): SketchPartitionCell[] {
  const readFinite = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  return resolveSketchPartitionContentCells({
    ...partitionArgs(args.sketchExtras, args.geometry),
    xNorm: readFinite(args.item.xNorm),
    yNorm: readFinite(args.item.yNormC) ?? readFinite(args.item.yNorm),
    scopeOrder: readFinite(args.item.scopeOrder),
  });
}

export function hasSketchModulePartitions(sketchExtras: unknown): boolean {
  return (
    readSketchBoxDividers(sketchExtras).length > 0 || readSketchBoxHorizontalDividers(sketchExtras).length > 0
  );
}

export function sameSketchModulePartitionCellBounds(
  a: SketchPartitionCell | null,
  b: SketchPartitionCell | null
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.normLeft - b.normLeft) < 1e-7 &&
    Math.abs(a.normRight - b.normRight) < 1e-7 &&
    Math.abs(a.normBottom - b.normBottom) < 1e-7 &&
    Math.abs(a.normTop - b.normTop) < 1e-7
  );
}

export function doesSketchModuleContentItemBelongToCell(args: {
  sketchExtras: unknown;
  geometry: SketchModulePartitionGeometry;
  item: { xNorm?: unknown; yNorm?: unknown; yNormC?: unknown; scopeOrder?: unknown };
  cell: SketchPartitionCell;
}): boolean {
  return resolveSketchModuleContentCells({
    sketchExtras: args.sketchExtras,
    geometry: args.geometry,
    item: args.item,
  }).some(candidate => sameSketchModulePartitionCellBounds(candidate, args.cell));
}

export function filterSketchModuleContentItemsForCell<
  T extends {
    xNorm?: unknown;
    yNorm?: unknown;
    yNormC?: unknown;
    scopeOrder?: unknown;
  },
>(args: {
  sketchExtras: unknown;
  geometry: SketchModulePartitionGeometry;
  items: readonly T[];
  cell: SketchPartitionCell | null;
}): Array<{ item: T; index: number }> {
  const out: Array<{ item: T; index: number }> = [];
  for (let index = 0; index < args.items.length; index += 1) {
    const item = args.items[index];
    if (!item) continue;
    if (
      !args.cell ||
      doesSketchModuleContentItemBelongToCell({
        sketchExtras: args.sketchExtras,
        geometry: args.geometry,
        item,
        cell: args.cell,
      })
    ) {
      out.push({ item, index });
    }
  }
  return out;
}

function readPartitionScopedOwnerCell(args: {
  sketchExtras: unknown;
  xNorm: unknown;
  yNorm: unknown;
  scopeOrder: unknown;
}): SketchPartitionCell | null {
  const xNorm = typeof args.xNorm === 'number' && Number.isFinite(args.xNorm) ? args.xNorm : null;
  const yNorm = typeof args.yNorm === 'number' && Number.isFinite(args.yNorm) ? args.yNorm : null;
  const scopeOrder =
    typeof args.scopeOrder === 'number' && Number.isFinite(args.scopeOrder) && args.scopeOrder >= 0
      ? args.scopeOrder
      : null;
  if (xNorm == null || yNorm == null || scopeOrder == null) return null;
  return resolveSketchModulePartitionCellAtNorm({
    sketchExtras: args.sketchExtras,
    bottomY: 0,
    topY: 1,
    woodThick: 0.0001,
    xNorm,
    yNorm,
    maxOrder: scopeOrder,
  });
}

function partitionCellContainsCell(owner: SketchPartitionCell | null, cell: SketchPartitionCell): boolean {
  if (!owner) return false;
  const eps = 1e-7;
  return (
    cell.normLeft >= owner.normLeft - eps &&
    cell.normRight <= owner.normRight + eps &&
    cell.normBottom >= owner.normBottom - eps &&
    cell.normTop <= owner.normTop + eps
  );
}

export function isSketchModuleBaseShelfSuppressedInCell(args: {
  sketchExtras: unknown;
  shelfIndex: number;
  cell: SketchPartitionCell;
}): boolean {
  if (!args.sketchExtras || typeof args.sketchExtras !== 'object' || Array.isArray(args.sketchExtras))
    return false;
  const extra = args.sketchExtras as Record<string, unknown>;
  const suppressions = Array.isArray(extra.baseShelfSuppressions) ? extra.baseShelfSuppressions : [];
  return suppressions.some(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    const shelfIndex =
      typeof item.shelfIndex === 'number' && Number.isFinite(item.shelfIndex)
        ? Math.round(item.shelfIndex)
        : null;
    if (shelfIndex !== Math.round(args.shelfIndex)) return false;
    return partitionCellContainsCell(
      readPartitionScopedOwnerCell({
        sketchExtras: args.sketchExtras,
        xNorm: item.xNorm,
        yNorm: item.yNorm,
        scopeOrder: item.scopeOrder,
      }),
      args.cell
    );
  });
}

export function suppressSketchModuleBaseShelfInCell(args: {
  cfg: Record<string, unknown>;
  shelfIndex: number;
  xNorm: number;
  yNorm: number;
  scopeOrder: number;
}): boolean {
  let sketchExtras = args.cfg.sketchExtras;
  if (!sketchExtras || typeof sketchExtras !== 'object' || Array.isArray(sketchExtras)) {
    sketchExtras = {};
    args.cfg.sketchExtras = sketchExtras;
  }
  if (!hasSketchModulePartitions(sketchExtras)) return false;
  const extra = sketchExtras as Record<string, unknown>;
  const target = readPartitionScopedOwnerCell({
    sketchExtras,
    xNorm: args.xNorm,
    yNorm: args.yNorm,
    scopeOrder: args.scopeOrder,
  });
  if (!target) return false;
  const shelfIndex = Math.max(1, Math.round(args.shelfIndex));
  const existing = Array.isArray(extra.baseShelfSuppressions)
    ? extra.baseShelfSuppressions.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
  const duplicate = existing.some(item => {
    const currentIndex =
      typeof item.shelfIndex === 'number' && Number.isFinite(item.shelfIndex)
        ? Math.round(item.shelfIndex)
        : null;
    if (currentIndex !== shelfIndex) return false;
    return sameSketchModulePartitionCellBounds(
      readPartitionScopedOwnerCell({
        sketchExtras,
        xNorm: item.xNorm,
        yNorm: item.yNorm,
        scopeOrder: item.scopeOrder,
      }),
      target
    );
  });
  if (duplicate) return false;
  existing.push({
    id: `sbss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    shelfIndex,
    xNorm: Math.max(0, Math.min(1, args.xNorm)),
    yNorm: Math.max(0, Math.min(1, args.yNorm)),
    scopeOrder: Math.max(0, args.scopeOrder),
  });
  extra.baseShelfSuppressions = existing;
  return true;
}

export function setSketchModulePartitionCellDoorCount(args: {
  cfg: Record<string, unknown>;
  xNorm: number;
  yNorm: number;
  scopeOrder: number;
  doorCount: 1 | 2;
}): boolean {
  let sketchExtras = args.cfg.sketchExtras;
  if (!sketchExtras || typeof sketchExtras !== 'object' || Array.isArray(sketchExtras)) {
    sketchExtras = {};
    args.cfg.sketchExtras = sketchExtras;
  }
  if (!hasSketchModulePartitions(sketchExtras)) return false;
  const extra = sketchExtras as Record<string, unknown>;
  const target = resolveSketchModulePartitionCellAtNorm({
    sketchExtras,
    bottomY: 0,
    topY: 1,
    woodThick: 0.0001,
    xNorm: args.xNorm,
    yNorm: args.yNorm,
    maxOrder: args.scopeOrder,
  });
  if (!target) return false;

  const existing = Array.isArray(extra.cellDoors)
    ? extra.cellDoors.filter(
        (item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
  const retained = existing.filter(item => {
    const xNorm = typeof item.xNorm === 'number' && Number.isFinite(item.xNorm) ? item.xNorm : 0.5;
    const yNorm = typeof item.yNorm === 'number' && Number.isFinite(item.yNorm) ? item.yNorm : 0.5;
    const scopeOrder =
      typeof item.scopeOrder === 'number' && Number.isFinite(item.scopeOrder) && item.scopeOrder >= 0
        ? item.scopeOrder
        : resolveSketchModulePartitionScopeOrder(sketchExtras);
    const owner = resolveSketchModulePartitionCellAtNorm({
      sketchExtras,
      bottomY: 0,
      topY: 1,
      woodThick: 0.0001,
      xNorm,
      yNorm,
      maxOrder: scopeOrder,
    });
    return !sameSketchModulePartitionCellBounds(owner, target);
  });
  retained.push({
    id: `scd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    xNorm: Math.max(0, Math.min(1, args.xNorm)),
    yNorm: Math.max(0, Math.min(1, args.yNorm)),
    scopeOrder: Math.max(0, args.scopeOrder),
    count: args.doorCount,
  });
  extra.cellDoors = retained;
  return true;
}
