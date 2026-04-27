import type { UnknownRecord } from '../../../types';

import { __asInt } from './canvas_picking_core_helpers.js';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import { asRecord, reportCornerDimsIssue } from './canvas_picking_cell_dims_corner_shared.js';

export type CornerCellConfigReader = (cellIdx: number) => UnknownRecord;

export function readCornerCellCount(ctx: CornerCellDimsContext): number {
  const doors = __asInt(ctx.ui.cornerDoors, __asInt(ctx.raw.cornerDoors, 3));
  const doorCount = Number.isFinite(doors) ? Math.max(1, doors) : 1;
  return Math.max(1, Math.ceil(doorCount / 2));
}

export function createCornerCellConfigReader(
  ctx: CornerCellDimsContext,
  modsPrev: UnknownRecord[],
  opPrefix: string,
  cellCount?: number
): CornerCellConfigReader {
  const cache = typeof cellCount === 'number' && cellCount > 0 ? new Array<UnknownRecord>(cellCount) : null;
  return (cellIdx: number): UnknownRecord => {
    const cached = cache ? cache[cellIdx] : null;
    if (cached) return cached;

    let out: UnknownRecord | null = null;
    try {
      const prevCfg = modsPrev[cellIdx];
      out = asRecord(prevCfg) || null;
    } catch (_e) {
      reportCornerDimsIssue(ctx.App, _e, `${opPrefix}.readPrevCfg`, 1000);
    }
    if (!out) {
      try {
        const ensuredCfg = ctx.ensureCornerCellConfigRef(cellIdx);
        out = asRecord(ensuredCfg) || null;
      } catch (_e) {
        reportCornerDimsIssue(ctx.App, _e, `${opPrefix}.ensureCfg`, 1000);
      }
    }

    const result = out || {};
    if (cache) cache[cellIdx] = result;
    return result;
  };
}
