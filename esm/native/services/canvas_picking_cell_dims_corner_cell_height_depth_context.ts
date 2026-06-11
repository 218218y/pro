import { cloneSpecialDims } from '../features/special_dims/index.js';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import {
  cloneRecord,
  readCornerModules,
  readCornerSpecialDims,
} from './canvas_picking_cell_dims_corner_shared.js';
import {
  createCornerCellConfigReader,
  readCornerCellCount,
} from './canvas_picking_cell_dims_corner_cell_shared.js';
import type { CornerCellHeightDepthContext } from './canvas_picking_cell_dims_corner_cell_height_depth_contracts.js';

export function createCornerCellHeightDepthContext(
  ctx: CornerCellDimsContext
): CornerCellHeightDepthContext | null {
  const { nextCornerCfg, cellIdx } = ctx;
  const cellCount = readCornerCellCount(ctx);
  if (!(cellIdx >= 0 && cellIdx < cellCount)) return null;

  const modsPrev = readCornerModules(nextCornerCfg);
  const modsNext = modsPrev.slice();
  const getCellCfg = createCornerCellConfigReader(ctx, modsPrev, 'cellDims.corner.cell', cellCount);

  const prevCellCfg = getCellCfg(cellIdx);
  const nextCellCfg = cloneRecord(prevCellCfg);
  const sdCell = cloneSpecialDims(readCornerSpecialDims(nextCellCfg));

  return {
    App: ctx.App,
    nextCornerCfg,
    cellIdx,
    curH: ctx.curH,
    curD: ctx.curD,
    applyH: ctx.applyH,
    applyD: ctx.applyD,
    modsPrev,
    modsNext,
    nextCellCfg,
    sdCell,
  };
}
