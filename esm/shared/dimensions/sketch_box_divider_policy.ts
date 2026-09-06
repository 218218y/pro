import { MATERIAL_THICKNESS_POLICY } from './material_thickness_policy.js';
import { meters } from './units.js';

export const SKETCH_BOX_DIVIDER_GEOMETRY_POLICY = Object.freeze({
  fallbackWoodThicknessM: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
  minInnerWidthM: meters(0.02),
  minInnerWithWoodClearanceM: meters(0.02),
  dividerHalfMinM: meters(0.006),
  segmentEdgeEpsilonM: meters(0.0001),
  pickEdgeEpsilonM: meters(0.0005),
  centeredEpsilonM: meters(0.001),
  defaultCenterNorm: 0.5,
});

export const SKETCH_BOX_DIVIDER_SNAP_POLICY = Object.freeze({
  centerSnapMinM: meters(0.012),
  centerSnapMaxM: meters(0.035),
  centerSnapWidthRatio: 0.07,
});

export const SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY = Object.freeze({
  removeHitMinM: meters(0.018),
  removeHitMaxM: meters(0.05),
  removeHitWidthRatio: 0.08,
});

export const SKETCH_BOX_DIVIDER_POLICY = Object.freeze({
  fallbackWoodThicknessM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.fallbackWoodThicknessM,
  minInnerWidthM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWidthM,
  minInnerWithWoodClearanceM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.minInnerWithWoodClearanceM,
  dividerHalfMinM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.dividerHalfMinM,
  segmentEdgeEpsilonM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.segmentEdgeEpsilonM,
  pickEdgeEpsilonM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.pickEdgeEpsilonM,
  centeredEpsilonM: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.centeredEpsilonM,
  defaultCenterNorm: SKETCH_BOX_DIVIDER_GEOMETRY_POLICY.defaultCenterNorm,
  centerSnapMinM: SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMinM,
  centerSnapMaxM: SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapMaxM,
  centerSnapWidthRatio: SKETCH_BOX_DIVIDER_SNAP_POLICY.centerSnapWidthRatio,
  removeHitMinM: SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitMinM,
  removeHitMaxM: SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitMaxM,
  removeHitWidthRatio: SKETCH_BOX_DIVIDER_REMOVE_HIT_POLICY.removeHitWidthRatio,
});

// Logical sketch partition cells shared by builder and canvas-picking services.
//
// A regular module and a SketchBox use the same divider semantics: dividers are
// replayed in structural creation order and each divider splits only the leaf
// cell that existed when it was created. This module owns that topology so
// content, doors, preview, picking, and rendering agree on the same cells.

export type SketchPartitionVerticalDivider = {
  id?: string;
  xNorm: number;
  yNorm?: number;
  order?: number;
};

export type SketchPartitionHorizontalDivider = {
  id?: string;
  yNorm: number;
  xNorm?: number;
  order?: number;
};

export type SketchPartitionCell = {
  normLeft: number;
  normRight: number;
  normBottom: number;
  normTop: number;
  leftX: number;
  rightX: number;
  bottomY: number;
  topY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  xNorm: number;
  yNorm: number;
};

export type ResolveSketchPartitionCellsArgs = {
  verticalDividers?: readonly SketchPartitionVerticalDivider[];
  horizontalDividers?: readonly SketchPartitionHorizontalDivider[];
  centerX: number;
  centerY: number;
  innerW: number;
  innerH: number;
  woodThick: number;
  maxOrder?: number | null;
};

const EPS = 1e-7;

