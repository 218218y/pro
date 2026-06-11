import type { CornerCell } from './corner_wing_cell_shared.js';
import type {
  CornerWingInteriorCellRuntime,
  CornerWingInteriorRuntime,
} from './corner_wing_cell_interiors_contracts.js';

function needsIndependentWallsAtBoundary(
  runtime: CornerWingInteriorRuntime,
  leftIdx: number,
  rightIdx: number
): boolean {
  const l = runtime.cornerCells[leftIdx];
  const r = runtime.cornerCells[rightIdx];
  return !!(l && l.__hasActiveSpecialDims) || !!(r && r.__hasActiveSpecialDims);
}

export function getCornerCellInnerFacesX(
  runtime: CornerWingInteriorRuntime,
  cellIndex: number
): { leftX: number; rightX: number } {
  const len = runtime.cornerCells.length;
  const c = runtime.cornerCells[cellIndex];
  const start = c ? c.startX : 0;
  const end = start + (c ? c.width : 0);

  let leftX = start + runtime.woodThick;
  let rightX = end - runtime.woodThick;

  if (cellIndex <= 0) {
    leftX = runtime.blindWidth + runtime.woodThick;
  } else {
    const boundaryX = start;
    leftX =
      boundaryX +
      (needsIndependentWallsAtBoundary(runtime, cellIndex - 1, cellIndex)
        ? runtime.woodThick
        : runtime.woodThick / 2);
  }

  if (cellIndex >= len - 1) {
    rightX = runtime.wingW - runtime.woodThick;
  } else {
    const n = runtime.cornerCells[cellIndex + 1];
    const boundaryX = n ? n.startX : end;
    rightX =
      boundaryX -
      (needsIndependentWallsAtBoundary(runtime, cellIndex, cellIndex + 1)
        ? runtime.woodThick
        : runtime.woodThick / 2);
  }

  if (!Number.isFinite(leftX)) leftX = start + runtime.woodThick;
  if (!Number.isFinite(rightX)) rightX = end - runtime.woodThick;

  if (!(rightX > leftX + 0.02)) {
    const cx = c ? c.centerX : (start + end) / 2;
    const w = Math.max(0.05, (c ? c.width : 0) - runtime.woodThick * 2);
    leftX = cx - w / 2;
    rightX = cx + w / 2;
  }

  return { leftX, rightX };
}

export function createCornerWingInteriorCellRuntime(
  runtime: CornerWingInteriorRuntime,
  cell: CornerCell
): CornerWingInteriorCellRuntime {
  const cfgCell = cell.cfg;
  const cellKey = cell.key;
  const cellW = Math.max(0.05, cell.width);
  const cellCenterX = cell.centerX;
  const facesX = getCornerCellInnerFacesX(runtime, cell.idx);
  const cellInnerLeftX = facesX.leftX;
  const cellInnerRightX = facesX.rightX;
  const cellInnerW = Math.max(0.05, cellInnerRightX - cellInnerLeftX);
  const cellInnerCenterX = (cellInnerLeftX + cellInnerRightX) / 2;
  const cellShelfW = Math.max(0.05, cellInnerW - 0.005);
  const cellD = Math.max(0.2, cell.depth);
  const zShift = cellD - runtime.wingD;
  const __z = (z: number) => z + zShift;
  const __braceSet: Record<number, true> = Object.create(null);
  const arr = Array.isArray(cfgCell.braceShelves) ? cfgCell.braceShelves : [];
  for (let i = 0; i < arr.length; i++) {
    const v = parseInt(String(arr[i]), 10);
    if (Number.isFinite(v) && v > 0) __braceSet[v] = true;
  }
  const __internalDepth = Math.max(0.05, cellD - 0.05);
  const regularShelfDepth = 0.45;
  const __regularDepth = Math.min(__internalDepth, regularShelfDepth);
  const __fullDepthCenterZ = -runtime.wingD + cellD / 2 - 0.015;
  const __backFaceZ = __fullDepthCenterZ - __internalDepth / 2;

  return {
    runtime,
    cell,
    cfgCell,
    cellKey,
    cellW,
    cellCenterX,
    cellInnerLeftX,
    cellInnerRightX,
    cellInnerW,
    cellInnerCenterX,
    cellShelfW,
    cellD,
    effectiveBottomY: cell.effectiveBottomY,
    effectiveTopY: cell.effectiveTopY,
    internalStartY: runtime.startY + runtime.woodThick,
    gridDivisions: cell.gridDivisions,
    localGridStep: cell.localGridStep,
    __braceSet,
    __internalDepth,
    __regularDepth,
    __fullDepthCenterZ,
    __backFaceZ,
    __z,
  };
}
