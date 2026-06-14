import {
  readDoorLeafRectFromUserData as __readDoorLeafRect,
  readPointXYZ as __readPointXYZ,
} from './canvas_picking_door_shared.js';
import { __asObject } from './canvas_picking_door_action_hover_preview_contracts.js';
import type {
  MarkerLike,
  ReusableQuaternionLike,
  ReusableVectorLike,
  TransformNodeLike,
} from './canvas_picking_door_action_hover_preview_contracts.js';
import type { UnknownRecord } from '../../../types';
import { mapDoorTrimSurfaceLogicalToLocalPoint, type DoorTrimSurfacePlane } from '../features/door_trim.js';

function resolveMarkerLocalZ(groupRec: TransformNodeLike | null, fallbackZ: number): number {
  const userData = __asObject<UnknownRecord>(groupRec?.userData);
  const frontMaxZ = Number(userData?.__frontMaxZ);
  if (!Number.isFinite(frontMaxZ) || Math.abs(frontMaxZ) <= 0.000001) return fallbackZ;

  const sign = frontMaxZ >= 0 ? 1 : -1;
  const nudge = Math.abs(fallbackZ);
  return frontMaxZ + sign * nudge;
}

export function __positionDoorMarker(args: {
  groupRec: TransformNodeLike | null;
  wardrobeGroup: UnknownRecord;
  doorMarker: MarkerLike | null;
  local: ReusableVectorLike;
  wq: ReusableQuaternionLike;
  centerX: number;
  centerY: number;
  zOff: number;
  surfacePlane?: DoorTrimSurfacePlane;
}): void {
  const { groupRec, wardrobeGroup, doorMarker, local, wq, centerX, centerY, zOff } = args;
  const userData = __asObject<UnknownRecord>(groupRec?.userData);
  const localPoint = mapDoorTrimSurfaceLogicalToLocalPoint({
    userData: args.surfacePlane
      ? { ...(userData || {}), __wpDoorTrimSurfacePlane: args.surfacePlane }
      : userData,
    localX: centerX,
    localY: centerY,
    faceCoord: resolveMarkerLocalZ(groupRec, zOff),
  });
  local.set(localPoint.x, localPoint.y, localPoint.z);
  groupRec?.localToWorld?.(local);
  __asObject<TransformNodeLike>(wardrobeGroup)?.worldToLocal?.(local);
  doorMarker?.position?.copy?.(local);
  groupRec?.getWorldQuaternion?.(wq);
  doorMarker?.quaternion?.copy?.(wq);
}

export { __readDoorLeafRect, __readPointXYZ };
