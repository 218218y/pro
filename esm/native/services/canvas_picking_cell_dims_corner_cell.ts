import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';

import { handleCornerCellHeightDepthOnly } from './canvas_picking_cell_dims_corner_cell_height_depth.js';
import { handleCornerCellWidthAndDims } from './canvas_picking_cell_dims_corner_cell_width.js';

export function handleCornerPerCellDimsClick(ctx: CornerCellDimsContext): boolean {
  const { applyW, applyH, applyD } = ctx;
  if (applyW == null && applyH == null && applyD == null) return true;
  if (applyW == null) return handleCornerCellHeightDepthOnly(ctx);
  return handleCornerCellWidthAndDims(ctx);
}
