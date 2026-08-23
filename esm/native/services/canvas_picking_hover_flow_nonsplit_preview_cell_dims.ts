import { tryHandleCellDimsHoverPreview } from './canvas_picking_hover_preview_modes_cell_dims.js';
import {
  __wp_estimateVisibleModuleFrontZ,
  __wp_measureObjectLocalBox,
  __wp_resolveInteriorHoverTarget,
} from './canvas_picking_local_helpers.js';
import { __wp_getCellDimsHoverOp, __wp_readCellDimsDraft } from './canvas_picking_local_helpers_cell_dims.js';
import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export function tryHandleCanvasNonSplitCellDimsPreview(
  args: HandleCanvasNonSplitHoverArgs,
  handleCellDimsPreview: typeof tryHandleCellDimsHoverPreview = tryHandleCellDimsHoverPreview
): boolean {
  return handleCellDimsPreview({
    App: args.App,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
    hideLayoutPreview: args.hideLayoutPreview,
    hideSketchPreview: args.hideSketchPreview,
    isCellDimsMode: args.isCellDimsMode,
    previewRo: args.previewRo,
    resolveInteriorHoverTarget: __wp_resolveInteriorHoverTarget,
    measureObjectLocalBox: __wp_measureObjectLocalBox,
    readCellDimsDraft: __wp_readCellDimsDraft,
    estimateVisibleModuleFrontZ: __wp_estimateVisibleModuleFrontZ,
    getCellDimsHoverOp: __wp_getCellDimsHoverOp,
  });
}
