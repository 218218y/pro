import type { AppContainer, RoomWallId, UnknownRecord } from '../../../types';

import { __wp_asRecord, __wp_reportPickingIssue } from './canvas_picking_core_support.js';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import { raycastAtNdc } from './canvas_picking_engine.js';
import { getViewportCamera, getViewportRoomGroup, getViewportThree } from './render_surface_runtime.js';

export type RoomWallSurfacePickMeta = {
  wall: RoomWallId;
  axis: 'x' | 'z';
  startCoord: number;
  usableLength: number;
  wallHeight: number;
  interiorFaceCoord: number;
  inwardNormalX: -1 | 0 | 1;
  inwardNormalZ: -1 | 0 | 1;
};

export type RoomWallSurfaceHit = {
  surface: RoomWallSurfacePickMeta;
  point: { x: number; y: number; z: number };
  distance: number | null;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readRoomWallSurfacePickMeta(hitObject: unknown): RoomWallSurfacePickMeta | null {
  let node = __wp_asRecord(hitObject);
  for (let depth = 0; node && depth < 8; depth += 1) {
    const ud = __wp_asRecord(node.userData);
    if (ud?.__wpRoomWallSurface === true) {
      const wall = ud.roomWallId;
      const axis = ud.roomWallAxis;
      const startCoord = finiteNumber(ud.roomWallStartCoord);
      const usableLength = finiteNumber(ud.roomWallUsableLength);
      const wallHeight = finiteNumber(ud.roomWallHeight);
      const interiorFaceCoord = finiteNumber(ud.roomWallInteriorFaceCoord);
      const inwardNormalX = finiteNumber(ud.roomWallInwardNormalX);
      const inwardNormalZ = finiteNumber(ud.roomWallInwardNormalZ);
      if (
        (wall === 'back' || wall === 'left' || wall === 'right') &&
        (axis === 'x' || axis === 'z') &&
        startCoord != null &&
        usableLength != null &&
        usableLength > 0 &&
        wallHeight != null &&
        wallHeight > 0 &&
        interiorFaceCoord != null &&
        (inwardNormalX === -1 || inwardNormalX === 0 || inwardNormalX === 1) &&
        (inwardNormalZ === -1 || inwardNormalZ === 0 || inwardNormalZ === 1)
      ) {
        return {
          wall,
          axis,
          startCoord,
          usableLength,
          wallHeight,
          interiorFaceCoord,
          inwardNormalX,
          inwardNormalZ,
        };
      }
    }
    node = __wp_asRecord(node.parent);
  }
  return null;
}

export function findRoomWallSurfaceMetaInScene(
  App: AppContainer,
  wall: RoomWallId
): RoomWallSurfacePickMeta | null {
  const roomGroup = __wp_asRecord(getViewportRoomGroup(App));
  const getObjectByName = roomGroup?.getObjectByName;
  const architecture =
    typeof getObjectByName === 'function'
      ? __wp_asRecord(Reflect.apply(getObjectByName, roomGroup, ['wpRoomArchitecture']))
      : null;
  const stack = Array.isArray(architecture?.children) ? [...architecture.children] : [];
  while (stack.length) {
    const node = stack.pop();
    const meta = readRoomWallSurfacePickMeta(node);
    if (meta?.wall === wall) return meta;
    const rec = __wp_asRecord(node);
    if (Array.isArray(rec?.children)) stack.push(...rec.children);
  }
  return null;
}

export function projectRoomWorldPointToLocal(
  App: AppContainer,
  point: RaycastHitLike['point']
): { x: number; y: number; z: number } | null {
  const px = finiteNumber(point?.x);
  const py = finiteNumber(point?.y);
  const pz = finiteNumber(point?.z);
  if (px == null || py == null || pz == null) return null;
  const roomGroup = __wp_asRecord(getViewportRoomGroup(App));
  const THREE = __wp_asRecord(getViewportThree(App));
  const Vector3Ctor = THREE?.Vector3 as
    (new (x?: number, y?: number, z?: number) => UnknownRecord) | undefined;
  if (!roomGroup || !Vector3Ctor) return { x: px, y: py, z: pz };
  const pointLocal = new Vector3Ctor(px, py, pz);
  try {
    const worldToLocal = roomGroup.worldToLocal;
    if (typeof worldToLocal === 'function') Reflect.apply(worldToLocal, roomGroup, [pointLocal]);
  } catch (error) {
    __wp_reportPickingIssue(App, error, {
      where: 'roomWallPicking',
      op: 'projectWorldPointToLocal',
      throttleMs: 1000,
    });
    return null;
  }
  const x = finiteNumber(pointLocal.x);
  const y = finiteNumber(pointLocal.y);
  const z = finiteNumber(pointLocal.z);
  return x == null || y == null || z == null ? null : { x, y, z };
}

export function findRoomWallSurfaceHit(args: {
  App: AppContainer;
  ndcX: number;
  ndcY: number;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  camera?: unknown;
}): RoomWallSurfaceHit | null {
  const camera = args.camera || getViewportCamera(args.App);
  const roomGroup = __wp_asRecord(getViewportRoomGroup(args.App));
  const getObjectByName = roomGroup?.getObjectByName;
  const architecture =
    typeof getObjectByName === 'function'
      ? __wp_asRecord(Reflect.apply(getObjectByName, roomGroup, ['wpRoomArchitecture']))
      : null;
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
        where: 'roomWallPicking',
        op: `surfaceHit.${failure.phase}`,
        throttleMs: 1000,
      });
    },
  });
  for (const hit of hits) {
    const surface = readRoomWallSurfacePickMeta(hit.object);
    if (!surface) continue;
    const point = projectRoomWorldPointToLocal(args.App, hit.point);
    if (point) {
      const distance = finiteNumber((hit as RaycastHitLike & { distance?: unknown }).distance);
      return { surface, point, distance };
    }
  }
  return null;
}
