import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';
import { resolveNonSplitPreferredFacePreviewState } from './canvas_picking_hover_flow_nonsplit_face.js';
import { tryHandleCanvasNonSplitPreviewRoutes } from './canvas_picking_hover_flow_nonsplit_preview.js';
import {
  isCanvasPickingInteriorHoverMode,
  requireCanvasPickingInteriorExtension,
} from './canvas_picking_interior_extension_registry.js';

export type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export function tryHandleCanvasNonSplitHover(args: HandleCanvasNonSplitHoverArgs): boolean {
  if (args.cutMarker) args.cutMarker.visible = false;

  const facePreviewState = resolveNonSplitPreferredFacePreviewState(args);
  if (tryHandleCanvasNonSplitPreviewRoutes({ hoverArgs: args, facePreviewState })) {
    return true;
  }

  if (!isCanvasPickingInteriorHoverMode(args)) return false;
  return requireCanvasPickingInteriorExtension().tryHandleSketchHover(args);
}
