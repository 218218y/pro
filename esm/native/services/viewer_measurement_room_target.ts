import type { AppContainer, UnknownRecord } from '../../../types';

import type { CanvasPickingClickHitState } from './canvas_picking_click_contracts.js';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import { __wp_asRecord } from './canvas_picking_core_support.js';
import { createCanvasPickingHitIdentity } from './canvas_picking_hit_identity.js';
import { findRoomMeasurementTargetHit } from './room_architecture_picking.js';
import { isIgnoredRoomWardrobeObstacleObject } from './room_wardrobe_obstacle_policy.js';

const ROOM_MEASUREMENT_DEPTH_EPSILON_M = 0.002;

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readExistingMeasurementDistance(hitState: CanvasPickingClickHitState | null): number | null {
  if (!hitState || !Array.isArray(hitState.intersects)) return null;
  let nearest: number | null = null;
  for (const hit of hitState.intersects) {
    if (isIgnoredRoomWardrobeObstacleObject(hit?.object)) continue;
    const distance = finiteNumber((hit as RaycastHitLike & { distance?: unknown }).distance);
    if (distance == null) continue;
    nearest = nearest == null ? distance : Math.min(nearest, distance);
  }
  return nearest;
}

function buildRoomMeasurementHitState(
  target: UnknownRecord,
  hit: RaycastHitLike
): CanvasPickingClickHitState {
  const userData = __wp_asRecord(target.userData);
  const partId = typeof userData?.partId === 'string' ? userData.partId : null;
  const point = hit.point || null;
  const y = finiteNumber(point?.y);
  return {
    intersects: [hit],
    foundPartId: partId,
    foundModuleIndex: null,
    foundModuleStack: 'top',
    effectiveDoorId: null,
    foundDrawerId: null,
    primaryHitObject: target,
    doorHitObject: null,
    doorHitGroup: null,
    primaryHitPoint: point,
    doorHitPoint: null,
    moduleHitY: null,
    doorHitY: null,
    primaryHitY: y,
    hitIdentity: createCanvasPickingHitIdentity({ partId, userData, source: 'click' }),
    hitUserData: userData,
  };
}

export function resolveViewerMeasurementHitStateWithRoom(args: {
  App: AppContainer;
  hitState: CanvasPickingClickHitState | null;
  ndcX?: number | undefined;
  ndcY?: number | undefined;
  raycaster?: RaycasterLike | null | undefined;
  mouse?: MouseVectorLike | null | undefined;
}): CanvasPickingClickHitState | null {
  if (typeof args.ndcX !== 'number' || typeof args.ndcY !== 'number' || !args.raycaster || !args.mouse) {
    return args.hitState;
  }
  const roomHit = findRoomMeasurementTargetHit({
    App: args.App,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    raycaster: args.raycaster,
    mouse: args.mouse,
  });
  if (!roomHit) return args.hitState;

  const existingDistance = readExistingMeasurementDistance(args.hitState);
  if (
    existingDistance != null &&
    roomHit.distance != null &&
    existingDistance + ROOM_MEASUREMENT_DEPTH_EPSILON_M < roomHit.distance
  ) {
    return args.hitState;
  }
  return buildRoomMeasurementHitState(roomHit.target, roomHit.hit);
}
