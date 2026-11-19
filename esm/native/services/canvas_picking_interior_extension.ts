import type { AppContainer } from '../../../types';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import { createCanvasPickingClickModuleRefs } from './canvas_picking_click_module_refs.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { __wp_clearSketchHover, __wp_readSketchHover } from './canvas_picking_local_helpers.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import { readSketchHoverHostIdentity } from './canvas_picking_sketch_hover_identity.js';
import { resetCanvasPickingEmptyClick } from './canvas_picking_click_empty.js';
import { tryHandleCanvasPickingManualRoute } from './canvas_picking_click_route_manual.js';
import { tryHandleCanvasPickingLayoutRoute } from './canvas_picking_click_route_layout.js';
import { tryHandleCanvasNonSplitSketchHover } from './canvas_picking_hover_flow_nonsplit_sketch.js';
import { tryHandleCanvasNonSplitInteriorPreviewRoutes } from './canvas_picking_hover_flow_nonsplit_preview_interior.js';
import {
  registerCanvasPickingInteriorExtension,
  type CanvasPickingInteriorExtension,
} from './canvas_picking_interior_extension_registry.js';

function resolveSketchClickRoute(args: CanvasPickingClickRouteArgs): CanvasPickingClickRouteArgs | null {
  if (!args.modeState.__isManualLayoutMode) return args;
  const tool = readActiveManualTool(args.App);
  if (!tool?.startsWith('sketch_')) return args;

  // Resolve the command at the current pointer before either free-box or module routing.
  // A stationary visible preview can outlive its TTL; generic mesh hits can also belong
  // to a neighboring side. Both the operation and its host must come from this resolution.
  __wp_clearSketchHover(args.App);
  if (!args.raycaster || !args.mouse) return null;
  const handled = tryHandleCanvasNonSplitSketchHover({
    App: args.App,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    primaryMode: args.modeState.__pm ?? '',
    raycaster: args.raycaster,
    mouse: args.mouse,
    hideLayoutPreview: null,
  });
  const hover = __wp_readSketchHover(args.App);
  const host = readSketchHoverHostIdentity(hover, __wp_toModuleKey);
  // A failed resolution must never fall through to a different build operation.
  if (!handled || hover?.tool !== tool || !host) return null;

  const hitState = {
    ...args.hitState,
    foundModuleIndex: host.moduleKey,
    foundModuleStack: host.isBottom ? ('bottom' as const) : ('top' as const),
  };
  return {
    ...args,
    hitState,
    moduleRefs: createCanvasPickingClickModuleRefs({ App: args.App, ...hitState }),
  };
}

const INTERIOR_EXTENSION: CanvasPickingInteriorExtension = Object.freeze({
  tryHandleClickRoute(args) {
    const resolved = resolveSketchClickRoute(args);
    // Free placements can have a valid sketch command even when the ray misses the wardrobe.
    if (resolved && tryHandleCanvasPickingManualRoute(resolved)) return true;
    if (resetCanvasPickingEmptyClick(args)) return true;
    if (!resolved) return true;
    return tryHandleCanvasPickingLayoutRoute(resolved);
  },
  tryHandleInteriorPreview: tryHandleCanvasNonSplitInteriorPreviewRoutes,
  tryHandleSketchHover: tryHandleCanvasNonSplitSketchHover,
});

export function installCanvasPickingInteriorExtension(_App?: AppContainer): CanvasPickingInteriorExtension {
  // The extension owns no App state. Registration is process-wide so multiple App
  // instances share only immutable function references, never mutable project state.
  return registerCanvasPickingInteriorExtension(INTERIOR_EXTENSION);
}
