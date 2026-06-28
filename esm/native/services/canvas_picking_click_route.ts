import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import { tryHandleCanvasPickingManualOrEmptyRoute } from './canvas_picking_click_route_manual.js';
import { tryHandleCanvasPickingLayoutRoute } from './canvas_picking_click_route_layout.js';
import { tryHandleCanvasPickingActionRoute } from './canvas_picking_click_route_actions.js';
import { tryHandleViewerMeasurementClick } from './viewer_measurement_tool.js';

export type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function routeCanvasPickingClick(args: CanvasPickingClickRouteArgs): void {
  if (args.modeState.__isMeasureMode) {
    tryHandleViewerMeasurementClick({
      App: args.App,
      hitState: args.hitState,
      ndcX: args.ndcX,
      ndcY: args.ndcY,
      raycaster: args.raycaster,
      mouse: args.mouse,
    });
    return;
  }
  if (tryHandleCanvasPickingManualOrEmptyRoute(args)) return;
  if (tryHandleCanvasPickingLayoutRoute(args)) return;
  tryHandleCanvasPickingActionRoute(args);
}
