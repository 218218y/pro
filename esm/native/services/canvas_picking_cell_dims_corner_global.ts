import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import { resolveCornerGlobalDimsTargetState } from './canvas_picking_cell_dims_corner_global_state.js';
import { applyCornerGlobalDimsTargetState } from './canvas_picking_cell_dims_corner_global_apply.js';

export function handleCornerGlobalDimsClick(ctx: CornerCellDimsContext): void {
  const state = resolveCornerGlobalDimsTargetState(ctx);
  applyCornerGlobalDimsTargetState(ctx, state);
}
