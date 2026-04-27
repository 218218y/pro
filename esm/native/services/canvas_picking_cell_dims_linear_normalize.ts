import type { UnknownRecord } from '../../../types';
import type {
  EnsureOwnLinearModule,
  LinearCellDimsContext,
} from './canvas_picking_cell_dims_linear_shared.js';

import {
  clearOverrideKeys,
  cloneSpecialDims,
  isOverrideActive,
  assignSpecialDimsToConfig,
} from '../features/special_dims/index.js';
import { __asNum, __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import { asModuleShape, readSpecialDimsRecord } from './canvas_picking_cell_dims_linear_shared.js';

export type LinearCellDimsUniformAxis = 'height' | 'depth';

export interface LinearCellDimsUniformPromotion {
  nextTotal: number;
  promoted: boolean;
}

export function promoteUniformLinearCellDim(
  ctx: LinearCellDimsContext,
  nextModsCfg: UnknownRecord[],
  ensureOwnModule: EnsureOwnLinearModule,
  axis: LinearCellDimsUniformAxis
): LinearCellDimsUniformPromotion {
  const applyValue = axis === 'height' ? ctx.applyH : ctx.applyD;
  const totalValue = axis === 'height' ? ctx.totalH : ctx.totalD;
  if (applyValue == null || ctx.moduleCount <= 0) return { nextTotal: totalValue, promoted: false };

  const key = axis === 'height' ? 'heightCm' : 'depthCm';
  const baseKey = axis === 'height' ? 'baseHeightCm' : 'baseDepthCm';
  const op = axis === 'height' ? 'cellDims.promoteUniformHeight' : 'cellDims.promoteUniformDepth';

  try {
    const eff: number[] = [];
    for (let i = 0; i < ctx.moduleCount; i++) {
      const m = asModuleShape(nextModsCfg[i]);
      const sd = readSpecialDimsRecord(m);
      const cm = sd ? __asNum(sd[key], NaN) : NaN;
      const active = isOverrideActive(sd, key, baseKey);
      eff.push(active ? cm : totalValue);
    }

    let min = eff.length ? eff[0] : NaN;
    let max = eff.length ? eff[0] : NaN;
    let ok = eff.length > 0;
    for (let i = 0; i < eff.length; i++) {
      const value = eff[i];
      if (!Number.isFinite(value) || value <= 0) {
        ok = false;
        break;
      }
      if (value < min) min = value;
      if (value > max) max = value;
    }

    if (ok && Number.isFinite(min) && Number.isFinite(max) && Math.abs(max - min) < 0.01) {
      const target = Math.round(eff[0] * 100) / 100;
      if (Number.isFinite(target) && target > 0) {
        for (let i = 0; i < nextModsCfg.length; i++) {
          const prevSD = readSpecialDimsRecord(nextModsCfg[i]);
          if (!prevSD) continue;
          const sd2 = cloneSpecialDims(prevSD);
          clearOverrideKeys(sd2, [key, baseKey]);
          assignSpecialDimsToConfig(ensureOwnModule(i), sd2);
        }
        return { nextTotal: target, promoted: Math.abs(target - totalValue) > 1e-6 };
      }
    }
  } catch (err) {
    __wp_reportPickingIssue(ctx.App, err, { where: 'canvasPicking', op });
  }

  return { nextTotal: totalValue, promoted: false };
}
