import { tryHandleManualLayoutSketchHoverPreview } from './canvas_picking_manual_layout_sketch_hover_tools.js';
import {
  __wp_clearSketchHover,
  __wp_findNearestSketchBoxDivider,
  __wp_findSketchFreeBoxLocalHit,
  __wp_findSketchModuleBoxAtPoint,
  __wp_getViewportRoots,
  __wp_intersectScreenWithLocalZPlane,
  __wp_isViewportRoot,
  __wp_measureWardrobeLocalBox,
  __wp_parseSketchBoxToolSpec,
  __wp_pickSketchBoxSegment,
  __wp_projectWorldPointToLocal,
  __wp_readInteriorModuleConfigRef,
  __wp_readSketchBoxDividerXNorm,
  __wp_readSketchBoxDividers,
  __wp_resolveSketchBoxDividerPlacement,
  __wp_resolveSketchBoxGeometry,
  __wp_resolveSketchBoxSegments,
  __wp_resolveSketchFreeBoxHoverPlacement,
  __wp_writeSketchHover,
} from './canvas_picking_local_helpers.js';
import {
  getSketchFreeBoxPartPrefix as __wp_getSketchFreeBoxPartPrefix,
  pickSketchFreeBoxHost as __wp_pickSketchFreeBoxHost,
  resolveSketchFreeBoxGeometry as __wp_resolveSketchFreeBoxGeometry,
} from './canvas_picking_sketch_free_boxes.js';
import {
  __wp_isCornerKey,
  __wp_isDefaultCornerCellCfgLike,
  __wp_raycastReuse,
  __wp_toModuleKey,
} from './canvas_picking_core_helpers.js';
import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export function tryHandleCanvasNonSplitSketchHover(args: HandleCanvasNonSplitHoverArgs): boolean {
  const {
    App,
    ndcX,
    ndcY,
    primaryMode: __pm,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
    hideLayoutPreview: __hideLayoutPreview,
  } = args;

  return tryHandleManualLayoutSketchHoverPreview({
    App,
    ndcX,
    ndcY,
    __pm,
    __hideLayoutPreview,
    __wpRaycaster,
    __wpMouse,
    __wp_getViewportRoots,
    __wp_raycastReuse,
    __wp_toModuleKey,
    __wp_projectWorldPointToLocal,
    __wp_parseSketchBoxToolSpec,
    __wp_pickSketchFreeBoxHost,
    __wp_measureWardrobeLocalBox,
    __wp_intersectScreenWithLocalZPlane,
    __wp_readInteriorModuleConfigRef,
    __wp_resolveSketchFreeBoxGeometry,
    __wp_getSketchFreeBoxPartPrefix,
    __wp_findSketchFreeBoxLocalHit,
    __wp_readSketchBoxDividers,
    __wp_resolveSketchBoxSegments,
    __wp_pickSketchBoxSegment,
    __wp_findNearestSketchBoxDivider,
    __wp_resolveSketchBoxDividerPlacement,
    __wp_findSketchModuleBoxAtPoint,
    __wp_readSketchBoxDividerXNorm,
    __wp_isCornerKey,
    __wp_isDefaultCornerCellCfgLike,
    __wp_resolveSketchBoxGeometry,
    __wp_resolveSketchFreeBoxHoverPlacement,
    __wp_writeSketchHover,
    __wp_clearSketchHover,
  });
}
