import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';

import { createCornerCellWidthDistribution } from './canvas_picking_cell_dims_corner_cell_width_distribution.js';
import { resolveCornerCellWidthSelectionState } from './canvas_picking_cell_dims_corner_cell_width_selection.js';
import { applyCornerCellWidthSelection } from './canvas_picking_cell_dims_corner_cell_width_apply.js';

export function handleCornerCellWidthAndDims(ctx: CornerCellDimsContext): boolean {
  const distribution = createCornerCellWidthDistribution(ctx);
  if (!(ctx.cellIdx >= 0 && ctx.cellIdx < distribution.widthsCurr.length)) return true;

  const selection = resolveCornerCellWidthSelectionState(ctx, distribution);
  if (!selection || !selection.hasAnyEffect) return true;

  return applyCornerCellWidthSelection(ctx, distribution, selection);
}
