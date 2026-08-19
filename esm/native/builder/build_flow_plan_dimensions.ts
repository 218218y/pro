import { getActiveHeightCmFromConfig, getActiveDepthCmFromConfig } from '../features/special_dims/index.js';
import { resolveHexCellGeometry } from '../features/hex_cell/index.js';
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
  const offHcm =
    splitActiveForBuild && typeof lowerHeightCm === 'number' && Number.isFinite(lowerHeightCm)
      ? lowerHeightCm
      : 0;
  for (const moduleConfig of list) {
    const m = readModuleConfig(moduleConfig);
    const hCmActive = getActiveHeightCmFromConfig(m, offHcm);
    const active = typeof hCmActive === 'number' && Number.isFinite(hCmActive) && hCmActive > 0;
    allHeightManual = allHeightManual && !!active;
    const hm = active && typeof hCmActive === 'number' ? hCmActive / 100 : H;
    moduleHeightsTotal.push(Math.max(woodThick, hm));
  }

  const carcassH = (() => {
    let maxH = 0;
    for (const v of moduleHeightsTotal) {
      if (v > maxH) maxH = v;
    }
    if (!Number.isFinite(maxH) || maxH <= 0) maxH = H;

    if (!allHeightManual) return Math.max(H, maxH);
    return maxH;
  })();

  return { moduleHeightsTotal, carcassH };
}

export function collectModuleDepths(args: {
  moduleCfgList: ModuleConfigLike[];
  moduleInternalWidths?: number[] | null;
  D: number;
  woodThick: number;
}): { moduleDepthsTotal: number[]; carcassD: number } {
  const { moduleCfgList, moduleInternalWidths, D, woodThick } = args;
  const moduleDepthsTotal: number[] = [];
  let allDepthManual = true;

  const list = Array.isArray(moduleCfgList) ? moduleCfgList : [];
  for (const [i, moduleConfig] of list.entries()) {
    const m = readModuleConfig(moduleConfig);
    const dCmActive = getActiveDepthCmFromConfig(m);
    const active = typeof dCmActive === 'number' && Number.isFinite(dCmActive) && dCmActive > 0;
    allDepthManual = allDepthManual && !!active;
    const dm = active && typeof dCmActive === 'number' ? dCmActive / 100 : D;
    const moduleInternalWidth = Array.isArray(moduleInternalWidths) ? moduleInternalWidths[i] : undefined;
    const hexGeometry = resolveHexCellGeometry({
      cfgMod: m,
      moduleWidthM:
        typeof moduleInternalWidth === 'number' && Number.isFinite(moduleInternalWidth)
          ? Math.max(woodThick * 2, moduleInternalWidth)
          : D,
      defaultDepthM: D,
      woodThickM: woodThick,
    });
    moduleDepthsTotal.push(Math.max(woodThick, hexGeometry ? hexGeometry.sideDepthM : dm));
  }

  const carcassD = (() => {
    if (!allDepthManual) return D;
    let maxD = 0;
    for (const v of moduleDepthsTotal) {
      if (v > maxD) maxD = v;
    }
    if (!Number.isFinite(maxD) || maxD <= 0) return D;
    return maxD;
  })();

  return { moduleDepthsTotal, carcassD };
}
