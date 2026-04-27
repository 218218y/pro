import { getActiveHeightCmFromConfig, getActiveDepthCmFromConfig } from '../features/special_dims/index.js';
import { readModuleConfig } from './build_flow_readers.js';

import type { ModuleConfigLike } from '../../../types';

export function collectModuleHeights(args: {
  moduleCfgList: ModuleConfigLike[];
  splitActiveForBuild: boolean;
  lowerHeightCm: number;
  H: number;
  woodThick: number;
}): { moduleHeightsTotal: number[]; carcassH: number } {
  const { moduleCfgList, splitActiveForBuild, lowerHeightCm, H, woodThick } = args;
  const moduleHeightsTotal: number[] = [];
  let allHeightManual = true;

  const list = Array.isArray(moduleCfgList) ? moduleCfgList : [];
  const offHcm = splitActiveForBuild ? Number(lowerHeightCm) : 0;
  for (let i = 0; i < list.length; i++) {
    const m = readModuleConfig(list[i]);
    const hCmActive = getActiveHeightCmFromConfig(m, offHcm);
    const active = typeof hCmActive === 'number' && Number.isFinite(hCmActive) && hCmActive > 0;
    allHeightManual = allHeightManual && !!active;
    const hm = active && typeof hCmActive === 'number' ? hCmActive / 100 : H;
    moduleHeightsTotal.push(Math.max(woodThick, hm));
  }

  const carcassH = (() => {
    let maxH = 0;
    for (let i = 0; i < moduleHeightsTotal.length; i++) {
      const v = Number(moduleHeightsTotal[i]);
      if (Number.isFinite(v) && v > maxH) maxH = v;
    }
    if (!Number.isFinite(maxH) || maxH <= 0) maxH = H;

    if (!allHeightManual) return Math.max(H, maxH);
    return maxH;
  })();

  return { moduleHeightsTotal, carcassH };
}

export function collectModuleDepths(args: {
  moduleCfgList: ModuleConfigLike[];
  D: number;
  woodThick: number;
}): { moduleDepthsTotal: number[]; carcassD: number } {
  const { moduleCfgList, D, woodThick } = args;
  const moduleDepthsTotal: number[] = [];
  let allDepthManual = true;

  const list = Array.isArray(moduleCfgList) ? moduleCfgList : [];
  for (let i = 0; i < list.length; i++) {
    const m = readModuleConfig(list[i]);
    const dCmActive = getActiveDepthCmFromConfig(m);
    const active = typeof dCmActive === 'number' && Number.isFinite(dCmActive) && dCmActive > 0;
    allDepthManual = allDepthManual && !!active;
    const dm = active && typeof dCmActive === 'number' ? dCmActive / 100 : D;
    moduleDepthsTotal.push(Math.max(woodThick, dm));
  }

  const carcassD = (() => {
    if (!allDepthManual) return D;
    let maxD = 0;
    for (let i = 0; i < moduleDepthsTotal.length; i++) {
      const v = Number(moduleDepthsTotal[i]);
      if (Number.isFinite(v) && v > maxD) maxD = v;
    }
    if (!Number.isFinite(maxD) || maxD <= 0) return D;
    return maxD;
  })();

  return { moduleDepthsTotal, carcassD };
}
