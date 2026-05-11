import type { UnknownRecord } from '../../../types';
import type {
  DoorActionHoverPreviewRuntime,
  DoorActionHoverPreviewRouteArgs,
} from './canvas_picking_door_action_hover_contracts.js';
import {
  tryHandleDoorFaceHoverPreview,
  tryHandleDoorPaintHoverPreview,
  tryHandleDoorTrimHoverPreview,
  tryHandleDoorManualHandleHoverPreview,
} from './canvas_picking_door_action_hover_preview.js';
import { getMode } from '../kernel/api.js';
import {
  type TransformNodeLike,
  __asObject,
  __isReusableQuaternionLike,
  __isReusableVectorLike,
  __readHoverThree,
  __reuseValue,
} from './canvas_picking_door_hover_targets.js';

function readModeOptsSafe(App: unknown): UnknownRecord | null {
  try {
    return __asObject<UnknownRecord>(getMode(App as never)?.opts);
  } catch {
    return null;
  }
}

function createDoorActionHoverPreviewRuntime(
  args: DoorActionHoverPreviewRouteArgs
): DoorActionHoverPreviewRuntime | null {
  const T3 = __readHoverThree(args.THREE);
  if (!T3) return null;
  const picking = args.hoverArgs.getCanvasPickingRuntime(args.hoverArgs.App);
  const local = __reuseValue(
    picking,
    '__doorActionHoverLocalV3',
    __isReusableVectorLike,
    () => new T3.Vector3()
  );
  const localHit = __reuseValue(
    picking,
    '__doorMirrorHoverHitLocalV3',
    __isReusableVectorLike,
    () => new T3.Vector3()
  );
  const hgWp = __reuseValue(
    picking,
    '__doorActionHoverWorldPosV3',
    __isReusableVectorLike,
    () => new T3.Vector3()
  );
  const wq = __reuseValue(
    picking,
    '__doorActionHoverWorldQuat',
    __isReusableQuaternionLike,
    () => new T3.Quaternion()
  );
  const zSign =
    args.state.userData && typeof args.state.userData.__handleZSign === 'number'
      ? Number(args.state.userData.__handleZSign)
      : 1;
  const zOff = 0.02 * (zSign === -1 ? -1 : 1);
  return { T3, local, localHit, hgWp, wq, zOff };
}

export function tryHandleDoorActionHoverMarkerRoute(args: DoorActionHoverPreviewRouteArgs): boolean {
  const runtime = createDoorActionHoverPreviewRuntime(args);
  if (!runtime) return false;
  const { hoverArgs, modeState, state, THREE } = args;
  const { App, doorMarker, setSketchPreview, canonDoorPartKeyForMaps, readUi } = hoverArgs;
  const {
    hit,
    hitDoorPid,
    groupRec,
    userData,
    wardrobeGroup,
    markerUd,
    scopedHitDoorPid,
    width,
    regionH,
    regionCenterY,
    anchorX,
  } = state;
  const { local, localHit, hgWp, wq, zOff } = runtime;

  try {
    if (modeState.isTrimHoverMode) {
      return tryHandleDoorTrimHoverPreview({
        App,
        THREE,
        hit,
        hitDoorPid,
        groupRec,
        userData,
        wardrobeGroup,
        doorMarker,
        markerUd,
        local,
        localHit,
        wq,
        zOff,
        setSketchPreview,
      });
    }

    if (modeState.isPaintHoverMode) {
      return tryHandleDoorPaintHoverPreview({
        App,
        THREE,
        hit,
        groupRec,
        userData,
        wardrobeGroup,
        doorMarker,
        markerUd,
        local,
        localHit,
        wq,
        zOff,
        scopedHitDoorPid,
        canonDoorPartKeyForMaps,
        normalizedPaintSelection: modeState.normalizedPaintSelection || '',
        setSketchPreview,
        readUi,
      });
    }

    if (modeState.isManualHandlePositionMode) {
      return tryHandleDoorManualHandleHoverPreview({
        App,
        THREE,
        hit,
        groupRec,
        userData,
        wardrobeGroup,
        doorMarker,
        markerUd,
        local,
        localHit,
        wq,
        zOff,
        scopedHitDoorPid,
        modeOpts: readModeOptsSafe(App),
        setSketchPreview,
      });
    }

    if (modeState.isFacePreviewMode) {
      return tryHandleDoorFaceHoverPreview({
        App,
        THREE,
        hit,
        groupRec,
        userData,
        wardrobeGroup,
        doorMarker,
        markerUd,
        local,
        localHit,
        wq,
        zOff,
        width,
        regionH,
        isHandleHoverMode: modeState.isHandleHoverMode,
      });
    }

    local.set(anchorX, 0, zOff);
    groupRec?.getWorldPosition?.(hgWp);
    local.y = regionCenterY - hgWp.y;
    groupRec?.localToWorld?.(local);
    __asObject<TransformNodeLike>(wardrobeGroup)?.worldToLocal?.(local);
    doorMarker?.position?.copy?.(local);

    groupRec?.getWorldQuaternion?.(wq);
    doorMarker?.quaternion?.copy?.(wq);
    return true;
  } catch {
    return false;
  }
}
