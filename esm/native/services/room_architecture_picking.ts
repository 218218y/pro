import type { AppContainer, RoomOpeningKind, UnknownRecord } from '../../../types';

import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import { raycastAtNdc } from './canvas_picking_engine.js';
import { __wp_asRecord, __wp_reportPickingIssue } from './canvas_picking_core_support.js';
import { getViewportCamera, getViewportRoomGroup } from './render_surface_runtime.js';

const ROOM_ARCHITECTURE_GROUP_NAME = 'wpRoomArchitecture';

export type RoomArchitectureTargetHit = {
  hit: RaycastHitLike;
  target: UnknownRecord;
  distance: number | null;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readArchitectureGroup(App: AppContainer): UnknownRecord | null {
  const roomGroup = __wp_asRecord(getViewportRoomGroup(App));
  const getObjectByName = roomGroup?.getObjectByName;
  if (typeof getObjectByName !== 'function') return null;
  return __wp_asRecord(Reflect.apply(getObjectByName, roomGroup, [ROOM_ARCHITECTURE_GROUP_NAME]));
}

function findTaggedAncestor(
  value: unknown,
  predicate: (userData: UnknownRecord) => boolean
): UnknownRecord | null {
  let node = __wp_asRecord(value);
  for (let depth = 0; node && depth < 12; depth += 1) {
    const userData = __wp_asRecord(node.userData);
    if (userData && predicate(userData)) return node;
    node = __wp_asRecord(node.parent);
  }
  return null;
}

function findRoomArchitectureTargetHit(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  predicate: (userData: UnknownRecord) => boolean;
}): RoomArchitectureTargetHit | null {
  const camera = getViewportCamera(args.App);
  const architecture = readArchitectureGroup(args.App);
  const children = Array.isArray(architecture?.children) ? architecture.children : [];
  if (!camera || !children.length) return null;

  const hits = raycastAtNdc({
    raycaster: args.raycaster,
    mouse: args.mouse,
    camera,
    ndcX: args.ndcX,
    ndcY: args.ndcY,
    objects: children,
    recursive: true,
    onFailure: failure => {
      __wp_reportPickingIssue(args.App, failure.error, {
        where: 'roomArchitecturePicking',
        op: `targetHit.${failure.phase}`,
        throttleMs: 1000,
      });
    },
  });
  for (const hit of hits) {
    const target = findTaggedAncestor(hit.object, args.predicate);
    if (!target) continue;
    return {
      hit,
      target,
      distance: finiteNumber((hit as RaycastHitLike & { distance?: unknown }).distance),
    };
  }
  return null;
}

export function findRoomMeasurementTargetHit(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): RoomArchitectureTargetHit | null {
  return findRoomArchitectureTargetHit({
    ...args,
    predicate: userData => userData.__wpRoomMeasurementTarget === true,
  });
}

export function findRoomDoorTargetHit(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
}): RoomArchitectureTargetHit | null {
  return findRoomArchitectureTargetHit({
    ...args,
    predicate: userData =>
      userData.__wpRoomDoorMovable === true && typeof userData.roomOpeningId === 'string',
  });
}

export function findRoomOpeningTargetHit(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  kind: RoomOpeningKind;
}): RoomArchitectureTargetHit | null {
  return findRoomArchitectureTargetHit({
    ...args,
    predicate: userData =>
      userData.__wpRoomMeasurementTarget === true &&
      typeof userData.roomOpeningId === 'string' &&
      userData.roomOpeningKind === args.kind,
  });
}

export function readRoomArchitectureGroup(App: AppContainer): UnknownRecord | null {
  return readArchitectureGroup(App);
}
