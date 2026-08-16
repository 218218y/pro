import type { AppContainer, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { __getRoomGroupNode } from './room_shared_state.js';
import { resolveRoomArchitectureGeometry } from './room_architecture_geometry.js';

export const ROOM_ARCHITECTURE_GROUP_NAME = 'wpRoomArchitecture';

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

function addArchitectureBox(args: {
  group: UnknownRecord;
  BoxGeometryCtor: new (w: number, h: number, d: number) => unknown;
  MaterialCtor: new (params: UnknownRecord) => unknown;
  MeshCtor: new (geometry: unknown, material: unknown) => UnknownRecord;
  box: {
    width: number;
    height: number;
    depth: number;
    centerX: number;
    centerY: number;
    centerZ: number;
  };
  name: string;
  kind: string;
  color: string;
  castShadow?: boolean;
}): void {
  const mesh = new args.MeshCtor(
    new args.BoxGeometryCtor(args.box.width, args.box.height, args.box.depth),
    new args.MaterialCtor({ color: args.color, roughness: 0.96, metalness: 0 })
  );
  const pos = asRecord(mesh.position);
  if (typeof pos?.set === 'function') {
    pos.set(args.box.centerX, args.box.centerY, args.box.centerZ);
  }
  mesh.name = args.name;
  mesh.castShadow = args.castShadow === true;
  mesh.receiveShadow = true;
  mesh.userData = { __kind: args.kind, ignorePicking: true };
  if (typeof args.group.add === 'function') args.group.add(mesh);
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

  const wallColor = geometry.config.wallColor;

  addArchitectureBox({
    group,
    BoxGeometryCtor,
    MaterialCtor,
    MeshCtor,
    box: geometry.wall,
    name: 'wpBackWall',
    kind: 'room_back_wall',
    color: wallColor,
  });

  if (geometry.leftWall) {
    addArchitectureBox({
      group,
      BoxGeometryCtor,
      MaterialCtor,
      MeshCtor,
      box: geometry.leftWall,
      name: 'wpLeftWall',
      kind: 'room_left_wall',
      color: wallColor,
      castShadow: true,
    });
  }

  if (geometry.rightWall) {
    addArchitectureBox({
      group,
      BoxGeometryCtor,
      MaterialCtor,
      MeshCtor,
      box: geometry.rightWall,
      name: 'wpRightWall',
      kind: 'room_right_wall',
      color: wallColor,
      castShadow: true,
    });
  }

  if (geometry.column) {
    addArchitectureBox({
      group,
      BoxGeometryCtor,
      MaterialCtor,
      MeshCtor,
      box: geometry.column,
      name: 'wpWallColumn',
      kind: 'room_column',
      color: wallColor,
      castShadow: true,
    });
  }

  if (typeof roomGroup.add === 'function') roomGroup.add(group);
  return true;
}
