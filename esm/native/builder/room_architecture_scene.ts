import type { AppContainer, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { __getRoomGroupNode } from './room_shared_state.js';
import { resolveRoomArchitectureGeometry } from './room_architecture_geometry.js';

export const ROOM_ARCHITECTURE_GROUP_NAME = 'wpRoomArchitecture';
const ROOM_BACK_WALL_MATERIAL_COLOR = 0xf2efe6;
const ROOM_COLUMN_MATERIAL_COLOR = 0xe6e1d5;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function disposeNode(node: unknown): void {
  const rec = asRecord(node);
  if (!rec) return;
  const children = Array.isArray(rec.children) ? rec.children : [];
  for (const child of children) disposeNode(child);
  const geometry = asRecord(rec.geometry);
  if (typeof geometry?.dispose === 'function') geometry.dispose();
  const material = rec.material;
  const mats = Array.isArray(material) ? material : [material];
  for (const entry of mats) {
    const mat = asRecord(entry);
    if (typeof mat?.dispose === 'function') mat.dispose();
  }
}

function removeExistingArchitecture(roomGroup: UnknownRecord): void {
  const getObjectByName = roomGroup.getObjectByName;
  const remove = roomGroup.remove;
  if (typeof getObjectByName !== 'function' || typeof remove !== 'function') return;
  const existing = getObjectByName.call(roomGroup, ROOM_ARCHITECTURE_GROUP_NAME);
  if (!existing) return;
  remove.call(roomGroup, existing);
  disposeNode(existing);
}

export function refreshRoomArchitectureScene(App: AppContainer, THREE: ThreeLike): boolean {
  const roomGroup = asRecord(__getRoomGroupNode(App));
  if (!roomGroup) return false;
  removeExistingArchitecture(roomGroup);

  const geometry = resolveRoomArchitectureGeometry(App);
  if (!geometry.config.backWall.enabled) return true;

  const T = asRecord(THREE);
  const GroupCtor = T?.Group as (new () => UnknownRecord) | undefined;
  const BoxGeometryCtor = T?.BoxGeometry as (new (w: number, h: number, d: number) => unknown) | undefined;
  const MaterialCtor = T?.MeshStandardMaterial as (new (params: UnknownRecord) => unknown) | undefined;
  const MeshCtor = T?.Mesh as (new (geometry: unknown, material: unknown) => UnknownRecord) | undefined;
  if (!GroupCtor || !BoxGeometryCtor || !MaterialCtor || !MeshCtor) return false;

  const group = new GroupCtor();
  group.name = ROOM_ARCHITECTURE_GROUP_NAME;
  group.visible = !geometry.config.surfacesHidden;
  group.userData = { __kind: 'room_architecture', ignorePicking: true };

  const wall = geometry.wall;
  const wallMesh = new MeshCtor(
    new BoxGeometryCtor(wall.width, wall.height, wall.depth),
    new MaterialCtor({ color: ROOM_BACK_WALL_MATERIAL_COLOR, roughness: 0.96, metalness: 0 })
  );
  const wallPos = asRecord(wallMesh.position);
  if (typeof wallPos?.set === 'function') wallPos.set(wall.centerX, wall.centerY, wall.centerZ);
  wallMesh.name = 'wpBackWall';
  wallMesh.receiveShadow = true;
  wallMesh.userData = { __kind: 'room_back_wall', ignorePicking: true };
  if (typeof group.add === 'function') group.add(wallMesh);

  if (geometry.column) {
    const column = geometry.column;
    const columnMesh = new MeshCtor(
      new BoxGeometryCtor(column.width, column.height, column.depth),
      new MaterialCtor({ color: ROOM_COLUMN_MATERIAL_COLOR, roughness: 0.98, metalness: 0 })
    );
    const columnPos = asRecord(columnMesh.position);
    if (typeof columnPos?.set === 'function') {
      columnPos.set(column.centerX, column.centerY, column.centerZ);
    }
    columnMesh.name = 'wpWallColumn';
    columnMesh.castShadow = true;
    columnMesh.receiveShadow = true;
    columnMesh.userData = { __kind: 'room_column', ignorePicking: true };
    if (typeof group.add === 'function') group.add(columnMesh);
  }

  if (typeof roomGroup.add === 'function') roomGroup.add(group);
  return true;
}
