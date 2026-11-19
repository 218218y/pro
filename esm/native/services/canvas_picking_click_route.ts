import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import { tryHandleCanvasPickingActionRoute } from './canvas_picking_click_route_actions.js';
import { tryHandleCanvasPickingCellDimsRoute } from './canvas_picking_click_route_cell_dims.js';
import { resetCanvasPickingEmptyClick } from './canvas_picking_click_empty.js';
import {
  isCanvasPickingInteriorClickMode,
  requireCanvasPickingInteriorExtension,
} from './canvas_picking_interior_extension_registry.js';

export type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function routeCanvasPickingClick(args: CanvasPickingClickRouteArgs): void {
  if (tryHandleCanvasPickingCellDimsRoute(args)) return;
  if (isCanvasPickingInteriorClickMode(args.modeState)) {
    if (requireCanvasPickingInteriorExtension().tryHandleClickRoute(args)) return;
  } else if (resetCanvasPickingEmptyClick(args)) {
    return;
  }
  tryHandleCanvasPickingActionRoute(args);
}
