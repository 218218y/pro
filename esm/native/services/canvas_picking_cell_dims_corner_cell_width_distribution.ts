import type { UnknownRecord } from '../../../types';

import { __asInt } from './canvas_picking_core_helpers.js';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import {
  readCornerModules,
  readStoredWidthCm,
  reportCornerDimsIssue,
} from './canvas_picking_cell_dims_corner_shared.js';
import { createCornerCellConfigReader } from './canvas_picking_cell_dims_corner_cell_shared.js';
import type { CornerCellWidthDistribution } from './canvas_picking_cell_dims_corner_cell_width_contracts.js';

export function createCornerCellWidthDistribution(ctx: CornerCellDimsContext): CornerCellWidthDistribution {
  const { App, nextCornerCfg, curWingW } = ctx;
  const doors = __asInt(ctx.ui.cornerDoors, __asInt(ctx.raw.cornerDoors, 3));
  const doorCount = Number.isFinite(doors) ? Math.max(1, doors) : 1;
  const cellCount = Math.max(1, Math.ceil(doorCount / 2));

  const activeWingWcm = Math.max(0, curWingW);
  const defaultDoorWcm = doorCount > 0 ? activeWingWcm / doorCount : activeWingWcm;

  const modsPrev = readCornerModules(nextCornerCfg);
  const modsNext: UnknownRecord[] = modsPrev.slice();
  const getCellCfg = createCornerCellConfigReader(ctx, modsPrev, 'cellDims.corner.width', cellCount);
  const getStoredWidth = (cfgCell: UnknownRecord): number | null =>
    readStoredWidthCm(cfgCell, App, 'cellDims.corner.width.getStoredWidth');

  const doorsInCell = new Array<number>(cellCount).fill(1);
  const fixedWidths = new Array<number | null>(cellCount).fill(null);
  let fixedSum = 0;
  let missingUnits = 0;

  for (let ci = 0; ci < cellCount; ci++) {
    const doorsForCell = Math.min(2, Math.max(0, doorCount - ci * 2));
    const doorsUnits = Math.max(1, doorsForCell);
    doorsInCell[ci] = doorsUnits;

    const storedWidth = getStoredWidth(getCellCfg(ci));
    if (storedWidth != null) {
      fixedWidths[ci] = storedWidth;
      fixedSum += storedWidth;
    } else {
      missingUnits += doorsUnits;
    }
  }

  let remainingW = activeWingWcm - fixedSum;
  if (!Number.isFinite(remainingW) || remainingW < 0) remainingW = 0;
  const denom = missingUnits > 0 ? missingUnits : 1;

  const minDoorWcm = 20;
  const widthsCurr: number[] = [];
  const minW: number[] = [];

  for (let ci = 0; ci < cellCount; ci++) {
    const doorsUnits = Math.max(1, doorsInCell[ci]);
    const minWidth = Math.max(5, doorsUnits * minDoorWcm);
    minW[ci] = minWidth;

    const fixedWidth = fixedWidths[ci];
    let width = fixedWidth != null ? fixedWidth : (remainingW * doorsUnits) / denom;
    if (!Number.isFinite(width) || width <= 0) width = doorsUnits * defaultDoorWcm;
    if (!Number.isFinite(width) || width <= 0) width = minWidth;
    if (width < minWidth) width = minWidth;
    widthsCurr.push(width);
  }

  try {
    const sumW = widthsCurr.reduce((a, b) => a + b, 0);
    const delta = activeWingWcm - sumW;
    if (Number.isFinite(delta) && Math.abs(delta) > 1e-6 && widthsCurr.length > 0) {
      let adjIdx = widthsCurr.length - 1;
      for (let i = widthsCurr.length - 1; i >= 0; i--) {
        if (fixedWidths[i] == null) {
          adjIdx = i;
          break;
        }
      }
      const nextV = widthsCurr[adjIdx] + delta;
      widthsCurr[adjIdx] = Math.max(minW[adjIdx] || 5, nextV);
    }
  } catch (_e) {
    reportCornerDimsIssue(App, _e, 'cellDims.corner.width.redistribute');
  }

  return {
    cellCount,
    modsPrev,
    modsNext,
    getCellCfg,
    widthsCurr,
    minW,
  };
}
