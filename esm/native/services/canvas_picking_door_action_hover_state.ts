import type { UnknownRecord } from '../../../types';
import { getThreeMaybe } from '../runtime/three_access.js';
import { getMode } from '../kernel/api.js';
import { isManualHandlePositionMode } from '../features/manual_handle_position.js';
import {
  readDoorLeafRectFromUserData,
  readPointXYZ,
  resolveDoorHitOwnerByPartId,
} from './canvas_picking_door_shared.js';
import { mapDoorTrimSurfaceLocalPoint } from '../features/door_trim.js';
import {
  __wp_isDoorActionPaintTargetPartId,
  __wp_isDoorTrimActionTargetPartId,
} from './canvas_picking_core_helpers.js';
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

const DOOR_ACTION_HIT_RECT_EPSILON_M = 0.001;

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

function isSketchDoorLeafUserData(userData: UnknownRecord | null): userData is UnknownRecord {
  return !!(userData && userData.__wpSketchDoorLeaf === true);
}

function readUserDataPartId(userData: UnknownRecord | null): string {
  return typeof userData?.partId === 'string' ? String(userData.partId) : '';
}

type DoorLeafSearchNode = TransformNodeLike & {
  children?: unknown[] | null;
};

function asDoorLeafSearchNode(value: unknown): DoorLeafSearchNode | null {
  return __asObject<DoorLeafSearchNode>(value);
}

function resolveSketchDoorLeafOwnerFromTree(
  groupRec: TransformNodeLike | null,
  targetPartId?: string | null
): {
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
} | null {
  const root = asDoorLeafSearchNode(groupRec);
  if (!root) return null;

  const targetId = typeof targetPartId === 'string' && targetPartId ? String(targetPartId) : '';
  const stack: DoorLeafSearchNode[] = [root];
  const seen = new Set<DoorLeafSearchNode>();
  let firstSketchLeaf: { groupRec: TransformNodeLike; userData: UnknownRecord } | null = null;
  let visited = 0;

  while (stack.length && visited < 500) {
    visited += 1;
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    const userData = __asObject<UnknownRecord>(current.userData);
    if (isSketchDoorLeafUserData(userData) && hasDoorLeafMetrics(userData)) {
      const currentLeaf = { groupRec: current, userData };
      if (!firstSketchLeaf) firstSketchLeaf = currentLeaf;
      const partId = readUserDataPartId(userData);
      if (!targetId || partId === targetId) return currentLeaf;
    }

    const children = Array.isArray(current.children) ? current.children : [];
    for (let i = 0; i < children.length; i += 1) {
      const child = asDoorLeafSearchNode(children[i]);
      if (child) stack.push(child);
    }
  }

  return targetId ? null : firstSketchLeaf;
}

