import { tryHandleDoorActionHover } from './canvas_picking_door_hover_modes.js';
import {
  __wp_canonDoorPartKeyForMaps,
  __wp_getCanvasPickingRuntime,
  __wp_getSplitHoverDoorBaseKey,
  __wp_getSplitHoverRaycastRoots,
  __wp_isDoorLikePartId,
  __wp_isDoorOrDrawerLikePartId,
  __wp_isRemoved,
  __wp_isSegmentedDoorBaseId,
  __wp_raycastReuse,
  __wp_readSplitHoverDoorBounds,
  __wp_str,
  __wp_ui,
} from './canvas_picking_core_helpers.js';
import { normalizeDoorBaseKeyFromGroup } from './canvas_picking_hover_flow_shared.js';
import { __wp_getViewportRoots, __wp_isViewportRoot } from './canvas_picking_local_helpers.js';
import type { NonSplitPreviewRouteArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export type NonSplitDoorPreviewDeps = {
  tryHandleDoorActionHover: typeof tryHandleDoorActionHover;
};

const DEFAULT_NON_SPLIT_DOOR_PREVIEW_DEPS: NonSplitDoorPreviewDeps = {
  tryHandleDoorActionHover,
};

export function tryHandleCanvasNonSplitDoorPreviewRoute(
  args: NonSplitPreviewRouteArgs,
  deps: NonSplitDoorPreviewDeps = DEFAULT_NON_SPLIT_DOOR_PREVIEW_DEPS
): boolean {
  const {
    hoverArgs: {
      App,
      ndcX,
      ndcY,
      paintSelection,
      isGrooveEditMode,
      isRemoveDoorMode,
      isHandleEditMode,
      isHingeEditMode,
      isMirrorPaintMode,
      isDoorTrimMode,
      raycaster,
      mouse,
      doorMarker,
      hideLayoutPreview,
      hideSketchPreview,
      setSketchPreview,
    },
    facePreviewState: { preferredFacePreviewPartId, preferredFacePreviewHitObject },
  } = args;

  if (
    deps.tryHandleDoorActionHover({
      App,
      ndcX,
      ndcY,
      raycaster,
      mouse,
      doorMarker: doorMarker || null,
      hideLayoutPreview,
      hideSketchPreview,
      setSketchPreview,
      isGrooveEditMode,
      isRemoveDoorMode,
      isHandleEditMode,
      isHingeEditMode,
      isMirrorPaintMode,
      isDoorTrimMode,
      paintSelection,
      readUi: __wp_ui,
      getViewportRoots: __wp_getViewportRoots,
      getSplitHoverRaycastRoots: __wp_getSplitHoverRaycastRoots,
      raycastReuse: __wp_raycastReuse,
      isViewportRoot: __wp_isViewportRoot,
      str: __wp_str,
      isDoorLikePartId: __wp_isDoorLikePartId,
      isDoorOrDrawerLikePartId: __wp_isDoorOrDrawerLikePartId,
      normalizeDoorBaseKey: (_app, hitDoorGroup, hitDoorPid) => {
        let doorBaseKey = hitDoorPid;
        try {
          doorBaseKey = normalizeDoorBaseKeyFromGroup(
            hitDoorGroup,
            hitDoorPid,
            __wp_getSplitHoverDoorBaseKey
          );
        } catch {
          doorBaseKey = hitDoorPid;
        }
        return doorBaseKey;
      },
      readSplitHoverDoorBounds: __wp_readSplitHoverDoorBounds,
      getCanvasPickingRuntime: __wp_getCanvasPickingRuntime,
      isRemoved: __wp_isRemoved,
      isSegmentedDoorBaseId: __wp_isSegmentedDoorBaseId,
      canonDoorPartKeyForMaps: __wp_canonDoorPartKeyForMaps,
      preferredFacePreviewPartId,
      preferredFacePreviewHitObject,
      paintUsesWardrobeGroup: !!paintSelection,
    })
  ) {
    return true;
  }

  if (doorMarker) doorMarker.visible = false;
  return false;
}
