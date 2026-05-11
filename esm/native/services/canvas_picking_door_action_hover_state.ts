import type { UnknownRecord } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getMode } from '../kernel/api.js';
import { isManualHandlePositionMode } from '../features/manual_handle_position.js';
import { resolveDoorHitOwnerByPartId } from './canvas_picking_door_shared.js';
import type {
  DoorActionHoverModeState,
  DoorActionHoverResolvedState,
} from './canvas_picking_door_action_hover_contracts.js';
import {
  type DoorActionHoverArgs,
  type TransformNodeLike,
  type MarkerUserDataLike,
  __asObject,
  __getDoorHoverAnchorX,
  __isSingleDoorHingeTarget,
  __normalizePaintSelection,
  __readHoverThree,
  __resolveHoverHit,
  __resolvePreferredFacePreviewHit,
  __scopeCornerHoverPartKey,
} from './canvas_picking_door_hover_targets.js';
import { __readParentHitObject } from './canvas_picking_door_hover_targets_runtime.js';

function readModeOptsSafe(App: DoorActionHoverArgs['App']): UnknownRecord | null {
  try {
    return __asObject<UnknownRecord>(getMode(App)?.opts);
  } catch {
    return null;
  }
}

export function resolveDoorActionHoverModeState(args: DoorActionHoverArgs): DoorActionHoverModeState | null {
  const normalizedPaintSelection = __normalizePaintSelection(args.paintSelection);
  const isPaintHoverMode = !!normalizedPaintSelection;
  const isTrimHoverMode = args.isDoorTrimMode === true;
  const isHandleHoverMode = args.isHandleEditMode === true;
  const modeOpts = readModeOptsSafe(args.App);
  const isManualHandlePlacementMode =
    isHandleHoverMode && isManualHandlePositionMode(modeOpts?.handlePlacement);
  const isHingeHoverMode = args.isHingeEditMode === true;
  const isFacePreviewMode = isHandleHoverMode || isHingeHoverMode;

  if (
    (!args.isGrooveEditMode &&
      !args.isRemoveDoorMode &&
      !isPaintHoverMode &&
      !isTrimHoverMode &&
      !isFacePreviewMode) ||
    (!args.doorMarker && !isTrimHoverMode)
  ) {
    return null;
  }

  return {
    normalizedPaintSelection,
    isPaintHoverMode,
    isTrimHoverMode,
    isHandleHoverMode,
    isManualHandlePositionMode: isManualHandlePlacementMode,
    isHingeHoverMode,
    isFacePreviewMode,
  };
}

export function shouldApplyGenericDoorActionHoverMarkerFinish(modeState: DoorActionHoverModeState): boolean {
  return !modeState.isPaintHoverMode && !modeState.isTrimHoverMode && !modeState.isFacePreviewMode;
}

function hasDoorLeafMetrics(userData: UnknownRecord | null): boolean {
  return !!(
    userData &&
    ((typeof userData.__doorWidth === 'number' && typeof userData.__doorHeight === 'number') ||
      (typeof userData.__doorRectMinX === 'number' &&
        typeof userData.__doorRectMaxX === 'number' &&
        typeof userData.__doorRectMinY === 'number' &&
        typeof userData.__doorRectMaxY === 'number'))
  );
}

export function resolveDoorLeafOwner(
  groupRec: TransformNodeLike | null,
  targetPartId?: string | null
): {
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
} {
  const resolvedOwner = __asObject<TransformNodeLike>(
    resolveDoorHitOwnerByPartId(__asObject<UnknownRecord>(groupRec), targetPartId || null)
  );
  if (resolvedOwner) {
    return {
      groupRec: resolvedOwner,
      userData: __asObject<UnknownRecord>(resolvedOwner.userData),
    };
  }

  let current = groupRec;
  while (current) {
    const currentUserData = __asObject<UnknownRecord>(current.userData);
    if (hasDoorLeafMetrics(currentUserData)) {
      return { groupRec: current, userData: currentUserData };
    }
    current = __readParentHitObject(current);
  }
  return {
    groupRec,
    userData: groupRec ? __asObject<UnknownRecord>(groupRec.userData) : null,
  };
}

