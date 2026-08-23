import type { AppContainer } from '../../../types';
import { tryHandleCanvasPickingManualOrEmptyRoute } from './canvas_picking_click_route_manual.js';
import { tryHandleCanvasPickingLayoutRoute } from './canvas_picking_click_route_layout.js';
import { tryHandleCanvasNonSplitSketchHover } from './canvas_picking_hover_flow_nonsplit_sketch.js';
import { tryHandleCanvasNonSplitInteriorPreviewRoutes } from './canvas_picking_hover_flow_nonsplit_preview_interior.js';
import {
  registerCanvasPickingInteriorExtension,
  type CanvasPickingInteriorExtension,
} from './canvas_picking_interior_extension_registry.js';

const INTERIOR_EXTENSION: CanvasPickingInteriorExtension = Object.freeze({
  tryHandleClickRoute(args) {
    if (tryHandleCanvasPickingManualOrEmptyRoute(args)) return true;
    return tryHandleCanvasPickingLayoutRoute(args);
  },
  tryHandleInteriorPreview: tryHandleCanvasNonSplitInteriorPreviewRoutes,
  tryHandleSketchHover: tryHandleCanvasNonSplitSketchHover,
});

export function installCanvasPickingInteriorExtension(_App?: AppContainer): CanvasPickingInteriorExtension {
  // The extension owns no App state. Registration is process-wide so multiple App
  // instances share only immutable function references, never mutable project state.
  return registerCanvasPickingInteriorExtension(INTERIOR_EXTENSION);
}
