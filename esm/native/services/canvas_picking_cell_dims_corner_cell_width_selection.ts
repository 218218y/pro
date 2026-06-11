import { cloneSpecialDims, getActiveOverrideCm, isOverrideActive } from '../features/special_dims/index.js';
import { __asNum } from './canvas_picking_core_helpers.js';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import { readCornerSpecialDims, reportCornerDimsIssue } from './canvas_picking_cell_dims_corner_shared.js';
import type {
  CornerCellWidthDistribution,
  CornerCellWidthSelectionState,
} from './canvas_picking_cell_dims_corner_cell_width_contracts.js';

export function resolveCornerCellWidthSelectionState(
  ctx: CornerCellDimsContext,
  distribution: CornerCellWidthDistribution
): CornerCellWidthSelectionState | null {
  const { App, applyW, applyH, applyD, cellIdx, curH, curD } = ctx;
  if (!(cellIdx >= 0 && cellIdx < distribution.widthsCurr.length)) return null;

  const widthsNext = distribution.widthsCurr.slice();
  const curCellW = distribution.widthsCurr[cellIdx] || 0;

  let curCellH = curH;
  let cellBaseH = curH;
  let hasActiveH = false;
  let curCellD = curD;
  let cellBaseD = curD;
  let hasActiveD = false;
  let cellBaseW = curCellW;
  let hasActiveW = false;

  try {
    const selectedCellCfg = distribution.getCellCfg(cellIdx);
    const selectedDims = cloneSpecialDims(readCornerSpecialDims(selectedCellCfg));

    const baseW0 = __asNum(selectedDims.baseWidthCm, NaN);
    if (Number.isFinite(baseW0) && baseW0 > 0) cellBaseW = baseW0;
    const baseH0 = __asNum(selectedDims.baseHeightCm, NaN);
    if (Number.isFinite(baseH0) && baseH0 > 0) cellBaseH = baseH0;
    const baseD0 = __asNum(selectedDims.baseDepthCm, NaN);
    if (Number.isFinite(baseD0) && baseD0 > 0) cellBaseD = baseD0;

    const hAct = getActiveOverrideCm(selectedDims, 'heightCm', 'baseHeightCm');
    if (hAct != null) curCellH = hAct;
    hasActiveH = isOverrideActive(selectedDims, 'heightCm', 'baseHeightCm');

    const dAct = getActiveOverrideCm(selectedDims, 'depthCm', 'baseDepthCm');
    if (dAct != null) curCellD = dAct;
    hasActiveD = isOverrideActive(selectedDims, 'depthCm', 'baseDepthCm');

    hasActiveW = isOverrideActive(selectedDims, 'widthCm', 'baseWidthCm');
  } catch (_e) {
    reportCornerDimsIssue(App, _e, 'cellDims.corner.width.readOverrides');
  }

  const matchesTargetH = applyH != null ? Math.abs(curCellH - applyH) < 1e-6 : true;
  const willChangeH = applyH != null && !matchesTargetH;
  const matchesTargetD = applyD != null ? Math.abs(curCellD - applyD) < 1e-6 : true;
  const willChangeD = applyD != null && !matchesTargetD;
  const matchesTargetW = applyW != null ? Math.abs(curCellW - applyW) < 1e-6 : true;
  const willChangeW = applyW != null && !matchesTargetW;

  let tgtCellW = applyW != null ? applyW : curCellW;
  const minForCell = distribution.minW[cellIdx] || 5;

  const toggledBackCellW = !!(applyW != null && hasActiveW && matchesTargetW && !willChangeH && !willChangeD);
  if (toggledBackCellW) tgtCellW = cellBaseW;

  let tgtCellH = applyH != null ? applyH : curCellH;
  const toggledBackCellH = !!(applyH != null && hasActiveH && matchesTargetH && !willChangeW && !willChangeD);
  if (toggledBackCellH) tgtCellH = cellBaseH;

  let tgtCellD = applyD != null ? applyD : curCellD;
  const toggledBackCellD = !!(applyD != null && hasActiveD && matchesTargetD && !willChangeW && !willChangeH);
  if (toggledBackCellD) tgtCellD = cellBaseD;

  const hasAnyEffect =
    willChangeW || willChangeH || willChangeD || toggledBackCellW || toggledBackCellH || toggledBackCellD;

  if (tgtCellW < minForCell) tgtCellW = minForCell;
  widthsNext[cellIdx] = tgtCellW;

  return {
    widthsNext,
    curCellW,
    curCellH,
    curCellD,
    cellBaseW,
    cellBaseH,
    cellBaseD,
    hasActiveW,
    hasActiveH,
    hasActiveD,
    willChangeW,
    willChangeH,
    willChangeD,
    toggledBackCellW,
    toggledBackCellH,
    toggledBackCellD,
    tgtCellW,
    tgtCellH,
    tgtCellD,
    hasAnyEffect,
    newWingWcm: Math.max(
      0,
      widthsNext.reduce((a, b) => a + b, 0)
    ),
  };
}
