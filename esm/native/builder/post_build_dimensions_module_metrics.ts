import type { AppContainer } from '../../../types/index.js';
import {
  getActiveWidthCmFromConfig,
  getActiveHeightCmFromConfig,
  getActiveDepthCmFromConfig,
} from '../features/special_dims/index.js';

import type { PostBuildDimensionMetrics } from './post_build_dimensions_shared.js';
import { asArray, asRecord, isRecord, readKey, reportPostBuildSoft } from './post_build_extras_shared.js';

export function derivePostBuildDimensionMetrics(args: {
  ctx: unknown;
  App: AppContainer;
  H: number | null | undefined;
  D: number | null | undefined;
  totalW: number | null | undefined;
  stackSplitActive: boolean;
  splitBottomHeightCm: number;
  splitBottomDepthCm: number;
}): PostBuildDimensionMetrics {
  const { ctx, App, H, D, totalW, stackSplitActive, splitBottomHeightCm, splitBottomDepthCm } = args;

  let moduleWidthsCm: number[] | null = null;
  let moduleHeightsCm: number[] | null = null;
  let moduleDepthsCm: number[] | null = null;
  let moduleHeightsAllManual = false;
  let moduleDepthsAllManual = false;

  const overallHeightCm =
    ctx && isRecord(ctx) && isRecord(ctx.dims) && typeof ctx.dims.heightCm === 'number'
      ? Number(ctx.dims.heightCm)
      : NaN;
  const overallDepthCm =
    ctx && isRecord(ctx) && isRecord(ctx.dims) && typeof ctx.dims.depthCm === 'number'
      ? Number(ctx.dims.depthCm)
      : NaN;

  let dimH =
    stackSplitActive && Number.isFinite(overallHeightCm) && overallHeightCm > 0
      ? overallHeightCm / 100
      : typeof H === 'number'
        ? H
        : 0;

  const dimDBase =
    stackSplitActive && Number.isFinite(overallDepthCm) && overallDepthCm > 0
      ? overallDepthCm / 100
      : typeof D === 'number'
        ? D
        : 0;

  const dimD =
    stackSplitActive && Number.isFinite(splitBottomDepthCm) && splitBottomDepthCm > 0
      ? Math.max(dimDBase, splitBottomDepthCm / 100)
      : dimDBase;

  try {
    const layout = ctx && isRecord(ctx) && isRecord(ctx.layout) ? ctx.layout : null;
    const mods = asArray(readKey(layout, 'modules'));
    const cfgList = asArray(readKey(layout, 'moduleCfgList'));

    const totalWcm = typeof totalW === 'number' ? totalW * 100 : 0;

    let sumDoors = 0;
    const doorsArr: number[] = [];
    for (let i = 0; i < mods.length; i++) {
      const m = asRecord(mods[i]);
      const d = Math.max(1, Number(m ? readKey(m, 'doors') : 1) || 1);
      doorsArr.push(d);
      sumDoors += d;
    }
    if (sumDoors < 1) sumDoors = mods.length || 1;

    let hasWidthOverride = false;

    const segWidthsCm: number[] = new Array(mods.length);
    const missing: boolean[] = new Array(mods.length);
    let fixedSumCm = 0;
    let missingUnits = 0;

    for (let i = 0; i < mods.length; i++) {
      const cfgMod = i < cfgList.length ? cfgList[i] : null;
      const wActive = getActiveWidthCmFromConfig(cfgMod);
      const active = typeof wActive === 'number' && Number.isFinite(wActive) && wActive > 0;

      if (active) {
        hasWidthOverride = true;
        segWidthsCm[i] = wActive;
        fixedSumCm += wActive;
        missing[i] = false;
      } else {
        segWidthsCm[i] = NaN;
        missing[i] = true;
        missingUnits += doorsArr[i] || 1;
      }
    }

    if (missingUnits > 0) {
      const remainingCm = totalWcm - fixedSumCm;
      const denom = missingUnits > 0 ? missingUnits : 1;
      const fallbackDenom = sumDoors > 0 ? sumDoors : mods.length || 1;

      for (let i = 0; i < mods.length; i++) {
        if (!missing[i]) continue;
        const doors = doorsArr[i] || 1;
        let seg = (remainingCm * doors) / denom;
        if (!Number.isFinite(seg) || seg <= 0) {
          seg = (totalWcm * doors) / fallbackDenom;
        }
        segWidthsCm[i] = seg;
      }
    }

    let sumSegCm = 0;
    for (let i = 0; i < segWidthsCm.length; i++) sumSegCm += Number(segWidthsCm[i]) || 0;
    const deltaCm = totalWcm - sumSegCm;

    if (mods.length > 0 && Number.isFinite(deltaCm) && Math.abs(deltaCm) > 1e-6) {
      const MIN_SEG_CM = 1;
      let rem = deltaCm;

      const adjustSegments = (indices: number[]) => {
        for (let k = 0; k < indices.length && Math.abs(rem) > 1e-6; k++) {
          const i = indices[k];
          const cur = Number(segWidthsCm[i]) || 0;
          if (rem > 0) {
            segWidthsCm[i] = cur + rem;
            rem = 0;
          } else {
            const canReduce = Math.max(0, cur - MIN_SEG_CM);
            if (canReduce <= 0) continue;
            const take = Math.min(canReduce, -rem);
            segWidthsCm[i] = cur - take;
            rem += take;
          }
        }
      };

      const flexIdx: number[] = [];
      for (let i = mods.length - 1; i >= 0; i--) if (missing[i]) flexIdx.push(i);
      if (flexIdx.length > 0) adjustSegments(flexIdx);

      if (Math.abs(rem) > 1e-6) {
        const allIdx: number[] = [];
        for (let i = mods.length - 1; i >= 0; i--) allIdx.push(i);
        adjustSegments(allIdx);
      }
    }

    if (hasWidthOverride && segWidthsCm.length >= 2) {
      moduleWidthsCm = segWidthsCm;
    }

    const dimsRec = ctx && isRecord(ctx) && isRecord(ctx.dims) ? ctx.dims : null;
    const defaultH =
      dimsRec && typeof readKey(dimsRec, 'defaultH') === 'number'
        ? Number(readKey(dimsRec, 'defaultH'))
        : typeof H === 'number'
          ? H
          : 0;

    const defaultD =
      dimsRec && typeof readKey(dimsRec, 'defaultD') === 'number'
        ? Number(readKey(dimsRec, 'defaultD'))
        : typeof D === 'number'
          ? D
          : 0;

    const baseTopHcm = Number.isFinite(defaultH) ? defaultH * 100 : 0;
    const baseTopDcm = Number.isFinite(defaultD) ? defaultD * 100 : 0;

    const offsetHcm =
      stackSplitActive && Number.isFinite(splitBottomHeightCm) && splitBottomHeightCm > 0
        ? splitBottomHeightCm
        : 0;

    const maxTopHcm =
      stackSplitActive && Number.isFinite(overallHeightCm) && overallHeightCm > 0
        ? Math.max(0, overallHeightCm - offsetHcm)
        : baseTopHcm;

    const baseAbsHcm = offsetHcm + (stackSplitActive ? maxTopHcm : baseTopHcm);

    let hasHeightOverride = false;
    let hasDepthOverride = false;
    let allHeightManual = mods.length > 0;
    let allDepthManual = mods.length > 0;

    const heightsAbs: number[] = [];
    const depths: number[] = [];
    let maxAbsHcmSeen = 0;

    for (let i = 0; i < mods.length; i++) {
      const cfgMod = i < cfgList.length ? cfgList[i] : null;

      const hActiveRel = getActiveHeightCmFromConfig(cfgMod, offsetHcm);
      const activeH = typeof hActiveRel === 'number' && Number.isFinite(hActiveRel) && hActiveRel > 0;
      const topHcm = activeH ? hActiveRel : stackSplitActive ? maxTopHcm : baseTopHcm;
      const absHcm = offsetHcm + topHcm;
      heightsAbs.push(absHcm);

      if (Number.isFinite(absHcm) && absHcm > maxAbsHcmSeen) maxAbsHcmSeen = absHcm;

      if (activeH && Math.abs(absHcm - baseAbsHcm) > 0.5) hasHeightOverride = true;
      allHeightManual = allHeightManual && !!activeH;

      const dActive = getActiveDepthCmFromConfig(cfgMod);
      const activeD = typeof dActive === 'number' && Number.isFinite(dActive) && dActive > 0;
      const segD = activeD ? dActive : baseTopDcm;
      depths.push(segD);

      if (activeD && Math.abs(segD - baseTopDcm) > 0.5) hasDepthOverride = true;
      allDepthManual = allDepthManual && !!activeD;
    }

    if (hasHeightOverride && heightsAbs.length >= 1) {
      moduleHeightsCm = heightsAbs;
      moduleHeightsAllManual = !!allHeightManual;
    }

    if (stackSplitActive && Number.isFinite(maxAbsHcmSeen) && maxAbsHcmSeen > 0) {
      const maxAbsHm = maxAbsHcmSeen / 100;
      if (Number.isFinite(maxAbsHm) && maxAbsHm > 0) dimH = Math.max(dimH, maxAbsHm);
    }

    if (hasDepthOverride && depths.length >= 1) {
      moduleDepthsCm = depths;
      moduleDepthsAllManual = !!allDepthManual;
    }

    if (
      stackSplitActive &&
      Number.isFinite(splitBottomDepthCm) &&
      splitBottomDepthCm > 0 &&
      Number.isFinite(baseTopDcm) &&
      baseTopDcm > 0 &&
      Math.abs(splitBottomDepthCm - baseTopDcm) >= 1
    ) {
      const list = Array.isArray(moduleDepthsCm) && moduleDepthsCm.length ? moduleDepthsCm.slice() : [];
      list.push(baseTopDcm);
      list.push(splitBottomDepthCm);
      moduleDepthsCm = list;
      moduleDepthsAllManual = false;
    }
  } catch (__wpErr) {
    reportPostBuildSoft(App, 'esm/native/builder/post_build_extras_pipeline.ts:L805', __wpErr);
  }

  return {
    dimH,
    dimD,
    moduleWidthsCm,
    moduleHeightsCm,
    moduleDepthsCm,
    moduleHeightsAllManual,
    moduleDepthsAllManual,
  };
}
