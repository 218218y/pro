import type { UnknownRecord } from '../../../types';
import type {
  EnsureOwnLinearModule,
  LinearCellDimsContext,
} from './canvas_picking_cell_dims_linear_shared.js';

import {
  applyOverrideToSpecialDims,
  assignSpecialDimsToConfig,
  cloneSpecialDims,
  stripWidthOverridesFromConfig,
} from '../features/special_dims/index.js';
import { readSpecialDimsRecord, readBool } from './canvas_picking_cell_dims_linear_shared.js';

export interface LinearCellDimsWidthResult {
  setManualWidth: boolean;
  unsetManualWidth: boolean;
  nextTotalW: number;
}

export function applyLinearCellDimsWidthPolicy(
  ctx: LinearCellDimsContext,
  nextModsCfg: UnknownRecord[],
  ensureOwnModule: EnsureOwnLinearModule
): LinearCellDimsWidthResult {
  const {
    cfg,
    ui,
    idx,
    applyW,
    moduleCount,
    wardrobeType,
    doorsPerModule,
    defaultWidths,
    prevModsCfg,
    widthsCurr,
    baseW,
    tgtW,
    toggledBackW,
    totalW,
  } = ctx;

  let setManualWidth = false;
  let unsetManualWidth = false;
  let nextTotalW = totalW;
  let nextWidthForIdx: number | null = null;

  if (applyW != null) {
    setManualWidth = true;

    const minDoorW = wardrobeType === 'sliding' ? 60 : 20;
    const minW = doorsPerModule.map(d => Math.max(minDoorW * d, 1));
    const newWidths = widthsCurr.slice();
    if (Number.isFinite(tgtW) && tgtW > 0) newWidths[idx] = tgtW;

    for (let i = 0; i < newWidths.length; i++) {
      if (!Number.isFinite(newWidths[i]) || newWidths[i] <= 0) newWidths[i] = defaultWidths[i];
      if (!Number.isFinite(newWidths[i]) || newWidths[i] <= 0) newWidths[i] = minW[i];
      if (newWidths[i] < minW[i]) newWidths[i] = minW[i];
    }

    const isChestMode = readBool(ui, 'isChestMode');
    const minTotalW = isChestMode ? 20 : 40;
    const maxTotalW = 560;
    const sumWidths = () => newWidths.reduce((a, b) => a + b, 0);

    let otherSum = 0;
    for (let i = 0; i < newWidths.length; i++) if (i !== idx) otherSum += newWidths[i];

    const maxTargetAllowed = maxTotalW - otherSum;
    const minTargetAllowed = minTotalW - otherSum;
    if (Number.isFinite(maxTargetAllowed)) newWidths[idx] = Math.min(newWidths[idx], maxTargetAllowed);
    if (Number.isFinite(minTargetAllowed)) newWidths[idx] = Math.max(newWidths[idx], minTargetAllowed);
    if (newWidths[idx] < minW[idx]) newWidths[idx] = minW[idx];

    let curTotal = sumWidths();
    if (curTotal > maxTotalW + 1e-6) {
      let needReduce = curTotal - maxTotalW;
      let slackSum = 0;
      for (let i = 0; i < newWidths.length; i++) {
        if (i === idx) continue;
        slackSum += Math.max(0, newWidths[i] - minW[i]);
      }
      if (slackSum > 1e-9) {
        for (let i = 0; i < newWidths.length; i++) {
          if (i === idx) continue;
          const slack = Math.max(0, newWidths[i] - minW[i]);
          if (slack <= 0) continue;
          const take = Math.min(slack, needReduce * (slack / slackSum));
          newWidths[i] -= take;
        }
      }
      curTotal = sumWidths();
      if (curTotal > maxTotalW + 1e-6) {
        const over = curTotal - maxTotalW;
        newWidths[idx] = Math.max(minW[idx], newWidths[idx] - over);
      }
    }

    curTotal = sumWidths();
    if (curTotal < minTotalW - 1e-6) newWidths[idx] = newWidths[idx] + (minTotalW - curTotal);

    for (let i = 0; i < newWidths.length; i++) newWidths[i] = Math.round(newWidths[i] * 100) / 100;
    nextTotalW = Math.round(sumWidths() * 100) / 100;
    nextWidthForIdx = newWidths[idx];
  } else if (readBool(cfg, 'isManualWidth')) {
    let looksAuto = true;
    for (let i = 0; i < moduleCount; i++) {
      const prevSD = readSpecialDimsRecord(prevModsCfg[i]);
      if (!prevSD) {
        looksAuto = false;
        break;
      }
      const wcm = Number(prevSD.widthCm);
      const bwcm = Number(prevSD.baseWidthCm);
      if (!Number.isFinite(wcm) || !Number.isFinite(bwcm)) {
        looksAuto = false;
        break;
      }
      if (Math.abs(wcm - defaultWidths[i]) > 0.51 || Math.abs(bwcm - defaultWidths[i]) > 0.51) {
        looksAuto = false;
        break;
      }
    }

    if (looksAuto) {
      unsetManualWidth = true;
      for (let i = 0; i < nextModsCfg.length; i++)
        nextModsCfg[i] = stripWidthOverridesFromConfig(nextModsCfg[i]);
    }
  }

  if (applyW != null && idx >= 0 && idx < nextModsCfg.length) {
    const next = ensureOwnModule(idx);
    const sd = cloneSpecialDims(readSpecialDimsRecord(next));
    const wSet = nextWidthForIdx != null ? nextWidthForIdx : tgtW;
    applyOverrideToSpecialDims({
      sd,
      key: 'widthCm',
      baseKey: 'baseWidthCm',
      baseValueCm: baseW[idx],
      targetValueCm: wSet,
      toggledBack: toggledBackW,
    });
    assignSpecialDimsToConfig(next, sd);
  }

  return { setManualWidth, unsetManualWidth, nextTotalW };
}
