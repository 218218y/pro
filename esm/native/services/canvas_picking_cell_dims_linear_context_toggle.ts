import type { LinearCellDimsContext } from './canvas_picking_cell_dims_linear_shared.js';
import { readRequiredLinearDimension } from './canvas_picking_cell_dims_linear_shared.js';

export function applyLinearToggleBack(
  idx: number,
  applyW: number | null,
  applyH: number | null,
  applyD: number | null,
  widthsCurr: number[],
  heightsCurr: number[],
  depthsCurr: number[],
  baseW: number[],
  baseH: number[],
  baseD: number[]
): Pick<
  LinearCellDimsContext,
  'tgtW' | 'tgtH' | 'tgtD' | 'didToggleBack' | 'toggledBackW' | 'toggledBackH' | 'toggledBackD'
> {
  const curW = readRequiredLinearDimension(widthsCurr, idx, 'current width');
  const curH = readRequiredLinearDimension(heightsCurr, idx, 'current height');
  const curD = readRequiredLinearDimension(depthsCurr, idx, 'current depth');
  const baseWidth = readRequiredLinearDimension(baseW, idx, 'base width');
  const baseHeight = readRequiredLinearDimension(baseH, idx, 'base height');
  const baseDepth = readRequiredLinearDimension(baseD, idx, 'base depth');

  let tgtW = applyW != null ? applyW : curW;
  let tgtH = applyH != null ? applyH : curH;
  let tgtD = applyD != null ? applyD : curD;

  const isCustomW = Number.isFinite(baseWidth) && baseWidth > 0 && Math.abs(curW - baseWidth) > 1e-6;
  const isCustomH = Number.isFinite(baseHeight) && baseHeight > 0 && Math.abs(curH - baseHeight) > 1e-6;
  const isCustomD = Number.isFinite(baseDepth) && baseDepth > 0 && Math.abs(curD - baseDepth) > 1e-6;

  const matchesTargetW = Math.abs(curW - tgtW) < 1e-6;
  const matchesTargetH = Math.abs(curH - tgtH) < 1e-6;
  const matchesTargetD = Math.abs(curD - tgtD) < 1e-6;

  const willChangeW = applyW != null && !matchesTargetW;
  const willChangeH = applyH != null && !matchesTargetH;
  const willChangeD = applyD != null && !matchesTargetD;
  const hasAnyNewChangeThisClick = willChangeW || willChangeH || willChangeD;

  let didToggleBack = false;
  let toggledBackW = false;
  let toggledBackH = false;
  let toggledBackD = false;
  if (applyW != null && isCustomW && matchesTargetW && !hasAnyNewChangeThisClick) {
    tgtW = baseWidth;
    didToggleBack = true;
    toggledBackW = true;
  }
  if (applyH != null && isCustomH && matchesTargetH && !hasAnyNewChangeThisClick) {
    tgtH = baseHeight;
    didToggleBack = true;
    toggledBackH = true;
  }
  if (applyD != null && isCustomD && matchesTargetD && !hasAnyNewChangeThisClick) {
    tgtD = baseDepth;
    didToggleBack = true;
    toggledBackD = true;
  }

  return { tgtW, tgtH, tgtD, didToggleBack, toggledBackW, toggledBackH, toggledBackD };
}
