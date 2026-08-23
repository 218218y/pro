import { handleCanvasCellDimsClick } from './canvas_picking_cell_dims_flow.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function tryHandleCanvasPickingCellDimsRoute(args: CanvasPickingClickRouteArgs): boolean {
  if (!args.modeState.__isCellDimsMode || args.hitState.foundModuleIndex == null) return false;

  handleCanvasCellDimsClick({
    App: args.App,
    foundModuleIndex: args.hitState.foundModuleIndex,
    foundPartId: typeof args.hitState.foundPartId === 'string' ? args.hitState.foundPartId : null,
    hitUserData: args.hitState.hitUserData || args.hitState.primaryHitObject?.userData || null,
    isBottomStack: args.moduleRefs.__isBottomStack,
    ensureCornerCellConfigRef: args.moduleRefs.__ensureCornerCellConfigRef,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
  });
  return true;
}
