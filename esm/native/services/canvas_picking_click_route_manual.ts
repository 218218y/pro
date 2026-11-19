import { tryHandleCanvasManualSketchFreeClick } from './canvas_picking_click_manual_sketch_free_flow.js';
import type { CanvasPickingClickRouteArgs } from './canvas_picking_click_route_shared.js';
import {
  tryRemoveSketchExternalDrawerByHoverAwareDirectHit,
  tryRemoveSketchInternalDrawerByMatchingHoverDirectHit,
} from './canvas_picking_drawer_cross_family.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import { __wp_readSketchHover } from './canvas_picking_local_helpers.js';

export function tryHandleCanvasPickingManualRoute(args: CanvasPickingClickRouteArgs): boolean {
  if (!args.modeState.__isManualLayoutMode) return false;

  const { App, ndcX, ndcY, raycaster, mouse, hitState } = args;
  const { foundModuleIndex } = hitState;
  const manualTool = readActiveManualTool(App);
  if (manualTool?.startsWith('sketch_ext_drawers:')) {
    if (
      tryRemoveSketchExternalDrawerByHoverAwareDirectHit({
        App,
        intersects: hitState.intersects || [],
        activeModuleKey: args.moduleRefs.__activeModuleKey,
        isBottom: args.moduleRefs.__isBottomStack,
        tool: manualTool,
        hover: __wp_readSketchHover(App),
        toModuleKey: __wp_toModuleKey,
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
        tool: manualTool,
        hover: __wp_readSketchHover(App),
        toModuleKey: __wp_toModuleKey,
        patchConfigForKey: args.moduleRefs.__patchConfigForKey,
        source: 'sketch.removeInternalDrawerByHoverDirectHit',
      })
    ) {
      return true;
    }
  }

  return tryHandleCanvasManualSketchFreeClick({
    App,
    ndcX,
    ndcY,
    foundModuleIndex,
    raycaster,
    mouse,
  });
}
