import type { NonSplitPreviewRouteArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';
import { tryHandleCanvasNonSplitCellDimsPreview } from './canvas_picking_hover_flow_nonsplit_preview_cell_dims.js';
import { tryHandleCanvasNonSplitDoorPreviewRoute } from './canvas_picking_hover_flow_nonsplit_preview_door.js';
import { tryHandleCanvasRemovablePartHover } from './canvas_picking_removable_part_hover.js';
import { tryHandleCanvasNonSplitPaintPreviewRoute } from './canvas_picking_hover_flow_nonsplit_preview_paint.js';
import {
  isCanvasPickingInteriorHoverMode,
  requireCanvasPickingInteriorExtension,
} from './canvas_picking_interior_extension_registry.js';

export function tryHandleCanvasNonSplitPreviewRoutes(args: NonSplitPreviewRouteArgs): boolean {
  if (tryHandleCanvasNonSplitPaintPreviewRoute(args.hoverArgs)) {
    if (args.hoverArgs.doorMarker) args.hoverArgs.doorMarker.visible = false;
    return true;
  }

  if (tryHandleCanvasNonSplitDoorPreviewRoute(args)) {
    return true;
  }

  if (
    tryHandleCanvasRemovablePartHover({
      App: args.hoverArgs.App,
      ndcX: args.hoverArgs.ndcX,
      ndcY: args.hoverArgs.ndcY,
      isRemoveDoorMode: args.hoverArgs.isRemoveDoorMode,
      raycaster: args.hoverArgs.raycaster,
      mouse: args.hoverArgs.mouse,
      hideLayoutPreview: args.hoverArgs.hideLayoutPreview,
      hideSketchPreview: args.hoverArgs.hideSketchPreview,
      previewRo: args.hoverArgs.previewRo,
    })
  ) {
    if (args.hoverArgs.doorMarker) args.hoverArgs.doorMarker.visible = false;
    return true;
  }

  if (tryHandleCanvasNonSplitCellDimsPreview(args.hoverArgs)) {
    return true;
  }

  if (!isCanvasPickingInteriorHoverMode(args.hoverArgs)) return false;
  return requireCanvasPickingInteriorExtension().tryHandleInteriorPreview(args.hoverArgs);
}
