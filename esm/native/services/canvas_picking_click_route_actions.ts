import { tryHandleCanvasDoorEditClick } from './canvas_picking_door_edit_flow.js';
import { readSplitVariant } from './canvas_picking_door_edit_shared.js';
import { tryHandleCanvasDoorCustomSplitScreenRemoveClick } from './canvas_picking_door_split_click_custom.js';
import { tryHandleCanvasPaintClick } from './canvas_picking_paint_flow.js';
import { tryHandleCanvasHandleAssignClick } from './canvas_picking_handle_assign_flow.js';
import { resolveNearbyShelfPaintTarget } from './canvas_picking_shelf_paint_proximity.js';
import { resolveNonDoorHoverTargetFromObject } from './canvas_picking_generic_paint_hover_target.js';
import { handleCanvasDoorToggleClick } from './canvas_picking_toggle_flow.js';
import { getCamera, getWardrobeGroup } from '../runtime/render_access.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

export function tryHandleCanvasPickingActionRoute(args: CanvasPickingClickRouteArgs): boolean {
  const { App, hitState, modeState, moduleRefs, ndcX, ndcY, raycaster, mouse } = args;
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
    doorHitGroup,
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
  const routedDoorHitPoint = __isDoorTrimMode ? doorHitPoint || primaryHitPoint : doorHitPoint;
  const routedDoorHitObject = __isDoorTrimMode ? doorHitObject || primaryHitObject : doorHitObject;

  if (
    __isSplitEditMode &&
    readSplitVariant(App) === 'custom' &&
    tryHandleCanvasDoorCustomSplitScreenRemoveClick({ App, ndcX, ndcY, camera: getCamera(App) })
  ) {
    return true;
  }

  if (
    tryHandleCanvasDoorEditClick({
      App,
      foundPartId,
      effectiveDoorId,
      activeStack: __activeStack,
      foundModuleStack,
      doorHitY,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      camera: getCamera(App),
      isSplitEditMode: __isSplitEditMode,
      isRemoveDoorMode: __isRemoveDoorMode,
      isHingeEditMode: __isHingeEditMode,
      isGrooveEditMode: __isGrooveEditMode,
      isDoorTrimMode: __isDoorTrimMode,
      doorHitPoint: routedDoorHitPoint && typeof routedDoorHitPoint === 'object' ? routedDoorHitPoint : null,
      doorHitObject: routedDoorHitObject,
      doorHitGroup: doorHitGroup && typeof doorHitGroup === 'object' ? doorHitGroup : null,
    })
  ) {
    return true;
  }

  const wardrobeGroup = __isPaintMode ? getWardrobeGroup(App) : null;
  const directPartPaintTarget =
    __isPaintMode && foundPartId
      ? resolveNonDoorHoverTargetFromObject(App, primaryHitObject, foundPartId)
      : null;
  const nearbyShelfPaintTarget =
    __isPaintMode && !foundPartId && wardrobeGroup
      ? resolveNearbyShelfPaintTarget({
          App,
          wardrobeGroup: wardrobeGroup as never,
          intersects: hitState.intersects,
          primaryHitPoint: primaryHitPoint || null,
        })
      : null;
  const paintHitTarget = nearbyShelfPaintTarget || directPartPaintTarget;
  const paintFoundPartId = paintHitTarget?.partId || foundPartId;

  if (
    tryHandleCanvasPaintClick({
      App,
      foundPartId: paintFoundPartId,
      effectiveDoorId,
      activeStack: paintHitTarget?.stackKey || __activeStack,
      isPaintMode: __isPaintMode,
      primaryHitObject: paintHitTarget?.object || primaryHitObject,
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
      doorHitObject,
      primaryHitPoint,
      doorHitPoint,
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
