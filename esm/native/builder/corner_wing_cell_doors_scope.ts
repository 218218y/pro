import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

// Corner wing door scoping + split policy helpers.
//
// Keep split/hinge defaults and edge-handle seeding out of per-door state math so
// state derivation can stay focused on geometry/layout values.

import { markEdgeHandleDefaultNone } from './edge_handle_default_none_runtime.js';
import type { CornerCellCfg } from './corner_wing_cell_shared.js';
import type { CornerWingDoorContext, CornerWingDoorState } from './corner_wing_cell_doors_contracts.js';

export function isSplit(ctx: CornerWingDoorContext, baseId: unknown): boolean {
  const idRaw = String(baseId || '');
  if (!idRaw) return ctx.stackKey === 'bottom' ? false : true;
  const idScoped = ctx.stackScopePartKey(idRaw);
  const keyScoped = idScoped.startsWith('split_') ? idScoped : `split_${idScoped}`;
  if (ctx.stackKey === 'bottom') {
    if (!(ctx.splitMap0 && Object.prototype.hasOwnProperty.call(ctx.splitMap0, keyScoped))) return false;
    return ctx.splitMap0[keyScoped] !== false;
  }
  if (
    ctx.splitMap0 &&
    Object.prototype.hasOwnProperty.call(ctx.splitMap0, keyScoped) &&
    ctx.splitMap0[keyScoped] === false
  )
    return false;
  if (idScoped !== idRaw) {
    const keyRaw = idRaw.startsWith('split_') ? idRaw : `split_${idRaw}`;
    if (
      ctx.splitMap0 &&
      Object.prototype.hasOwnProperty.call(ctx.splitMap0, keyRaw) &&
      ctx.splitMap0[keyRaw] === false
    )
      return false;
  }
  return true;
}

export function isSplitBottom(ctx: CornerWingDoorContext, baseId: unknown): boolean {
  const idRaw = String(baseId || '');
  if (!idRaw) return false;
  const idScoped = ctx.stackScopePartKey(idRaw);
  const keyScoped = idScoped.startsWith('splitb_') ? idScoped : `splitb_${idScoped}`;
  if (
    ctx.splitBottomMap0 &&
    Object.prototype.hasOwnProperty.call(ctx.splitBottomMap0, keyScoped) &&
    ctx.splitBottomMap0[keyScoped] === true
  )
    return true;
  if (ctx.stackKey === 'bottom') return false;
  if (idScoped !== idRaw) {
    const keyRaw = idRaw.startsWith('splitb_') ? idRaw : `splitb_${idRaw}`;
    if (
      ctx.splitBottomMap0 &&
      Object.prototype.hasOwnProperty.call(ctx.splitBottomMap0, keyRaw) &&
      ctx.splitBottomMap0[keyRaw] === true
    )
      return true;
  }
  return false;
}

export function hingeDirExplicit(ctx: CornerWingDoorContext, hingeKey: unknown): 'left' | 'right' | null {
  const rawKey = String(hingeKey || '');
  if (!rawKey) return null;
  const scopedKey = ctx.stackScopePartKey(rawKey);
  if (ctx.hingeMap0 && Object.prototype.hasOwnProperty.call(ctx.hingeMap0, scopedKey)) {
    const value = ctx.asRecord(ctx.hingeMap0)[scopedKey];
    return value === 'right' || value === 'left' ? value : 'left';
  }
  if (scopedKey !== rawKey && ctx.hingeMap0 && Object.prototype.hasOwnProperty.call(ctx.hingeMap0, rawKey)) {
    const value = ctx.asRecord(ctx.hingeMap0)[rawKey];
    return value === 'right' || value === 'left' ? value : 'left';
  }
  return null;
}

export function defaultHingeDir(ctx: CornerWingDoorContext, doorIdx: number): 'left' | 'right' {
  if (ctx.doorCount % CORNER_WING_DIMENSIONS.cells.doorsPerCell === 1 && doorIdx === ctx.doorCount - 1)
    return 'right';
  return doorIdx % CORNER_WING_DIMENSIONS.cells.doorsPerCell === 0 ? 'left' : 'right';
}

export function maybeSeedEdgeHandleDefaultNone(
  ctx: CornerWingDoorContext,
  doorIdx: number,
  doorBaseId: string,
  state: Pick<CornerWingDoorState, 'geom'>
): void {
  if (!(ctx.cfg0 && ctx.asRecord(ctx.cfg0).globalHandleType === 'edge' && ctx.App)) return;
  let doorsInCell = 0;
  let within = doorIdx;
  const cell = state.geom ? state.geom.cell : null;
  if (cell) {
    doorsInCell = Math.max(1, Number(cell.doorsInCell) || 1);
    const doorStart = Number(cell.doorStart);
    if (Number.isFinite(doorStart)) within = doorIdx - doorStart;
  }
  if (!doorsInCell) doorsInCell = Math.max(1, ctx.doorCount);

  if (
    doorsInCell >= CORNER_WING_DIMENSIONS.cells.doorsPerCell &&
    within % CORNER_WING_DIMENSIONS.cells.doorsPerCell === 0 &&
    within + 1 < doorsInCell
  ) {
    markEdgeHandleDefaultNone(ctx.App, ctx.stackKey === 'bottom' ? 'bottom' : 'top', doorBaseId, 'corner');
  }
}

export function computeBottomLineY(
  ctx: CornerWingDoorContext,
  cellCfg: CornerCellCfg | null,
  cellEffBottomY: number,
  doorBottomY: number,
  effectiveTopLimit: number
): number {
  let storageHeight = CORNER_WING_DIMENSIONS.connector.bottomStorageHeightM;
  const layout = (cellCfg && cellCfg.layout) || (ctx.uiAny.layout ?? null);
  if (layout === 'storage' || layout === 'storage_shelf')
    storageHeight = CORNER_WING_DIMENSIONS.connector.bottomStorageHeightM;
  if (cellCfg && cellCfg.customData && cellCfg.customData.storage)
    storageHeight = CORNER_WING_DIMENSIONS.connector.bottomStorageHeightM;
  let y = cellEffBottomY + storageHeight;
  if (doorBottomY > cellEffBottomY) {
    y += doorBottomY - cellEffBottomY + ctx.splitGap / 2;
  }
  y = Math.max(y, doorBottomY + CORNER_WING_DIMENSIONS.connector.bottomLineMinGapM);
  y = Math.min(y, effectiveTopLimit - CORNER_WING_DIMENSIONS.connector.bottomLineTopGapM);
  return y;
}
