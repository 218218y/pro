import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

// Corner wing door state derivation.
//
// Keep per-door geometry, hinge direction, and split-state derivation out of the
// public wing-door owner so full/split emitters receive one canonical state object.

import type { DoorGeomLike } from './corner_wing_cell_shared.js';
import type { CornerWingDoorContext, CornerWingDoorState } from './corner_wing_cell_doors_contracts.js';
import {
  computeBottomLineY,
  defaultHingeDir,
  hingeDirExplicit,
  isSplit,
  isSplitBottom,
  maybeSeedEdgeHandleDefaultNone,
} from './corner_wing_cell_doors_scope.js';

export function createCornerWingDoorState(ctx: CornerWingDoorContext, doorIdx: number): CornerWingDoorState {
  const cell = getCellForDoor(ctx, doorIdx);
  const cellKey = cell && cell.key ? String(cell.key) : 'corner';
  const cellCfg = cell && cell.cfg ? cell.cfg : null;
  const cellEffBottomY =
    cell && Number.isFinite(cell.effectiveBottomY) ? cell.effectiveBottomY : ctx.startY + ctx.woodThick;
  const cellDrawerH = cell && Number.isFinite(cell.drawerHeightTotal) ? cell.drawerHeightTotal : 0;
  const doorBottomY =
    cellEffBottomY + (cellDrawerH > 0 ? CORNER_WING_DIMENSIONS.connector.doorBottomOffsetM : 0);
  const cellD =
    cell && Number.isFinite(ctx.asRecord(cell).depth)
      ? Math.max(CORNER_WING_DIMENSIONS.wing.minDepthM, Number(ctx.asRecord(cell).depth))
      : ctx.wingD;
  const doorZShift = cellD - ctx.wingD;
  const effectiveTopLimit = getEffectiveTopLimitForDoor(ctx, doorIdx);
  const splitLineY =
    ctx.startY +
    ctx.woodThick +
    (CORNER_WING_DIMENSIONS.cells.splitGridLineIndex * (effectiveTopLimit - (ctx.startY + ctx.woodThick))) /
      CORNER_WING_DIMENSIONS.cells.defaultGridDivisions;
  const doorBaseId = `corner_door_${doorIdx + 1}`;
  const scopedDoorBaseId = ctx.stackKey === 'bottom' ? ctx.stackScopePartKey(doorBaseId) : doorBaseId;
  const geom = getDoorGeom(ctx, doorIdx);

  maybeSeedEdgeHandleDefaultNone(ctx, doorIdx, doorBaseId, { geom });

  const doorW = ctx.readNumFrom(geom, 'doorW', ctx.fallbackDoorW);
  const dX = ctx.readNumFrom(
    geom,
    'dX',
    ctx.blindWidth + doorIdx * ctx.fallbackDoorW + ctx.fallbackDoorW / 2
  );
  const hingeKey = `${doorBaseId}_hinge`;
  const chosenDirection = hingeDirExplicit(ctx, hingeKey) || defaultHingeDir(ctx, doorIdx);
  const isLeftHinge = chosenDirection === 'left';
  const pivotX = dX + (isLeftHinge ? -doorW / 2 : doorW / 2);
  const meshOffset = isLeftHinge ? doorW / 2 : -doorW / 2;
  const totalDoorH = effectiveTopLimit - doorBottomY - CORNER_WING_DIMENSIONS.connector.doorTopClearanceM;
  const topSplitEnabled = ctx.splitDoors && isSplit(ctx, doorBaseId);
  const bottomSplitEnabled = ctx.splitDoors && isSplitBottom(ctx, doorBaseId);
  const shouldSplit = ctx.splitDoors && (topSplitEnabled || bottomSplitEnabled);
  const bottomLineY = computeBottomLineY(ctx, cellCfg, cellEffBottomY, doorBottomY, effectiveTopLimit);

  return {
    doorIdx,
    cell,
    cellKey,
    cellCfg,
    cellEffBottomY,
    cellDrawerH,
    doorBottomY,
    cellD,
    doorZShift,
    effectiveTopLimit,
    splitLineY,
    doorBaseId,
    scopedDoorBaseId,
    geom,
    doorW,
    dX,
    chosenDirection,
    isLeftHinge,
    pivotX,
    meshOffset,
    totalDoorH,
    topSplitEnabled,
    bottomSplitEnabled,
    shouldSplit,
    bottomLineY,
  };
}

export function defaultHandleAbsYForPart(ctx: CornerWingDoorContext, partId: string): number {
  let handleAbsY = ctx.cornerSharedAlignedEdgeHandleBaseAbsY;
  if (ctx.isLongEdgeHandleVariantForPart(ctx.cfg0, partId)) {
    handleAbsY += ctx.cornerSharedLongEdgeHandleLiftAbsY;
  }
  return handleAbsY;
}

export function clampHandleAbsY(
  ctx: CornerWingDoorContext,
  partId: string,
  absY: number,
  segBottomY: number,
  segTopY: number
): number {
  return ctx.clampHandleAbsYForPart(ctx.cfg0, partId, absY, segBottomY, segTopY);
}

function getCellForDoor(ctx: CornerWingDoorContext, doorIdx: number) {
  const cellIndex = Math.floor(doorIdx / CORNER_WING_DIMENSIONS.cells.doorsPerCell);
  return ctx.cornerCells && ctx.cornerCells.length > 0
    ? ctx.cornerCells[cellIndex] || ctx.cornerCells[0]
    : null;
}

function getEffectiveTopLimitForDoor(ctx: CornerWingDoorContext, doorIdx: number): number {
  const cell = getCellForDoor(ctx, doorIdx);
  const bodyHeight = cell && Number.isFinite(cell.bodyHeight) ? Number(cell.bodyHeight) : ctx.wingH;
  return ctx.startY + bodyHeight - ctx.woodThick / 2;
}

function getDoorGeom(ctx: CornerWingDoorContext, doorIdx: number): DoorGeomLike {
  const cell = getCellForDoor(ctx, doorIdx);
  if (cell && Number.isFinite(ctx.asRecord(cell).startX) && Number.isFinite(ctx.asRecord(cell).width)) {
    const doorsInCell = Math.max(1, Number(ctx.asRecord(cell).doorsInCell) || 1);
    const doorW = Number(ctx.asRecord(cell).width) / doorsInCell;
    const doorStart = Number(ctx.asRecord(cell).doorStart);
    const within = Number.isFinite(doorStart)
      ? doorIdx - doorStart
      : doorIdx % CORNER_WING_DIMENSIONS.cells.doorsPerCell;
    const dX = Number(ctx.asRecord(cell).startX) + within * doorW + doorW / 2;
    return { cell, doorW, dX };
  }
  const doorW = ctx.fallbackDoorW;
  const dX = ctx.blindWidth + doorIdx * doorW + doorW / 2;
  return { cell: null, doorW, dX };
}
