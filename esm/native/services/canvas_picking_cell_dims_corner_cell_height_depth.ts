import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import { createCornerCellHeightDepthContext } from './canvas_picking_cell_dims_corner_cell_height_depth_context.js';
import { resolveCornerCellHeightDepthState } from './canvas_picking_cell_dims_corner_cell_height_depth_state.js';
import { applyCornerCellHeightDepthSelection } from './canvas_picking_cell_dims_corner_cell_height_depth_apply.js';

export function handleCornerCellHeightDepthOnly(ctx: CornerCellDimsContext): boolean {
  const { applyH, applyD } = ctx;
  if (applyH == null && applyD == null) return true;

  const flow = createCornerCellHeightDepthContext(ctx);
  if (!flow) return true;

  const state = resolveCornerCellHeightDepthState(flow);
  if (!state.hasAnyEffect) return true;

  return applyCornerCellHeightDepthSelection(flow, state);
}
