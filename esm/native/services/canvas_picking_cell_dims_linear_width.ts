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
import {
  readSpecialDimsRecord,
  readBool,
  readCanonicalNumber,
  readRequiredLinearDimension,
} from './canvas_picking_cell_dims_linear_shared.js';

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
    raw,
    idx,
    applyW,
    moduleCount,
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
    if (idx < 0 || idx >= widthsCurr.length) {
      throw new RangeError(`[WardrobePro][cellDims] Invalid width target module ${idx}`);
    }
    setManualWidth = true;

    const minSpecialCellW = 20;
    const newWidths = widthsCurr.slice();
    if (Number.isFinite(tgtW) && tgtW > 0) newWidths[idx] = tgtW;

    for (const [i, currentWidth] of newWidths.entries()) {
      const defaultWidth = defaultWidths[i] ?? minSpecialCellW;
      let nextWidth = Number.isFinite(currentWidth) && currentWidth > 0 ? currentWidth : defaultWidth;
      if (!Number.isFinite(nextWidth) || nextWidth <= 0) nextWidth = minSpecialCellW;
      newWidths[i] = Math.max(minSpecialCellW, nextWidth);
    }

    const minTotalW = 20;
    const maxTotalW = 560;
    const sumWidths = () => newWidths.reduce((a, b) => a + b, 0);

    let otherSum = 0;
    for (const [i, width] of newWidths.entries()) if (i !== idx) otherSum += width;

    const maxTargetAllowed = maxTotalW - otherSum;
    const minTargetAllowed = minTotalW - otherSum;
    let selectedWidth = readRequiredLinearDimension(newWidths, idx, 'selected width');
    if (Number.isFinite(maxTargetAllowed)) selectedWidth = Math.min(selectedWidth, maxTargetAllowed);
    if (Number.isFinite(minTargetAllowed)) selectedWidth = Math.max(selectedWidth, minTargetAllowed);
    newWidths[idx] = Math.max(minSpecialCellW, selectedWidth);

    let curTotal = sumWidths();
    if (curTotal > maxTotalW + 1e-6) {
      const needReduce = curTotal - maxTotalW;
      let slackSum = 0;
      for (const [i, width] of newWidths.entries()) {
        if (i === idx) continue;
        slackSum += Math.max(0, width - minSpecialCellW);
      }
      if (slackSum > 1e-9) {
        for (const [i, width] of newWidths.entries()) {
          if (i === idx) continue;
          const slack = Math.max(0, width - minSpecialCellW);
          if (slack <= 0) continue;
          const take = Math.min(slack, needReduce * (slack / slackSum));
          newWidths[i] = width - take;
        }
      }
      curTotal = sumWidths();
      if (curTotal > maxTotalW + 1e-6) {
        const over = curTotal - maxTotalW;
        selectedWidth = readRequiredLinearDimension(newWidths, idx, 'selected width');
        newWidths[idx] = Math.max(minSpecialCellW, selectedWidth - over);
      }
    }

    curTotal = sumWidths();
    if (curTotal < minTotalW - 1e-6) {
      selectedWidth = readRequiredLinearDimension(newWidths, idx, 'selected width');
      newWidths[idx] = selectedWidth + (minTotalW - curTotal);
    }

    for (const [i, width] of newWidths.entries()) newWidths[i] = Math.round(width * 100) / 100;
    nextTotalW = Math.round(sumWidths() * 100) / 100;
    nextWidthForIdx = readRequiredLinearDimension(newWidths, idx, 'selected width');
  } else if (
    ctx.isBottomStack ? readBool(raw, 'stackSplitLowerWidthManual') : readBool(cfg, 'isManualWidth')
  ) {
    let looksAuto = true;
    for (let i = 0; i < moduleCount; i++) {
      const prevSD = readSpecialDimsRecord(prevModsCfg[i]);
      if (!prevSD) {
        looksAuto = false;
        break;
      }
      const wcm = readCanonicalNumber(prevSD.widthCm);
      const bwcm = readCanonicalNumber(prevSD.baseWidthCm);
      if (wcm == null || bwcm == null) {
        looksAuto = false;
        break;
      }
      const defaultWidth = defaultWidths[i];
      if (
        defaultWidth == null ||
        Math.abs(wcm - defaultWidth) > ctx.autoWidthMatchToleranceCm ||
        Math.abs(bwcm - defaultWidth) > ctx.autoWidthMatchToleranceCm
      ) {
        looksAuto = false;
        break;
      }
    }

    if (looksAuto) {
      unsetManualWidth = true;
      for (const [i, moduleCfg] of nextModsCfg.entries())
        nextModsCfg[i] = stripWidthOverridesFromConfig(moduleCfg);
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
      baseValueCm: readRequiredLinearDimension(baseW, idx, 'base width'),
      targetValueCm: wSet,
      toggledBack: toggledBackW,
    });
    assignSpecialDimsToConfig(next, sd);
  }

  return { setManualWidth, unsetManualWidth, nextTotalW };
}
