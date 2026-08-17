import type { AppContainer, ThreeLike, UnknownRecord } from '../../../types/index.js';

import { __getRoomGroupNode } from './room_shared_state.js';
import {
  axisAlignedBoxToCenterSize,
  resolveRoomArchitectureGeometry,
  resolveRoomOpeningGeometry,
  resolveRoomWallSurface,
  subtractAxisAlignedBox,
  type AxisAlignedBox,
  type ResolvedRoomOpeningGeometry,
  type RoomArchitectureGeometry,
} from './room_architecture_geometry.js';
import type { RoomWallId } from '../../../types/index.js';

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
  userData?: UnknownRecord;
  materialParams?: UnknownRecord;
}): void {
  const mesh = new args.MeshCtor(
    new args.BoxGeometryCtor(args.box.width, args.box.height, args.box.depth),
    new args.MaterialCtor({
      color: args.color,
      roughness: 0.96,
      metalness: 0,
      ...args.materialParams,
    })
  );
  const pos = asRecord(mesh.position);
  if (typeof pos?.set === 'function') {
    pos.set(args.box.centerX, args.box.centerY, args.box.centerZ);
  }
  mesh.name = args.name;
  mesh.castShadow = args.castShadow === true;
  mesh.receiveShadow = true;
  mesh.userData = { __kind: args.kind, ignorePicking: true, ...args.userData };
  if (typeof args.group.add === 'function') args.group.add(mesh);
}

type ArchitectureBoxFactoryArgs = {
  group: UnknownRecord;
  BoxGeometryCtor: new (w: number, h: number, d: number) => unknown;
  MaterialCtor: new (params: UnknownRecord) => unknown;
  MeshCtor: new (geometry: unknown, material: unknown) => UnknownRecord;
};

function addAxisAlignedArchitectureBox(
  factory: ArchitectureBoxFactoryArgs,
  box: AxisAlignedBox,
  args: {
    name: string;
    kind: string;
    color: string;
    castShadow?: boolean;
    userData?: UnknownRecord;
    materialParams?: UnknownRecord;
  }
): void {
  addArchitectureBox({
    ...factory,
    box: (() => {
      const sized = axisAlignedBoxToCenterSize(box);
      return {
        width: sized.width,
        height: sized.height,
        depth: sized.depth,
        centerX: sized.x,
        centerY: sized.y,
        centerZ: sized.z,
      };
    })(),
    ...args,
  });
}

function wallKind(wall: RoomWallId): string {
  return wall === 'back' ? 'room_back_wall' : wall === 'left' ? 'room_left_wall' : 'room_right_wall';
}

function wallName(wall: RoomWallId): string {
  return wall === 'back' ? 'wpBackWall' : wall === 'left' ? 'wpLeftWall' : 'wpRightWall';
}

function resolveWallBox(geometry: RoomArchitectureGeometry, wall: RoomWallId): AxisAlignedBox | null {
  if (wall === 'back') return geometry.wall;
  return wall === 'left' ? geometry.leftWall : geometry.rightWall;
}

function wallSurfaceUserData(geometry: RoomArchitectureGeometry, wall: RoomWallId): UnknownRecord {
  const surface = resolveRoomWallSurface(geometry, wall);
  if (!surface) return { roomWallId: wall, __wpRoomWallSurface: true };
  return {
    roomWallId: wall,
    __wpRoomWallSurface: true,
    roomWallAxis: surface.axis,
    roomWallStartCoord: surface.startCoord,
    roomWallUsableLength: surface.usableLength,
    roomWallHeight: surface.height,
    roomWallInteriorFaceCoord: surface.interiorFaceCoord,
    roomWallInwardNormalX: surface.inwardNormalX,
    roomWallInwardNormalZ: surface.inwardNormalZ,
  };
}

function addWallWithOpenings(args: {
  factory: ArchitectureBoxFactoryArgs;
  geometry: RoomArchitectureGeometry;
  wall: RoomWallId;
  color: string;
  castShadow?: boolean;
  openings: ResolvedRoomOpeningGeometry[];
}): void {
  const source = resolveWallBox(args.geometry, args.wall);
  if (!source) return;
  const wallOpenings = args.openings.filter(entry => entry.opening.wall === args.wall);
  if (!wallOpenings.length) {
    addAxisAlignedArchitectureBox(args.factory, source, {
      name: wallName(args.wall),
      kind: wallKind(args.wall),
      color: args.color,
      castShadow: args.castShadow,
      userData: wallSurfaceUserData(args.geometry, args.wall),
    });
    return;
  }

  let pieces: AxisAlignedBox[] = [source];
  for (const opening of wallOpenings) {
    const next: AxisAlignedBox[] = [];
    for (const piece of pieces) next.push(...subtractAxisAlignedBox(piece, opening.cut));
    pieces = next;
  }
  for (let i = 0; i < pieces.length; i += 1) {
    addAxisAlignedArchitectureBox(args.factory, pieces[i], {
      name: `${wallName(args.wall)}_piece_${i}`,
      kind: wallKind(args.wall),
      color: args.color,
      castShadow: args.castShadow,
      userData: wallSurfaceUserData(args.geometry, args.wall),
    });
  }
}

