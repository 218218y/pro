import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import { tryHandleCanvasPickingManualOrEmptyRoute } from './canvas_picking_click_route_manual.js';
import { tryHandleCanvasPickingLayoutRoute } from './canvas_picking_click_route_layout.js';
import { tryHandleCanvasPickingActionRoute } from './canvas_picking_click_route_actions.js';

export type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function routeCanvasPickingClick(args: CanvasPickingClickRouteArgs): void {
  if (tryHandleCanvasPickingManualOrEmptyRoute(args)) return;
  if (tryHandleCanvasPickingLayoutRoute(args)) return;
  tryHandleCanvasPickingActionRoute(args);
}
