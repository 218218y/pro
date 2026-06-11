// Canvas picking linear cell-dims click flow.
//
// Keep the public cell-dims click contract stable while module-structure
// resolution, width/manual-width policy, and uniform height/depth promotion
// live in focused linear cell-dims owners.
import type { CanvasLinearCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';

import { applyCanvasLinearCellDimsContext } from './canvas_picking_cell_dims_linear_apply.js';
import { buildCanvasLinearCellDimsContext } from './canvas_picking_cell_dims_linear_context.js';

export function handleCanvasLinearCellDimsClick(args: CanvasLinearCellDimsArgs): void {
  const ctx = buildCanvasLinearCellDimsContext(args);
  if (!ctx) return;
  applyCanvasLinearCellDimsContext(ctx);
}
