import { CORNER_WING_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { readFiniteNumber } from './corner_geometry_plan.js';
import { getCornerHexDoorDepth } from './corner_wing_hex_cell_geometry.js';

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
  const cellEffBottomY = readCellNumber(ctx, cell, 'effectiveBottomY') ?? ctx.startY + ctx.woodThick;
  const cellDrawerH = Math.max(0, readCellNumber(ctx, cell, 'drawerHeightTotal') ?? 0);
  const doorBottomY =
    cellEffBottomY + (cellDrawerH > 0 ? CORNER_WING_DIMENSIONS.connector.doorBottomOffsetM : 0);
  const cellDepth = readCellNumber(ctx, cell, 'depth');
  const cellD = cellDepth != null ? Math.max(CORNER_WING_DIMENSIONS.wing.minDepthM, cellDepth) : ctx.wingD;
  const doorDepth = cell ? getCornerHexDoorDepth(cell, cellD) : cellD;
  const doorZShift = doorDepth - ctx.wingD;
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
  const bodyHeight = readCellNumber(ctx, cell, 'bodyHeight') ?? ctx.wingH;
  return ctx.startY + bodyHeight - ctx.woodThick / 2;
}

function getDoorGeom(ctx: CornerWingDoorContext, doorIdx: number): DoorGeomLike {
  const cell = getCellForDoor(ctx, doorIdx);
  const startX = readCellNumber(ctx, cell, 'startX');
  const width = readCellNumber(ctx, cell, 'width');
  if (cell && startX != null && width != null) {
    const doorsInCell = readPositiveIntFromCell(ctx, cell, 'doorsInCell', 1);
    const doorStart = readCellNumber(ctx, cell, 'doorStart');
    const within =
      doorStart != null
        ? doorIdx - Math.floor(doorStart)
        : doorIdx % CORNER_WING_DIMENSIONS.cells.doorsPerCell;
    const hexGeometry = cell.__hexCellGeometry;
    const hexDoorWidth = hexGeometry ? readFiniteNumber(hexGeometry.doorWidthM) : null;
    if (hexGeometry && hexDoorWidth != null) {
      const centerX = readCellNumber(ctx, cell, 'centerX');
      const doorSpanW = Math.max(ctx.woodThick, hexDoorWidth);
      const doorW = doorSpanW / doorsInCell;
      const doorLeftX = (centerX ?? startX + width / 2) - doorSpanW / 2;
      const dX = doorLeftX + within * doorW + doorW / 2;
      return { cell, doorW, dX };
    }
    const doorW = width / doorsInCell;
    const dX = startX + within * doorW + doorW / 2;
    return { cell, doorW, dX };
  }
  const doorW = ctx.fallbackDoorW;
  const dX = ctx.blindWidth + doorIdx * doorW + doorW / 2;
  return { cell: null, doorW, dX };
}

function readCellNumber(
  ctx: CornerWingDoorContext,
  cell: ReturnType<typeof getCellForDoor>,
  key: string
): number | null {
  return readFiniteNumber(cell ? ctx.asRecord(cell)[key] : undefined);
}

function readPositiveIntFromCell(
  ctx: CornerWingDoorContext,
  cell: ReturnType<typeof getCellForDoor>,
  key: string,
  defaultValue: number
): number {
  const value = readCellNumber(ctx, cell, key);
  return value != null && value > 0 ? Math.max(1, Math.floor(value)) : defaultValue;
}