function openingVisualBox(args: {
  resolved: ResolvedRoomOpeningGeometry;
  alongCenter: number;
  alongSize: number;
  yCenter: number;
  ySize: number;
  normalSize: number;
  normalOffset: number;
}): AxisAlignedBox {
  const { resolved } = args;
  const surface = resolved.surface;
  if (surface.axis === 'x') {
    const zCenter = surface.interiorFaceCoord + surface.inwardNormalZ * args.normalOffset;
    return {
      minX: args.alongCenter - args.alongSize / 2,
      maxX: args.alongCenter + args.alongSize / 2,
      minY: args.yCenter - args.ySize / 2,
      maxY: args.yCenter + args.ySize / 2,
      minZ: zCenter - args.normalSize / 2,
      maxZ: zCenter + args.normalSize / 2,
    };
  }
  const xCenter = surface.interiorFaceCoord + surface.inwardNormalX * args.normalOffset;
  return {
    minX: xCenter - args.normalSize / 2,
    maxX: xCenter + args.normalSize / 2,
    minY: args.yCenter - args.ySize / 2,
    maxY: args.yCenter + args.ySize / 2,
    minZ: args.alongCenter - args.alongSize / 2,
    maxZ: args.alongCenter + args.alongSize / 2,
  };
}

function addOpeningVisuals(args: {
  factory: ArchitectureBoxFactoryArgs;
  resolved: ResolvedRoomOpeningGeometry;
}): void {
  const { factory, resolved } = args;
  const frame = 0.045;
  const frameDepth = 0.055;
  const visualOffset = frameDepth / 2 + 0.004;
  const alongCenter = resolved.surface.axis === 'x' ? resolved.centerX : resolved.centerZ;
  const bottom = resolved.bottom;
  const top = bottom + resolved.height;
  const centerY = resolved.centerY;
  const frameColor = resolved.opening.kind === 'window' ? '#f8fafc' : '#f3eee5';
  const openingData = {
    roomOpeningId: resolved.opening.id,
    roomWallId: resolved.opening.wall,
    roomOpeningKind: resolved.opening.kind,
  };
  const addPart = (
    suffix: string,
    along: number,
    alongSize: number,
    y: number,
    ySize: number,
    normalSize = frameDepth,
    normalOffset = visualOffset,
    color = frameColor,
    materialParams?: UnknownRecord
  ) => {
    addAxisAlignedArchitectureBox(
      factory,
      openingVisualBox({
        resolved,
        alongCenter: along,
        alongSize,
        yCenter: y,
        ySize,
        normalSize,
        normalOffset,
      }),
      {
        name: `wpRoomOpening_${resolved.opening.id}_${suffix}`,
        kind: 'room_opening_visual',
        color,
        castShadow: true,
        userData: openingData,
        materialParams,
      }
    );
  };

  const outerFrameWidth = resolved.width + frame * 2;
  addPart('frameStart', alongCenter - resolved.width / 2 - frame / 2, frame, centerY, resolved.height);
  addPart('frameEnd', alongCenter + resolved.width / 2 + frame / 2, frame, centerY, resolved.height);
  addPart('frameTop', alongCenter, outerFrameWidth, top + frame / 2, frame);

  if (resolved.opening.kind === 'window') {
    addPart('frameBottom', alongCenter, outerFrameWidth, bottom - frame / 2, frame);
    addPart(
      'glass',
      alongCenter,
      Math.max(0.02, resolved.width - frame * 1.3),
      centerY,
      Math.max(0.02, resolved.height - frame * 1.3),
      0.012,
      0.018,
      '#dbeafe',
      { transparent: true, opacity: 0.42, roughness: 0.18, metalness: 0.05 }
    );
    addPart('mullionV', alongCenter, frame * 0.55, centerY, Math.max(frame, resolved.height - frame));
    addPart('mullionH', alongCenter, Math.max(frame, resolved.width - frame), centerY, frame * 0.55);
    return;
  }

  const leafWidth = Math.max(0.08, resolved.width - frame * 1.5);
  const leafHeight = Math.max(0.08, resolved.height - frame * 0.7);
  addPart('doorLeaf', alongCenter, leafWidth, bottom + leafHeight / 2, leafHeight, 0.035, 0.012, '#b98255', {
    roughness: 0.72,
  });
  addPart(
    'doorPanel',
    alongCenter,
    Math.max(0.05, leafWidth * 0.72),
    bottom + leafHeight * 0.54,
    Math.max(0.08, leafHeight * 0.56),
    0.012,
    0.036,
    '#c99668',
    { roughness: 0.76 }
  );
  const handleAlong = alongCenter + leafWidth * 0.34;
  addPart(
    'doorHandle',
    handleAlong,
    0.025,
    bottom + Math.min(1.02, leafHeight * 0.48),
    0.025,
    0.055,
    0.07,
    '#c0c5cb',
    {
      roughness: 0.38,
      metalness: 0.72,
    }
  );
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
  const openings = (Array.isArray(geometry.config.openings) ? geometry.config.openings : [])
    .map(opening => resolveRoomOpeningGeometry(geometry, opening))
    .filter((entry): entry is ResolvedRoomOpeningGeometry => entry != null);

  const factory = { group, BoxGeometryCtor, MaterialCtor, MeshCtor };

  addWallWithOpenings({ factory, geometry, wall: 'back', color: wallColor, openings });

  if (geometry.leftWall) {
    addWallWithOpenings({ factory, geometry, wall: 'left', color: wallColor, castShadow: true, openings });
  }

  if (geometry.rightWall) {
    addWallWithOpenings({ factory, geometry, wall: 'right', color: wallColor, castShadow: true, openings });
  }

  for (const opening of openings) addOpeningVisuals({ factory, resolved: opening });

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
