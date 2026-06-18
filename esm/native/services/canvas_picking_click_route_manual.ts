import {
  resetCanvasPickingEmptyClick,
  tryHandleCanvasManualSketchFreeClick,
} from './canvas_picking_click_manual_sketch_free_flow.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import {
  tryRemoveSketchExternalDrawerByDirectHit,
  tryRemoveSketchInternalDrawerByMatchingHoverDirectHit,
} from './canvas_picking_drawer_cross_family.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { __wp_readSketchHover } from './canvas_picking_local_helpers.js';

export function tryHandleCanvasPickingManualOrEmptyRoute(args: CanvasPickingClickRouteArgs): boolean {
  const { App, ndcX, ndcY, raycaster, mouse, modeState, hitState } = args;
  const { foundModuleIndex, primaryHitObject } = hitState;
  const {
    __isPaintMode,
    __isGrooveEditMode,
    __isSplitEditMode,
    __isLayoutEditMode,
    __isManualLayoutMode,
    __isBraceShelvesMode,
    __isExtDrawerEditMode,
    __isIntDrawerEditMode,
    __isDividerEditMode,
    __isHandleEditMode,
    __isHingeEditMode,
    __isRemoveDoorMode,
  } = modeState;

  if (__isManualLayoutMode) {
    const manualTool = readActiveManualTool(App);
    const manualToolKey = typeof manualTool === 'string' ? manualTool : '';
    if (manualToolKey.startsWith('sketch_ext_drawers:')) {
      if (
        tryRemoveSketchExternalDrawerByDirectHit({
          App,
          intersects: hitState.intersects || [],
          activeModuleKey: args.moduleRefs.__activeModuleKey,
          patchConfigForKey: args.moduleRefs.__patchConfigForKey,
          source: 'sketch.removeExternalDrawerByHit',
        })
      ) {
        return true;
      }

      if (
        tryRemoveSketchInternalDrawerByMatchingHoverDirectHit({
          App,
          intersects: hitState.intersects || [],
          activeModuleKey: args.moduleRefs.__activeModuleKey,
          isBottom: args.moduleRefs.__isBottomStack,
          tool: manualToolKey,
          hover: __wp_readSketchHover(App),
          toModuleKey: __wp_toModuleKey,
          patchConfigForKey: args.moduleRefs.__patchConfigForKey,
          source: 'sketch.removeInternalDrawerByHoverDirectHit',
        })
      ) {
        return true;
      }
    }

    if (
      tryHandleCanvasManualSketchFreeClick({
        App,
        ndcX,
        ndcY,
        foundModuleIndex,
        raycaster,
        mouse,
      })
    ) {
      return true;
    }
  }

  return resetCanvasPickingEmptyClick({
    App,
    primaryHitObject,
    isPaintMode: __isPaintMode,
    isGrooveEditMode: __isGrooveEditMode,
    isSplitEditMode: __isSplitEditMode,
    isLayoutEditMode: __isLayoutEditMode,
    isManualLayoutMode: __isManualLayoutMode,
    isBraceShelvesMode: __isBraceShelvesMode,
    isExtDrawerEditMode: __isExtDrawerEditMode,
    isIntDrawerEditMode: __isIntDrawerEditMode,
    isDividerEditMode: __isDividerEditMode,
    isHandleEditMode: __isHandleEditMode,
    isHingeEditMode: __isHingeEditMode,
    isRemoveDoorMode: __isRemoveDoorMode,
  });
}
