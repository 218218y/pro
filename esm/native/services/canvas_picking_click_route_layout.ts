import { handleCanvasCellDimsClick } from './canvas_picking_cell_dims_flow.js';
import { tryHandleCanvasLayoutEditClick } from './canvas_picking_layout_edit_flow.js';
import { tryHandleCanvasDrawerModeClick } from './canvas_picking_drawer_mode_flow.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function tryHandleCanvasPickingLayoutRoute(args: CanvasPickingClickRouteArgs): boolean {
  const { App, hitState, modeState, moduleRefs } = args;
  const { intersects, foundPartId, foundModuleIndex, foundDrawerId, moduleHitY } = hitState;
  const {
    __isLayoutEditMode,
    __isManualLayoutMode,
    __isBraceShelvesMode,
    __isCellDimsMode,
    __isIntDrawerEditMode,
    __isExtDrawerEditMode,
    __isDividerEditMode,
  } = modeState;
  const {
    __activeModuleKey,
    __isBottomStack,
    __patchConfigForKey,
    __getActiveConfigRef,
    __ensureCornerCellConfigRef,
  } = moduleRefs;

  if (
    tryHandleCanvasLayoutEditClick({
      App,
      foundModuleIndex,
      __activeModuleKey,
      __isBottomStack,
      __isLayoutEditMode,
      __isManualLayoutMode,
      __isBraceShelvesMode,
      moduleHitY,
      intersects,
      __patchConfigForKey,
      __getActiveConfigRef,
    })
  ) {
    return true;
  }

  if (__isCellDimsMode && foundModuleIndex != null) {
    handleCanvasCellDimsClick({
      App,
      foundModuleIndex,
      foundPartId: typeof foundPartId === 'string' ? foundPartId : null,
      isBottomStack: __isBottomStack,
      ensureCornerCellConfigRef: __ensureCornerCellConfigRef,
    });
    return true;
  }

  return tryHandleCanvasDrawerModeClick({
    App,
    foundModuleIndex,
    __activeModuleKey,
    __isBottomStack,
    __isManualLayoutMode,
    __isIntDrawerEditMode,
    __isExtDrawerEditMode,
    __isDividerEditMode,
    foundDrawerId,
    foundPartId,
    moduleHitY,
    intersects,
    __patchConfigForKey,
  });
}
