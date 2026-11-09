import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import { tryHandleCanvasPickingActionRoute } from './canvas_picking_click_route_actions.js';
import { tryHandleCanvasPickingCellDimsRoute } from './canvas_picking_click_route_cell_dims.js';
import { resetCanvasPickingEmptyClick } from './canvas_picking_click_manual_sketch_free_reset.js';
import {
  isCanvasPickingInteriorClickMode,
  requireCanvasPickingInteriorExtension,
} from './canvas_picking_interior_extension_registry.js';

export type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function routeCanvasPickingClick(args: CanvasPickingClickRouteArgs): void {
  if (tryHandleCanvasPickingCellDimsRoute(args)) return;
  if (isCanvasPickingInteriorClickMode(args.modeState)) {
    if (requireCanvasPickingInteriorExtension().tryHandleClickRoute(args)) return;
  } else if (
    resetCanvasPickingEmptyClick({
      App: args.App,
      primaryHitObject: args.hitState.primaryHitObject,
      isPaintMode: args.modeState.__isPaintMode,
      isGrooveEditMode: args.modeState.__isGrooveEditMode,
      isSplitEditMode: args.modeState.__isSplitEditMode,
      isLayoutEditMode: args.modeState.__isLayoutEditMode,
      isManualLayoutMode: args.modeState.__isManualLayoutMode,
      isBraceShelvesMode: args.modeState.__isBraceShelvesMode,
      isExtDrawerEditMode: args.modeState.__isExtDrawerEditMode,
      isIntDrawerEditMode: args.modeState.__isIntDrawerEditMode,
      isDividerEditMode: args.modeState.__isDividerEditMode,
      isHandleEditMode: args.modeState.__isHandleEditMode,
      isHingeEditMode: args.modeState.__isHingeEditMode,
      isRemoveDoorMode: args.modeState.__isRemoveDoorMode,
    })
  ) {
    return;
  }
  tryHandleCanvasPickingActionRoute(args);
}
