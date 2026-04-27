import type { CanvasCornerCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';

import { handleCornerPerCellDimsClick } from './canvas_picking_cell_dims_corner_cell.js';
import { handleCornerGlobalDimsClick } from './canvas_picking_cell_dims_corner_global.js';
import {
  buildCornerCellDimsContext,
  reportCornerDimsIssue,
} from './canvas_picking_cell_dims_corner_shared.js';

export function handleCanvasCornerCellDimsClick(args: CanvasCornerCellDimsArgs): void {
  const { App } = args;
  try {
    const ctx = buildCornerCellDimsContext(args);
    if (ctx.isPerCellWing) {
      if (handleCornerPerCellDimsClick(ctx)) return;
    }
    handleCornerGlobalDimsClick(ctx);
  } catch (err) {
    reportCornerDimsIssue(App, err, 'cellDims.applyCorner', 500, { failFast: true });
  }
}
