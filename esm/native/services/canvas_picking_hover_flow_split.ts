import type { AppContainer } from '../../../types';
import type { MouseVectorLike, RaycasterLike } from './canvas_picking_engine.js';
import type { HoverMarkerLike } from './canvas_picking_hover_flow_shared.js';
import { tryHandleSplitDoorHover } from './canvas_picking_door_hover_modes.js';
import { readSplitPosListFromMap } from '../runtime/maps_access.js';
import {
  __wp_reportPickingIssue,
  __wp_str,
  __wp_isDoorLikePartId,
  __wp_isDoorOrDrawerLikePartId,
  __wp_canonDoorPartKeyForMaps,
  __wp_getCanvasPickingRuntime,
  __wp_getSplitHoverDoorBaseKey,
  __wp_readSplitHoverDoorBounds,
  __wp_getRegularSplitPreviewLineY,
  __wp_getSplitHoverRaycastRoots,
  __wp_map,
  __wp_raycastReuse,
} from './canvas_picking_core_helpers.js';
import { __wp_getViewportRoots, __wp_isViewportRoot } from './canvas_picking_local_helpers.js';
import { normalizeDoorBaseKeyFromGroup } from './canvas_picking_hover_flow_shared.js';

type HandleCanvasSplitHoverArgs = {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  marker: HoverMarkerLike | null;
  cutMarker: HoverMarkerLike | null;
  splitVariant: string;
};

export function tryHandleCanvasSplitHover(args: HandleCanvasSplitHoverArgs): boolean {
  const { App, ndcX, ndcY, raycaster, mouse, marker, cutMarker, splitVariant } = args;
  return tryHandleSplitDoorHover({
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    marker,
    cutMarker,
    splitVariant,
    getViewportRoots: __wp_getViewportRoots,
    getSplitHoverRaycastRoots: __wp_getSplitHoverRaycastRoots,
    raycastReuse: __wp_raycastReuse,
    isViewportRoot: __wp_isViewportRoot,
    str: __wp_str,
    isDoorLikePartId: __wp_isDoorLikePartId,
    isDoorOrDrawerLikePartId: __wp_isDoorOrDrawerLikePartId,
    normalizeDoorBaseKey: (app, hitDoorGroup, hitDoorPid) => {
      let doorBaseKey = hitDoorPid;
      try {
        doorBaseKey = normalizeDoorBaseKeyFromGroup(hitDoorGroup, hitDoorPid, __wp_getSplitHoverDoorBaseKey);
      } catch (err) {
        __wp_reportPickingIssue(app, err, {
          where: 'canvasPicking',
          op: 'hover.normalizeDoorBaseKey',
          throttleMs: 1000,
        });
        doorBaseKey = hitDoorPid;
      }
      return doorBaseKey;
    },
    readSplitHoverDoorBounds: __wp_readSplitHoverDoorBounds,
    getCanvasPickingRuntime: __wp_getCanvasPickingRuntime,
    readSplitPosList: (app, doorBaseKey) => {
      const map0 = __wp_map(app, 'splitDoorsMap');
      return readSplitPosListFromMap(map0, doorBaseKey);
    },
    getRegularSplitPreviewLineY: __wp_getRegularSplitPreviewLineY,
    reportPickingIssue: __wp_reportPickingIssue,
  });
}
