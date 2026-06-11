import type { CanvasPickingManualSketchFreeClickArgs } from './canvas_picking_click_contracts.js';
import { pickSketchFreeBoxHost as __wp_pickSketchFreeBoxHost } from './canvas_picking_sketch_free_boxes.js';
import {
  __wp_parseSketchBoxToolSpec,
  __wp_getViewportRoots,
  __wp_readSketchHover,
  __wp_writeSketchHover,
  __wp_clearSketchHover,
  __wp_measureWardrobeLocalBox,
  __wp_intersectScreenWithLocalZPlane,
  __wp_tryCommitSketchFreePlacementFromHover,
  __wp_getSketchFreeBoxContentKind,
  __wp_readInteriorModuleConfigRef,
  __wp_resolveSketchFreeBoxHoverPlacement,
} from './canvas_picking_local_helpers.js';
import { readActiveManualTool } from './canvas_picking_manual_tool_access.js';
import { tryHandleCanvasManualSketchFreeContentClick } from './canvas_picking_click_manual_sketch_free_content.js';
import { tryHandleCanvasManualSketchFreeBoxClick } from './canvas_picking_click_manual_sketch_free_box.js';
import { isRecentModuleScopedSketchHover } from './canvas_picking_click_manual_sketch_free_recent.js';

export function tryHandleCanvasManualSketchFreeClick(args: CanvasPickingManualSketchFreeClickArgs): boolean {
  const { App, ndcX, ndcY, foundModuleIndex, raycaster, mouse } = args;

  try {
    const manualTool = readActiveManualTool(App);

    if (__wp_tryCommitSketchFreePlacementFromHover(App, manualTool)) return true;

    const mt = typeof manualTool === 'string' ? String(manualTool) : '';
    const recentHover = __wp_readSketchHover(App);
    if (isRecentModuleScopedSketchHover(recentHover, mt)) return false;

    const host = __wp_pickSketchFreeBoxHost(App);
    const wardrobeBox = __wp_measureWardrobeLocalBox(App);
    const floorY = wardrobeBox
      ? Math.max(0, Number(wardrobeBox.centerY) - Number(wardrobeBox.height) / 2)
      : NaN;

    if (
      tryHandleCanvasManualSketchFreeContentClick({
        App,
        tool: mt,
        foundModuleIndex,
        host,
        floorY,
        __wp_readSketchHover,
        __wp_writeSketchHover,
        __wp_clearSketchHover,
        __wp_getSketchFreeBoxContentKind,
      })
    ) {
      return true;
    }

    if (
      tryHandleCanvasManualSketchFreeBoxClick({
        App,
        tool: mt,
        ndcX,
        ndcY,
        host,
        wardrobeBox,
        raycaster,
        mouse,
        floorY,
        __wp_readSketchHover,
        __wp_writeSketchHover,
        __wp_clearSketchHover,
        __wp_parseSketchBoxToolSpec,
        __wp_getViewportRoots,
        __wp_intersectScreenWithLocalZPlane,
        __wp_readInteriorModuleConfigRef,
        __wp_resolveSketchFreeBoxHoverPlacement,
      })
    ) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export { resetCanvasPickingEmptyClick } from './canvas_picking_click_manual_sketch_free_reset.js';
