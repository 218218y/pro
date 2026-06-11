import { getActiveOverrideCm, isOverrideActive } from '../features/special_dims/index.js';
import { __asNum } from './canvas_picking_core_helpers.js';
import type {
  CornerCellHeightDepthContext,
  CornerCellHeightDepthState,
} from './canvas_picking_cell_dims_corner_cell_height_depth_contracts.js';

export function resolveCornerCellHeightDepthState(
  ctx: CornerCellHeightDepthContext
): CornerCellHeightDepthState {
  const { sdCell, curH, curD, applyH, applyD } = ctx;

  const cellCurH = getActiveOverrideCm(sdCell, 'heightCm', 'baseHeightCm') ?? curH;
  const cellBaseH0 = __asNum(sdCell.baseHeightCm, NaN);
  const cellBaseH = Number.isFinite(cellBaseH0) && cellBaseH0 > 0 ? cellBaseH0 : curH;
  const hasActiveH = isOverrideActive(sdCell, 'heightCm', 'baseHeightCm');

  const cellCurD = getActiveOverrideCm(sdCell, 'depthCm', 'baseDepthCm') ?? curD;
  const cellBaseD0 = __asNum(sdCell.baseDepthCm, NaN);
  const cellBaseD = Number.isFinite(cellBaseD0) && cellBaseD0 > 0 ? cellBaseD0 : curD;
  const hasActiveD = isOverrideActive(sdCell, 'depthCm', 'baseDepthCm');

  const matchesTargetH = applyH != null ? Math.abs(cellCurH - applyH) < 1e-6 : true;
  const matchesTargetD = applyD != null ? Math.abs(cellCurD - applyD) < 1e-6 : true;
  const willChangeH = applyH != null && !matchesTargetH;
  const willChangeD = applyD != null && !matchesTargetD;

  const toggledBackCellH = !!(applyH != null && hasActiveH && matchesTargetH && !willChangeD);
  const toggledBackCellD = !!(applyD != null && hasActiveD && matchesTargetD && !willChangeH);
  const hasAnyEffect = willChangeH || willChangeD || toggledBackCellH || toggledBackCellD;

  return {
    cellCurH,
    cellBaseH,
    hasActiveH,
    cellCurD,
    cellBaseD,
    hasActiveD,
    matchesTargetH,
    matchesTargetD,
    willChangeH,
    willChangeD,
    toggledBackCellH,
    toggledBackCellD,
    hasAnyEffect,
  };
}
