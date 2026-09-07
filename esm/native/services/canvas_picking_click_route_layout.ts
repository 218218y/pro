import { tryHandleCanvasLayoutEditClick } from './canvas_picking_layout_edit_flow.js';
import { tryHandleCanvasDrawerModeClick } from './canvas_picking_drawer_mode_flow.js';
import { __coreHandleCanvasHoverNDC } from './canvas_picking_hover_flow.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';

function refreshDividerHoverAtClick(args: CanvasPickingClickRouteArgs): void {
  if (!args.modeState.__isManualLayoutMode) return;
  const manualTool = readActiveManualTool(args.App);
  if (manualTool !== 'sketch_box_divider' && manualTool !== 'sketch_box_divider_horizontal') return;
  // Divider commits are intentionally hover-derived. Re-resolve the hover synchronously
  // at the click coordinates so a stationary pointer after tool selection cannot consume
  // the first click before a matching hover snapshot exists.
  __coreHandleCanvasHoverNDC(args.App, args.ndcX, args.ndcY);
}

export function tryHandleCanvasPickingLayoutRoute(args: CanvasPickingClickRouteArgs): boolean {
  const { App, hitState, modeState, moduleRefs } = args;
  const { intersects, foundPartId, foundModuleIndex, foundDrawerId, primaryHitObject, moduleHitY } = hitState;
  const {
    __isLayoutEditMode,
    __isManualLayoutMode,
    __isBraceShelvesMode,
    __isIntDrawerEditMode,
    __isExtDrawerEditMode,
    __isDividerEditMode,
  } = modeState;
  const { __activeModuleKey, __isBottomStack, __patchConfigForKey, __getActiveConfigRef } = moduleRefs;

  refreshDividerHoverAtClick(args);

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
    primaryHitObject,
    moduleHitY,
    intersects,
    __patchConfigForKey,
  });
}
