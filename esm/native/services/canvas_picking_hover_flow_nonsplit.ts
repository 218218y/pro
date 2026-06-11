import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';
import { resolveNonSplitPreferredFacePreviewState } from './canvas_picking_hover_flow_nonsplit_face.js';
import { tryHandleCanvasNonSplitPreviewRoutes } from './canvas_picking_hover_flow_nonsplit_preview.js';
import { tryHandleCanvasNonSplitSketchHover } from './canvas_picking_hover_flow_nonsplit_sketch.js';

export type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export function tryHandleCanvasNonSplitHover(args: HandleCanvasNonSplitHoverArgs): boolean {
  if (args.cutMarker) args.cutMarker.visible = false;

  const facePreviewState = resolveNonSplitPreferredFacePreviewState(args);
  if (tryHandleCanvasNonSplitPreviewRoutes({ hoverArgs: args, facePreviewState })) {
    return true;
  }

  return tryHandleCanvasNonSplitSketchHover(args);
}
