import type { LinearCellDimsContext } from './canvas_picking_cell_dims_linear_shared.js';

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
  const curW = widthsCurr[idx];
  const curH = heightsCurr[idx];
  const curD = depthsCurr[idx];

  let tgtW = applyW != null ? applyW : curW;
  let tgtH = applyH != null ? applyH : curH;
  let tgtD = applyD != null ? applyD : curD;

  const isCustomW = Number.isFinite(baseW[idx]) && baseW[idx] > 0 && Math.abs(curW - baseW[idx]) > 1e-6;
  const isCustomH = Number.isFinite(baseH[idx]) && baseH[idx] > 0 && Math.abs(curH - baseH[idx]) > 1e-6;
  const isCustomD = Number.isFinite(baseD[idx]) && baseD[idx] > 0 && Math.abs(curD - baseD[idx]) > 1e-6;

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
    tgtW = baseW[idx];
    didToggleBack = true;
    toggledBackW = true;
  }
  if (applyH != null && isCustomH && matchesTargetH && !hasAnyNewChangeThisClick) {
    tgtH = baseH[idx];
    didToggleBack = true;
    toggledBackH = true;
  }
  if (applyD != null && isCustomD && matchesTargetD && !hasAnyNewChangeThisClick) {
    tgtD = baseD[idx];
    didToggleBack = true;
    toggledBackD = true;
  }

  return { tgtW, tgtH, tgtD, didToggleBack, toggledBackW, toggledBackH, toggledBackD };
}
