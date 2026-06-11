import type { Object3DLike, ThreeLike } from '../../../types/index.js';

import {
  _asObject,
  _asRecord,
  _readCtor,
  __asMeshLikeWithSet,
  type AnyObj,
  type MeshLike,
  type ObjectByNameLike,
} from './room_internal_shared.js';

type RoomGroupLike = Object3DLike & ObjectByNameLike;

export type RoomScenePrimitives = {
  roomGroup: RoomGroupLike;
  floorMesh: MeshLike;
  roomWalls: ReturnType<typeof __asMeshLikeWithSet>;
};

export function createRoomScenePrimitives(T: ThreeLike): RoomScenePrimitives | null {
  const Tr = _asRecord(T);
  const GroupCtor = _readCtor<[], unknown>(Tr, 'Group');
  const PlaneGeometryCtor = _readCtor<[number, number], unknown>(Tr, 'PlaneGeometry');
  const MeshStandardMaterialCtor = _readCtor<[AnyObj], AnyObj>(Tr, 'MeshStandardMaterial');
  const MeshCtor = _readCtor<[unknown, unknown], MeshLike>(Tr, 'Mesh');
  const BoxGeometryCtor = _readCtor<[number, number, number], unknown>(Tr, 'BoxGeometry');
  const MeshBasicMaterialCtor = _readCtor<[AnyObj], AnyObj>(Tr, 'MeshBasicMaterial');
  if (
    !GroupCtor ||
    !PlaneGeometryCtor ||
    !MeshStandardMaterialCtor ||
    !MeshCtor ||
    !BoxGeometryCtor ||
    !MeshBasicMaterialCtor
  )
    return null;

  const roomGroup = _asObject<RoomGroupLike>(new GroupCtor());
  if (!roomGroup) return null;

  const floorGeo = new PlaneGeometryCtor(20, 20);
  const floorMat = new MeshStandardMaterialCtor({
    color: 0xffffff,
    // Keep the procedural floor readable across tone-mapping changes in newer three.js.
    // Higher roughness reduces specular "glare" that can wash out tile lines.
    roughness: 0.9,
    metalness: 0.0,
  });
  const floorMesh = new MeshCtor(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.002;
  floorMesh.receiveShadow = true;
  floorMesh.name = 'smartFloor';
  roomGroup.add?.(floorMesh);

  const wallsGeo = new BoxGeometryCtor(60, 30, 60);
  const wallsMat = new MeshBasicMaterialCtor({
    color: 0xeaeaea,
    side: Tr.BackSide,
  });
  const roomWalls = __asMeshLikeWithSet(new MeshCtor(wallsGeo, wallsMat));
  if (!roomWalls) return null;
  roomWalls.position.set(0, 15, 0);
  roomWalls.name = 'roomWalls';
  roomGroup.add?.(roomWalls);

  return { roomGroup, floorMesh, roomWalls };
}