function readSketchDoorBounds(args: {
  App: DoorActionHoverArgs['App'];
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
}): { minY: number; maxY: number } | null {
  const { App, groupRec, userData } = args;
  const doorH = userData && typeof userData.__doorHeight === 'number' ? Number(userData.__doorHeight) : NaN;
  if (
    !(userData && (userData.__wpSketchBoxDoor === true || userData.__wpSketchDoorLeaf === true)) ||
    !Number.isFinite(doorH) ||
    !(doorH > 0)
  ) {
    return null;
  }
  const THREE0 = __readHoverThree(getThreeMaybe(App));
  if (!THREE0) return null;
  const pos = new THREE0.Vector3();
  try {
    groupRec?.getWorldPosition?.(pos);
    return { minY: pos.y - doorH / 2, maxY: pos.y + doorH / 2 };
  } catch {
    return null;
  }
}

export function resolveDoorActionHoverState(args: {
  hoverArgs: DoorActionHoverArgs;
  modeState: DoorActionHoverModeState;
}): DoorActionHoverResolvedState | null {
  const { hoverArgs, modeState } = args;
  const preferredFaceHit =
    modeState.isFacePreviewMode &&
    !modeState.isManualHandlePositionMode &&
    hoverArgs.preferredFacePreviewPartId
      ? __resolvePreferredFacePreviewHit({
          App: hoverArgs.App,
          preferredPartId: hoverArgs.preferredFacePreviewPartId,
          preferredHitObject: hoverArgs.preferredFacePreviewHitObject || null,
          getViewportRoots: hoverArgs.getViewportRoots,
          isViewportRoot: hoverArgs.isViewportRoot,
          str: hoverArgs.str,
        })
      : null;
  const hit =
    preferredFaceHit ||
    __resolveHoverHit(
      { ...hoverArgs, allowTransparentRestoreTargets: hoverArgs.isRemoveDoorMode },
      modeState.isPaintHoverMode || modeState.isHandleHoverMode
        ? hoverArgs.isDoorOrDrawerLikePartId
        : hoverArgs.isDoorLikePartId
    );
  if (!hit) return null;

  const { App, normalizeDoorBaseKey, readSplitHoverDoorBounds } = hoverArgs;
  const { hitDoorPid, hitDoorGroup, wardrobeGroup } = hit;
  if (modeState.isHingeHoverMode && !__isSingleDoorHingeTarget(App, hitDoorPid, hitDoorGroup)) return null;

  const doorBaseKey = normalizeDoorBaseKey(App, hitDoorGroup, hitDoorPid);
  const resolvedLeafOwner = resolveDoorLeafOwner(__asObject<TransformNodeLike>(hitDoorGroup), hitDoorPid);
  const groupRec = resolvedLeafOwner.groupRec;
  const userData = resolvedLeafOwner.userData;

  const sketchDoorBounds = readSketchDoorBounds({ App, groupRec, userData });
  const bounds =
    sketchDoorBounds ||
    readSplitHoverDoorBounds(App, String(hitDoorPid || '')) ||
    readSplitHoverDoorBounds(App, String(doorBaseKey || ''));
  const minY = bounds ? bounds.minY : Infinity;
  const maxY = bounds ? bounds.maxY : -Infinity;

  if (
    !modeState.isPaintHoverMode &&
    !modeState.isTrimHoverMode &&
    !modeState.isFacePreviewMode &&
    (!isFinite(minY) || !isFinite(maxY) || maxY - minY < 0.05)
  ) {
    return null;
  }

  const hitDoorStack = userData && userData.__wpStack === 'bottom' ? 'bottom' : 'top';
  const scopedHitDoorPid = __scopeCornerHoverPartKey(hitDoorPid, hitDoorStack);
  const width = userData && typeof userData.__doorWidth === 'number' ? Number(userData.__doorWidth) : 0.45;
  const hingeLeft = userData && typeof userData.__hingeLeft === 'boolean' ? !!userData.__hingeLeft : true;
  const anchorX = __getDoorHoverAnchorX(hitDoorGroup, userData, width, hingeLeft);
  const regionH = Math.max(0.05, maxY - minY);
  const regionCenterY = (minY + maxY) / 2;
  const markerUd = hoverArgs.doorMarker
    ? __asObject<MarkerUserDataLike>(hoverArgs.doorMarker.userData) || {}
    : {};

  return {
    hit,
    hitDoorPid,
    hitDoorGroup,
    wardrobeGroup,
    groupRec,
    userData,
    hitDoorStack,
    scopedHitDoorPid,
    width,
    anchorX,
    regionH,
    regionCenterY,
    markerUd,
  };
}
