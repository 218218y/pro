import { getActiveOverrideCm } from '../features/special_dims/index.js';

import { __asInt, __asNum } from './canvas_picking_core_helpers.js';
import { asModuleShape, readSpecialDimsRecord } from './canvas_picking_cell_dims_linear_shared.js';

export interface LinearCurrentDimsState {
  defaultWidths: number[];
  widthsCurr: number[];
  heightsCurr: number[];
  depthsCurr: number[];
  baseW: number[];
  baseH: number[];
  baseD: number[];
}

export function computeCurrentLinearDims(
  modules: unknown[],
  moduleCount: number,
  totalW: number,
  totalH: number,
  totalD: number,
  doorsPerModule: number[],
  sumDoors: number,
  prevModsCfg: unknown[]
): LinearCurrentDimsState {
  const defaultWidths: number[] = doorsPerModule.map(d => (totalW > 0 ? (totalW * d) / sumDoors : 0));
  const widthsCurr: number[] = [];
  const heightsCurr: number[] = [];
  const depthsCurr: number[] = [];
  const baseW: number[] = [];
  const baseH: number[] = [];
  const baseD: number[] = [];

  const fixedW: (number | null)[] = new Array(moduleCount).fill(null);
  let fixedSumW = 0;
  let missingUnitsW = 0;
  for (let i = 0; i < moduleCount; i++) {
    const prev = asModuleShape(prevModsCfg[i]);
    const prevSD = readSpecialDimsRecord(prev) || {};
    const widthFixed = getActiveOverrideCm(prevSD, 'widthCm', 'baseWidthCm');
    if (widthFixed != null && Number.isFinite(widthFixed) && widthFixed > 0) {
      fixedW[i] = widthFixed;
      fixedSumW += widthFixed;
    } else {
      fixedW[i] = null;
      missingUnitsW += doorsPerModule[i];
    }
  }

  const remainingW = totalW - fixedSumW;
  const denomW = missingUnitsW > 0 ? missingUnitsW : 1;
  const fallbackDenomW = sumDoors > 0 ? sumDoors : Math.max(1, moduleCount);

  for (let i = 0; i < moduleCount; i++) {
    const prev = asModuleShape(prevModsCfg[i]);
    const prevSD = readSpecialDimsRecord(prev) || {};

    let wcm = fixedW[i];
    if (wcm == null) {
      const doorsU = Math.max(1, doorsPerModule[i]);
      let seg = (remainingW * doorsU) / denomW;
      if (!Number.isFinite(seg) || seg <= 0) seg = (totalW * doorsU) / fallbackDenomW;
      if (!Number.isFinite(seg) || seg <= 0) seg = defaultWidths[i];
      wcm = seg;
    }

    let hcm = __asNum(prevSD.heightCm, NaN);
    let dcm = __asNum(prevSD.depthCm, NaN);
    if (!Number.isFinite(hcm) || hcm <= 0) hcm = totalH;
    if (!Number.isFinite(dcm) || dcm <= 0) dcm = totalD;

    let bwcm = __asNum(prevSD.baseWidthCm, NaN);
    let bhcm = __asNum(prevSD.baseHeightCm, NaN);
    let bdcm = __asNum(prevSD.baseDepthCm, NaN);

    if (!Number.isFinite(bwcm) || bwcm <= 0) bwcm = Number(wcm) || defaultWidths[i];
    if (!Number.isFinite(bhcm) || bhcm <= 0) bhcm = totalH;
    if (!Number.isFinite(bdcm) || bdcm <= 0) bdcm = totalD;

    widthsCurr.push(Number(wcm) || 0);
    heightsCurr.push(hcm);
    depthsCurr.push(dcm);
    baseW.push(bwcm);
    baseH.push(bhcm);
    baseD.push(bdcm);
  }

  return { defaultWidths, widthsCurr, heightsCurr, depthsCurr, baseW, baseH, baseD };
}
