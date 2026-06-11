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

export function __positionDoorMarker(args: {
  groupRec: TransformNodeLike | null;
  wardrobeGroup: UnknownRecord;
  doorMarker: MarkerLike | null;
  local: ReusableVectorLike;
  wq: ReusableQuaternionLike;
  centerX: number;
  centerY: number;
  zOff: number;
}): void {
  const { groupRec, wardrobeGroup, doorMarker, local, wq, centerX, centerY, zOff } = args;
  local.set(centerX, centerY, zOff);
  groupRec?.localToWorld?.(local);
  __asObject<TransformNodeLike>(wardrobeGroup)?.worldToLocal?.(local);
  doorMarker?.position?.copy?.(local);
  groupRec?.getWorldQuaternion?.(wq);
  doorMarker?.quaternion?.copy?.(wq);
}

export { __readDoorLeafRect, __readPointXYZ };
