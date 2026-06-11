import { tryHandleCanvasDoorEditClick } from './canvas_picking_door_edit_flow.js';
import { tryHandleCanvasPaintClick } from './canvas_picking_paint_flow.js';
import { tryHandleCanvasHandleAssignClick } from './canvas_picking_handle_assign_flow.js';
import { handleCanvasDoorToggleClick } from './canvas_picking_toggle_flow.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function tryHandleCanvasPickingActionRoute(args: CanvasPickingClickRouteArgs): boolean {
  const { App, hitState, modeState, moduleRefs } = args;
  const {
    foundPartId,
    effectiveDoorId,
    foundModuleIndex,
    foundModuleStack,
    primaryHitObject,
    doorHitObject,
    primaryHitPoint,
    doorHitPoint,
    doorHitY,
    hitIdentity,
    primaryHitY: _primaryHitY,
  } = hitState;
  const {
    __pm,
    __isPaintMode,
    __isSplitEditMode,
    __isHandleEditMode,
    __isHingeEditMode,
    __isRemoveDoorMode,
    __isGrooveEditMode,
    __isDoorTrimMode,
  } = modeState;
  const { __activeStack } = moduleRefs;

  if (
    tryHandleCanvasDoorEditClick({
      App,
      foundPartId,
      effectiveDoorId,
      activeStack: __activeStack,
      foundModuleStack,
      doorHitY,
      isSplitEditMode: __isSplitEditMode,
      isRemoveDoorMode: __isRemoveDoorMode,
      isHingeEditMode: __isHingeEditMode,
      isGrooveEditMode: __isGrooveEditMode,
      isDoorTrimMode: __isDoorTrimMode,
      doorHitPoint: doorHitPoint && typeof doorHitPoint === 'object' ? doorHitPoint : null,
      doorHitObject,
    })
  ) {
    return true;
  }

  if (
    tryHandleCanvasPaintClick({
      App,
      foundPartId,
      effectiveDoorId,
      activeStack: __activeStack,
      isPaintMode: __isPaintMode,
      primaryHitObject,
      doorHitObject,
      primaryHitPoint,
      doorHitPoint,
      hitIdentity,
    })
  ) {
    return true;
  }

  if (
    tryHandleCanvasHandleAssignClick({
      App,
      primaryHitObject,
      foundDrawerId: hitState.foundDrawerId,
      effectiveDoorId,
      foundPartId,
      isHandleEditMode: __isHandleEditMode,
    })
  ) {
    return true;
  }

  handleCanvasDoorToggleClick({
    App,
    primaryMode: __pm,
    primaryHitObject,
    effectiveDoorId,
    foundPartId,
    foundModuleIndex,
    foundModuleStack,
  });
  return true;
}