export function resolveDoorLeafOwner(
  groupRec: TransformNodeLike | null,
  targetPartId?: string | null
): {
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
} {
  const sketchLeafOwner = resolveSketchDoorLeafOwnerFromTree(groupRec, targetPartId || null);
  if (sketchLeafOwner) return sketchLeafOwner;

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

function readFiniteMetric(userData: UnknownRecord | null, key: string): number | null {
  const value = userData ? Number(userData[key]) : NaN;
  return Number.isFinite(value) ? value : null;
}

function isPointInsideRect(
  point: { x: number; y: number },
  rect: { minX: number; maxX: number; minY: number; maxY: number }
): boolean {
  return (
    point.x >= rect.minX - DOOR_ACTION_HIT_RECT_EPSILON_M &&
    point.x <= rect.maxX + DOOR_ACTION_HIT_RECT_EPSILON_M &&
    point.y >= rect.minY - DOOR_ACTION_HIT_RECT_EPSILON_M &&
    point.y <= rect.maxY + DOOR_ACTION_HIT_RECT_EPSILON_M
  );
}

function isDoorActionHitInsideLeafRect(args: {
  App: DoorActionHoverArgs['App'];
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
  hitPoint: unknown;
}): boolean {
  const { App, groupRec, userData, hitPoint } = args;
  const rect = readDoorLeafRectFromUserData(userData);
  if (!rect) return true;

  const point = readPointXYZ(hitPoint);
  if (!point || !groupRec || typeof groupRec.worldToLocal !== 'function') return false;

  const THREE0 = __readHoverThree(getThreeMaybe(App));
  if (!THREE0) return false;

  try {
    const localHit = new THREE0.Vector3();
    localHit.set(point.x, point.y, point.z);
    groupRec.worldToLocal(localHit);
    const mappedLocal = mapDoorTrimSurfaceLocalPoint(userData, localHit);
    return isPointInsideRect({ x: mappedLocal.localX, y: mappedLocal.localY }, rect);
  } catch {
    return false;
  }
}

function readMetricDoorBounds(args: {
  App: DoorActionHoverArgs['App'];
  groupRec: TransformNodeLike | null;
  userData: UnknownRecord | null;
}): { minY: number; maxY: number } | null {
  const { App, groupRec, userData } = args;
  const doorH = readFiniteMetric(userData, '__doorHeight');
  if (doorH == null || !(doorH > 0)) return null;

  const THREE0 = __readHoverThree(getThreeMaybe(App));
  if (!THREE0) return null;
  const pos = new THREE0.Vector3();
  try {
    groupRec?.getWorldPosition?.(pos);
    const faceOffsetY = readFiniteMetric(userData, '__wpFaceOffsetY') ?? 0;
    const centerY = pos.y + faceOffsetY;
    return { minY: centerY - doorH / 2, maxY: centerY + doorH / 2 };
  } catch {
    const faceMinY = readFiniteMetric(userData, '__wpFaceMinY');
    const faceMaxY = readFiniteMetric(userData, '__wpFaceMaxY');
    if (faceMinY != null && faceMaxY != null && faceMaxY > faceMinY) {
      return { minY: faceMinY, maxY: faceMaxY };
    }
    return null;
  }
}

export function resolveDoorActionHoverState(args: {
  hoverArgs: DoorActionHoverArgs;
  modeState: DoorActionHoverModeState;
}): DoorActionHoverResolvedState | null {
  const { hoverArgs, modeState } = args;
  const preferredFacePreviewPartId = hoverArgs.preferredFacePreviewPartId || null;
  const preferredFacePreviewHitPoint = readPointXYZ(hoverArgs.preferredFacePreviewHitPoint || null);
  const canUsePreferredFacePreviewHit =
    modeState.isFacePreviewMode &&
    !!preferredFacePreviewPartId &&
    (!modeState.isManualHandlePositionMode || !!preferredFacePreviewHitPoint);
  const preferredFaceHit = canUsePreferredFacePreviewHit
    ? __resolvePreferredFacePreviewHit({
        App: hoverArgs.App,
        preferredPartId: preferredFacePreviewPartId,
        preferredHitObject: hoverArgs.preferredFacePreviewHitObject || null,
        preferredHitPoint: hoverArgs.preferredFacePreviewHitPoint || null,
        getViewportRoots: hoverArgs.getViewportRoots,
        isViewportRoot: hoverArgs.isViewportRoot,
        str: hoverArgs.str,
      })
    : null;
  const hoverPartMatcher = modeState.isPaintHoverMode
    ? __wp_isDoorActionPaintTargetPartId
    : modeState.isTrimHoverMode
      ? __wp_isDoorTrimActionTargetPartId
      : modeState.isHandleHoverMode || hoverArgs.isGrooveEditMode
        ? hoverArgs.isDoorOrDrawerLikePartId
        : hoverArgs.isDoorLikePartId;
  const hit =
    preferredFaceHit ||
    __resolveHoverHit(
      { ...hoverArgs, allowTransparentRestoreTargets: hoverArgs.isRemoveDoorMode },
      hoverPartMatcher
    );
  if (!hit) return null;

  const { App, normalizeDoorBaseKey, readSplitHoverDoorBounds } = hoverArgs;
  const { hitDoorPid, hitDoorGroup, wardrobeGroup } = hit;
  if (modeState.isHingeHoverMode && !__isSingleDoorHingeTarget(App, hitDoorPid, hitDoorGroup)) return null;

  const doorBaseKey = normalizeDoorBaseKey(App, hitDoorGroup, hitDoorPid);
  const resolvedLeafOwner = resolveDoorLeafOwner(__asObject<TransformNodeLike>(hitDoorGroup), hitDoorPid);
  const groupRec = resolvedLeafOwner.groupRec;
  const userData = resolvedLeafOwner.userData;

  if (modeState.isFacePreviewMode && !hasDoorLeafMetrics(userData)) {
    return null;
  }

  if (!isDoorActionHitInsideLeafRect({ App, groupRec, userData, hitPoint: hit.hitPoint })) {
    return null;
  }

  const metricDoorBounds = readMetricDoorBounds({ App, groupRec, userData });
  const bounds =
    metricDoorBounds ||
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