function clampUnit(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

function finitePositive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeOrder(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? value : null;
}

type NormalizedCell = {
  normLeft: number;
  normRight: number;
  normBottom: number;
  normTop: number;
};

type PartitionEvent =
  | { axis: 'vertical'; xNorm: number; yNorm: number; order: number; sequence: number }
  | { axis: 'horizontal'; yNorm: number; xNorm: number; order: number; sequence: number };

function containsNorm(cell: NormalizedCell, xNorm: number, yNorm: number): boolean {
  return (
    xNorm >= cell.normLeft - EPS &&
    xNorm <= cell.normRight + EPS &&
    yNorm >= cell.normBottom - EPS &&
    yNorm <= cell.normTop + EPS
  );
}

function pickOwnerCell(cells: readonly NormalizedCell[], xNorm: number, yNorm: number): number {
  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    if (!cell) continue;
    if (containsNorm(cell, xNorm, yNorm)) return i;
    const cx = (cell.normLeft + cell.normRight) / 2;
    const cy = (cell.normBottom + cell.normTop) / 2;
    const distance = Math.abs(cx - xNorm) + Math.abs(cy - yNorm);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function collectPartitionEvents(args: ResolveSketchPartitionCellsArgs): PartitionEvent[] {
  const events: PartitionEvent[] = [];
  let sequence = 0;
  let syntheticOrder = 1;
  const explicitOrders = [
    ...(args.verticalDividers ?? []).map(item => normalizeOrder(item.order)),
    ...(args.horizontalDividers ?? []).map(item => normalizeOrder(item.order)),
  ].filter((value): value is number => value != null);
  if (explicitOrders.length) syntheticOrder = Math.max(...explicitOrders) + 1;

  for (const divider of args.verticalDividers ?? []) {
    const xNorm = clampUnit(divider.xNorm, Number.NaN);
    if (!Number.isFinite(xNorm)) continue;
    const order = normalizeOrder(divider.order) ?? syntheticOrder++;
    events.push({
      axis: 'vertical',
      xNorm,
      yNorm: clampUnit(divider.yNorm, 0.5),
      order,
      sequence: sequence++,
    });
  }
  for (const divider of args.horizontalDividers ?? []) {
    const yNorm = clampUnit(divider.yNorm, Number.NaN);
    if (!Number.isFinite(yNorm)) continue;
    const order = normalizeOrder(divider.order) ?? syntheticOrder++;
    events.push({
      axis: 'horizontal',
      yNorm,
      xNorm: clampUnit(divider.xNorm, 0.5),
      order,
      sequence: sequence++,
    });
  }

  const maxOrder =
    typeof args.maxOrder === 'number' && Number.isFinite(args.maxOrder) ? Math.max(0, args.maxOrder) : null;
  return events
    .filter(event => maxOrder == null || event.order <= maxOrder)
    .toSorted((a, b) => a.order - b.order || a.sequence - b.sequence);
}

function replayNormalizedCells(args: ResolveSketchPartitionCellsArgs): NormalizedCell[] {
  const cells: NormalizedCell[] = [{ normLeft: 0, normRight: 1, normBottom: 0, normTop: 1 }];
  for (const event of collectPartitionEvents(args)) {
    const ownerIndex = pickOwnerCell(
      cells,
      event.axis === 'vertical' ? event.xNorm : event.xNorm,
      event.axis === 'horizontal' ? event.yNorm : event.yNorm
    );
    if (ownerIndex < 0) continue;
    const owner = cells[ownerIndex];
    if (!owner) continue;

    if (event.axis === 'vertical') {
      if (!(event.xNorm > owner.normLeft + EPS && event.xNorm < owner.normRight - EPS)) continue;
      cells.splice(ownerIndex, 1, { ...owner, normRight: event.xNorm }, { ...owner, normLeft: event.xNorm });
    } else {
      if (!(event.yNorm > owner.normBottom + EPS && event.yNorm < owner.normTop - EPS)) continue;
      cells.splice(ownerIndex, 1, { ...owner, normTop: event.yNorm }, { ...owner, normBottom: event.yNorm });
    }
  }
  return cells;
}

function toPhysicalCell(
  cell: NormalizedCell,
  args: ResolveSketchPartitionCellsArgs
): SketchPartitionCell | null {
  const innerW = finitePositive(args.innerW, 0.0001);
  const innerH = finitePositive(args.innerH, 0.0001);
  const woodThick = finitePositive(args.woodThick, 0.0001);
  const rootLeft = args.centerX - innerW / 2;
  const rootBottom = args.centerY - innerH / 2;
  const boundaryInsetX = Math.min(woodThick / 2, innerW / 2);
  const boundaryInsetY = Math.min(woodThick / 2, innerH / 2);

  const rawLeft = rootLeft + cell.normLeft * innerW;
  const rawRight = rootLeft + cell.normRight * innerW;
  const rawBottom = rootBottom + cell.normBottom * innerH;
  const rawTop = rootBottom + cell.normTop * innerH;
  const leftX = rawLeft + (cell.normLeft > EPS ? boundaryInsetX : 0);
  const rightX = rawRight - (cell.normRight < 1 - EPS ? boundaryInsetX : 0);
  const bottomY = rawBottom + (cell.normBottom > EPS ? boundaryInsetY : 0);
  const topY = rawTop - (cell.normTop < 1 - EPS ? boundaryInsetY : 0);
  if (!(rightX > leftX + EPS) || !(topY > bottomY + EPS)) return null;
  const centerX = (leftX + rightX) / 2;
  const centerY = (bottomY + topY) / 2;
  return {
    ...cell,
    leftX,
    rightX,
    bottomY,
    topY,
    centerX,
    centerY,
    width: rightX - leftX,
    height: topY - bottomY,
    xNorm: (cell.normLeft + cell.normRight) / 2,
    yNorm: (cell.normBottom + cell.normTop) / 2,
  };
}

export function resolveSketchPartitionCells(args: ResolveSketchPartitionCellsArgs): SketchPartitionCell[] {
  return replayNormalizedCells(args)
    .map(cell => toPhysicalCell(cell, args))
    .filter((cell): cell is SketchPartitionCell => cell != null)
    .toSorted((a, b) => a.normBottom - b.normBottom || a.normLeft - b.normLeft);
}

export function resolveSketchPartitionMaxOrder(
  args: Pick<ResolveSketchPartitionCellsArgs, 'verticalDividers' | 'horizontalDividers'>
): number {
  let maxOrder = 0;
  for (const divider of [...(args.verticalDividers ?? []), ...(args.horizontalDividers ?? [])]) {
    maxOrder = Math.max(maxOrder, normalizeOrder(divider.order) ?? 0);
  }
  return maxOrder;
}

export function findSketchPartitionCellAtNorm(
  args: ResolveSketchPartitionCellsArgs & {
    xNorm?: number | null;
    yNorm?: number | null;
  }
): SketchPartitionCell | null {
  const xNorm = clampUnit(args.xNorm, 0.5);
  const yNorm = clampUnit(args.yNorm, 0.5);
  const cells = resolveSketchPartitionCells(args);
  const containing = cells.find(cell => containsNorm(cell, xNorm, yNorm));
  if (containing) return containing;
  return (
    cells.toSorted(
      (a, b) =>
        Math.abs(a.xNorm - xNorm) +
        Math.abs(a.yNorm - yNorm) -
        (Math.abs(b.xNorm - xNorm) + Math.abs(b.yNorm - yNorm))
    )[0] ?? null
  );
}

export function resolveSketchPartitionContentCells(
  args: ResolveSketchPartitionCellsArgs & {
    xNorm?: number | null;
    yNorm?: number | null;
    scopeOrder?: number | null;
  }
): SketchPartitionCell[] {
  const currentCells = resolveSketchPartitionCells(args);
  if (!currentCells.length) return [];
  const yNorm = clampUnit(args.yNorm, 0.5);
  const hasAnchor = typeof args.xNorm === 'number' && Number.isFinite(args.xNorm);
  const xNorm = clampUnit(args.xNorm, 0.5);
  const explicitScopeOrder =
    typeof args.scopeOrder === 'number' && Number.isFinite(args.scopeOrder) && args.scopeOrder >= 0
      ? args.scopeOrder
      : null;

  // Pre-partition persisted module fittings did not have xNorm/scopeOrder and
  // semantically occupied the whole module. Newer explicitly anchored records
  // without scopeOrder are treated as authored against the current topology.
  if (!hasAnchor && explicitScopeOrder == null) {
    return currentCells.filter(cell => yNorm >= cell.normBottom - EPS && yNorm <= cell.normTop + EPS);
  }

  const ownerScopeOrder = explicitScopeOrder ?? resolveSketchPartitionMaxOrder(args);
  const owner = findSketchPartitionCellAtNorm({
    ...args,
    maxOrder: ownerScopeOrder,
    xNorm,
    yNorm,
  });
  if (!owner) return [];
  return currentCells.filter(
    cell =>
      cell.normLeft >= owner.normLeft - EPS &&
      cell.normRight <= owner.normRight + EPS &&
      cell.normBottom >= owner.normBottom - EPS &&
      cell.normTop <= owner.normTop + EPS &&
      yNorm >= cell.normBottom - EPS &&
      yNorm <= cell.normTop + EPS
  );
}

export function resolveSketchPartitionDoorCount(args: {
  cell: SketchPartitionCell;
  moduleDoorCount: number;
  overrides?: readonly { xNorm?: number; yNorm?: number; count?: number; scopeOrder?: number }[];
  partition: ResolveSketchPartitionCellsArgs;
}): 1 | 2 {
  const moduleDoorCount = Math.max(1, Math.min(2, Math.round(args.moduleDoorCount || 1)));
  const matching = (args.overrides ?? [])
    .map((override, index) => {
      const count = override.count === 2 ? 2 : override.count === 1 ? 1 : null;
      if (count == null) return null;
      const xNorm = clampUnit(override.xNorm, 0.5);
      const yNorm = clampUnit(override.yNorm, 0.5);
      const scopeOrder =
        typeof override.scopeOrder === 'number' && Number.isFinite(override.scopeOrder)
          ? Math.max(0, override.scopeOrder)
          : resolveSketchPartitionMaxOrder(args.partition);
      const owner = findSketchPartitionCellAtNorm({ ...args.partition, maxOrder: scopeOrder, xNorm, yNorm });
      if (!owner) return null;
      const ownsCell =
        args.cell.normLeft >= owner.normLeft - EPS &&
        args.cell.normRight <= owner.normRight + EPS &&
        args.cell.normBottom >= owner.normBottom - EPS &&
        args.cell.normTop <= owner.normTop + EPS;
      return ownsCell
        ? {
            count,
            scopeOrder,
            area: (owner.normRight - owner.normLeft) * (owner.normTop - owner.normBottom),
            index,
          }
        : null;
    })
    .filter(
      (entry): entry is { count: 1 | 2; scopeOrder: number; area: number; index: number } => entry != null
    )
    .toSorted((a, b) => b.scopeOrder - a.scopeOrder || a.area - b.area || b.index - a.index);
  if (matching[0]) return matching[0].count;

  const widthShare = Math.max(EPS, args.cell.normRight - args.cell.normLeft);
  return Math.max(1, Math.min(2, Math.round(moduleDoorCount * widthShare))) as 1 | 2;
}
