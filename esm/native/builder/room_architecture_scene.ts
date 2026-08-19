import type {
  AppContainer,
  AxisAlignedBox,
  ResolvedRoomOpeningGeometry,
  RoomArchitecturePlan,
  RoomWallId,
  ThreeLike,
  UnknownRecord,
} from '../../../types/index.js';

import { __getRoomGroupNode } from './room_shared_state.js';
import { axisAlignedBoxToCenterSize, buildRoomWallOpeningMeshData } from './room_architecture_geometry.js';

export const ROOM_ARCHITECTURE_GROUP_NAME = 'wpRoomArchitecture';

const ROOM_MEASUREMENT_PROXY_DEPTH_M = 0.004;
const ROOM_MEASUREMENT_WALL_OFFSET_M = 0.006;
const ROOM_MEASUREMENT_OPENING_OFFSET_M = 0.018;

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
}): UnknownRecord {
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
  return mesh;
}

type ArchitectureBoxFactoryArgs = {
  group: UnknownRecord;
  BoxGeometryCtor: new (w: number, h: number, d: number) => unknown;
  MaterialCtor: new (params: UnknownRecord) => unknown;
  MeshCtor: new (geometry: unknown, material: unknown) => UnknownRecord;
};

type ArchitectureWallFactoryArgs = ArchitectureBoxFactoryArgs & {
  BufferGeometryCtor?: new () => unknown;
  Float32BufferAttributeCtor?: new (values: number[], itemSize: number) => unknown;
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
): UnknownRecord {
  return addArchitectureBox({
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

function resolveWallBox(plan: RoomArchitecturePlan, wall: RoomWallId): AxisAlignedBox | null {
  if (wall === 'back') return plan.wall;
  return wall === 'left' ? plan.leftWall : plan.rightWall;
}

function wallSurfaceUserData(plan: RoomArchitecturePlan, wall: RoomWallId): UnknownRecord {
  const surface = plan.wallSurfaces[wall];
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

function roomWallPartLabel(wall: RoomWallId): string {
  if (wall === 'back') return 'קיר אחורי';
  return wall === 'left' ? 'קיר שמאלי' : 'קיר ימני';
}

function roomMeasurementTargetData(args: {
  partId: string;
  partLabel: string;
  uAxis: 'x' | 'z';
  uLength: number;
  height: number;
  normalX: -1 | 0 | 1;
  normalZ: -1 | 0 | 1;
  roomOpeningId?: string;
  roomOpeningKind?: string;
}): UnknownRecord {
  return {
    __wpRoomMeasurementTarget: true,
    __wpRoomMeasurementUAxis: args.uAxis,
    __wpRoomMeasurementULength: args.uLength,
    __wpRoomMeasurementHeight: args.height,
    __wpRoomMeasurementThickness: ROOM_MEASUREMENT_PROXY_DEPTH_M,
    __wpRoomMeasurementUX: args.uAxis === 'x' ? 1 : 0,
    __wpRoomMeasurementUZ: args.uAxis === 'z' ? 1 : 0,
    __wpRoomMeasurementNormalX: args.normalX,
    __wpRoomMeasurementNormalZ: args.normalZ,
    __wpRoomMeasurementBaseNormalX: args.normalX,
    __wpRoomMeasurementBaseNormalZ: args.normalZ,
    partId: args.partId,
    partLabel: args.partLabel,
    ...(args.roomOpeningId ? { roomOpeningId: args.roomOpeningId } : {}),
    ...(args.roomOpeningKind ? { roomOpeningKind: args.roomOpeningKind } : {}),
  };
}

function addWallMeasurementTarget(args: {
  factory: ArchitectureBoxFactoryArgs;
  geometry: RoomArchitecturePlan;
  wall: RoomWallId;
}): void {
  const surface = args.geometry.wallSurfaces[args.wall];
  if (!surface) return;
  const alongCenter = surface.startCoord + surface.usableLength / 2;
  const normalOffset = ROOM_MEASUREMENT_WALL_OFFSET_M;
  const centerX =
    surface.axis === 'x' ? alongCenter : surface.interiorFaceCoord + surface.inwardNormalX * normalOffset;
  const centerZ =
    surface.axis === 'z' ? alongCenter : surface.interiorFaceCoord + surface.inwardNormalZ * normalOffset;
  addArchitectureBox({
    ...args.factory,
    box: {
      width: surface.axis === 'x' ? surface.usableLength : ROOM_MEASUREMENT_PROXY_DEPTH_M,
      height: surface.height,
      depth: surface.axis === 'z' ? surface.usableLength : ROOM_MEASUREMENT_PROXY_DEPTH_M,
      centerX,
      centerY: surface.height / 2,
      centerZ,
    },
    name: `wpRoomMeasurementWall_${args.wall}`,
    kind: 'room_measurement_target',
    color: '#ffffff',
    userData: roomMeasurementTargetData({
      partId: `room_wall_${args.wall}`,
      partLabel: roomWallPartLabel(args.wall),
      uAxis: surface.axis,
      uLength: surface.usableLength,
      height: surface.height,
      normalX: surface.inwardNormalX,
      normalZ: surface.inwardNormalZ,
    }),
    materialParams: { transparent: true, opacity: 0, depthWrite: false, colorWrite: false },
  });
}

function addWallWithOpenings(args: {
  factory: ArchitectureWallFactoryArgs;
  geometry: RoomArchitecturePlan;
  wall: RoomWallId;
  color: string;
  castShadow?: boolean;
  openings: readonly ResolvedRoomOpeningGeometry[];
}): void {
  const source = resolveWallBox(args.geometry, args.wall);
  if (!source) return;
  const wallOpenings = args.openings.filter(entry => entry.opening.wall === args.wall);
  if (!wallOpenings.length) {
    addAxisAlignedArchitectureBox(args.factory, source, {
      name: wallName(args.wall),
      kind: wallKind(args.wall),
      color: args.color,
      ...(args.castShadow === undefined ? {} : { castShadow: args.castShadow }),
      userData: wallSurfaceUserData(args.geometry, args.wall),
    });
    return;
  }

  const surface = args.geometry.wallSurfaces[args.wall];
  if (!surface) return;
  const BufferGeometryCtor = args.factory.BufferGeometryCtor;
  const Float32BufferAttributeCtor = args.factory.Float32BufferAttributeCtor;
  if (!BufferGeometryCtor || !Float32BufferAttributeCtor) return;
  const meshData = buildRoomWallOpeningMeshData(
    source,
    wallOpenings.map(opening => opening.cut),
    surface.axis
  );
  const geometry = new BufferGeometryCtor();
  const geometryRecord = asRecord(geometry);
  if (typeof geometryRecord?.setAttribute !== 'function') return;
  geometryRecord.setAttribute('position', new Float32BufferAttributeCtor(meshData.positions, 3));
  geometryRecord.setAttribute('normal', new Float32BufferAttributeCtor(meshData.normals, 3));
  if (typeof geometryRecord.computeBoundingBox === 'function') geometryRecord.computeBoundingBox();
  if (typeof geometryRecord.computeBoundingSphere === 'function') geometryRecord.computeBoundingSphere();

  const mesh = new args.factory.MeshCtor(
    geometry,
    new args.factory.MaterialCtor({ color: args.color, roughness: 0.96, metalness: 0 })
  );
  mesh.name = wallName(args.wall);
  mesh.castShadow = args.castShadow === true;
  mesh.receiveShadow = true;
  mesh.userData = {
    __kind: wallKind(args.wall),
    ignorePicking: true,
    ...wallSurfaceUserData(args.geometry, args.wall),
  };
  if (typeof args.factory.group.add === 'function') args.factory.group.add(mesh);
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
    materialParams?: UnknownRecord,
    extraUserData?: UnknownRecord
  ): UnknownRecord => {
    return addAxisAlignedArchitectureBox(
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
        userData: { ...openingData, ...extraUserData },
        ...(materialParams === undefined ? {} : { materialParams }),
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
      Math.max(0.02, resolved.width),
      centerY,
      Math.max(0.02, resolved.height),
      0.012,
      0.018,
      '#dbeafe',
      { transparent: true, opacity: 0.42, roughness: 0.18, metalness: 0.05 }
    );
    addPart('mullionV', alongCenter, frame * 0.55, centerY, resolved.height);
    addPart(
      'measurementTarget',
      alongCenter,
      resolved.width,
      centerY,
      resolved.height,
      ROOM_MEASUREMENT_PROXY_DEPTH_M,
      ROOM_MEASUREMENT_OPENING_OFFSET_M,
      '#ffffff',
      { transparent: true, opacity: 0, depthWrite: false, colorWrite: false },
      roomMeasurementTargetData({
        partId: `room_window_${resolved.opening.id}`,
        partLabel: 'חלון',
        uAxis: resolved.surface.axis,
        uLength: resolved.width,
        height: resolved.height,
        normalX: resolved.surface.inwardNormalX,
        normalZ: resolved.surface.inwardNormalZ,
        roomOpeningId: resolved.opening.id,
        roomOpeningKind: 'window',
      })
    );
    return;
  }

  const doorReveal = 0.004;
  const leafWidth = Math.max(0.08, resolved.width - doorReveal * 2);
  const leafHeight = Math.max(0.08, resolved.height - doorReveal);
  const openingStartAlong = resolved.surface.startCoord + resolved.offsetAlong;
  const hingeAlong = openingStartAlong + doorReveal;
  const hingeNormalOffset = 0.012;
  const hingeX =
    resolved.surface.axis === 'x'
      ? hingeAlong
      : resolved.surface.interiorFaceCoord + resolved.surface.inwardNormalX * hingeNormalOffset;
  const hingeZ =
    resolved.surface.axis === 'z'
      ? hingeAlong
      : resolved.surface.interiorFaceCoord + resolved.surface.inwardNormalZ * hingeNormalOffset;
  const doorDirectionX = resolved.surface.axis === 'x' ? 1 : 0;
  const doorDirectionZ = resolved.surface.axis === 'z' ? 1 : 0;
  const targetAngleSign =
    doorDirectionZ * resolved.surface.inwardNormalX - doorDirectionX * resolved.surface.inwardNormalZ >= 0
      ? 1
      : -1;
  const movableData = {
    __wpRoomDoorMovable: true,
    __wpRoomDoorHingeX: hingeX,
    __wpRoomDoorHingeZ: hingeZ,
    __wpRoomDoorLeafWidth: leafWidth,
    __wpRoomDoorLeafHeight: leafHeight,
    __wpRoomDoorBottom: bottom,
    __wpRoomDoorDirectionX: doorDirectionX,
    __wpRoomDoorDirectionZ: doorDirectionZ,
    __wpRoomDoorTargetAngleSign: targetAngleSign,
  };
  const tagMovable = (mesh: UnknownRecord): UnknownRecord => {
    const position = asRecord(mesh.position);
    mesh.userData = {
      ...asRecord(mesh.userData),
      ...movableData,
      __wpRoomDoorClosedX: Number(position?.x) || 0,
      __wpRoomDoorClosedZ: Number(position?.z) || 0,
      __wpRoomDoorClosedRotationY: Number(asRecord(mesh.rotation)?.y) || 0,
      __wpRoomDoorCurrentAngleRad: 0,
    };
    return mesh;
  };

  tagMovable(
    addPart(
      'doorLeaf',
      alongCenter,
      leafWidth,
      bottom + leafHeight / 2,
      leafHeight,
      0.035,
      0.012,
      '#b98255',
      { roughness: 0.72 },
      { partLabel: 'דלת' }
    )
  );
  tagMovable(
    addPart(
      'doorPanel',
      alongCenter,
      Math.max(0.05, leafWidth * 0.72),
      bottom + leafHeight * 0.54,
      Math.max(0.08, leafHeight * 0.56),
      0.012,
      0.036,
      '#c99668',
      { roughness: 0.76 },
      { partLabel: 'דלת' }
    )
  );
  const handleAlong = alongCenter + leafWidth * 0.34;
  tagMovable(
    addPart(
      'doorHandle',
      handleAlong,
      0.025,
      bottom + Math.min(1.02, leafHeight * 0.48),
      0.025,
      0.055,
      0.07,
      '#c0c5cb',
      { roughness: 0.38, metalness: 0.72 },
      { partLabel: 'ידית דלת' }
    )
  );

  const measurementProxy = tagMovable(
    addPart(
      'measurementTarget',
      alongCenter,
      leafWidth,
      bottom + leafHeight / 2,
      leafHeight,
      ROOM_MEASUREMENT_PROXY_DEPTH_M,
      ROOM_MEASUREMENT_OPENING_OFFSET_M,
      '#ffffff',
      { transparent: true, opacity: 0, depthWrite: false, colorWrite: false },
      roomMeasurementTargetData({
        partId: `room_door_${resolved.opening.id}`,
        partLabel: 'דלת',
        uAxis: resolved.surface.axis,
        uLength: leafWidth,
        height: leafHeight,
        normalX: resolved.surface.inwardNormalX,
        normalZ: resolved.surface.inwardNormalZ,
        roomOpeningId: resolved.opening.id,
        roomOpeningKind: 'door',
      })
    )
  );
  const proxyUserData = asRecord(measurementProxy.userData);
  if (proxyUserData) {
    proxyUserData.__wpRoomMeasurementBaseUX = doorDirectionX;
    proxyUserData.__wpRoomMeasurementBaseUZ = doorDirectionZ;
  }
}

export function refreshRoomArchitectureScene(
  App: AppContainer,
  THREE: ThreeLike,
  plan: RoomArchitecturePlan
): boolean {
  const roomGroup = asRecord(__getRoomGroupNode(App));
  if (!roomGroup) return false;
  removeExistingArchitecture(roomGroup);

  const geometry = plan;
  if (!geometry.config.backWall.enabled) return true;

  const T = asRecord(THREE);
  const GroupCtor = T?.Group as (new () => UnknownRecord) | undefined;
  const BoxGeometryCtor = T?.BoxGeometry as (new (w: number, h: number, d: number) => unknown) | undefined;
  const BufferGeometryCtor = T?.BufferGeometry as (new () => unknown) | undefined;
  const Float32BufferAttributeCtor = T?.Float32BufferAttribute as
    (new (values: number[], itemSize: number) => unknown) | undefined;
  const MaterialCtor = T?.MeshStandardMaterial as (new (params: UnknownRecord) => unknown) | undefined;
  const MeshCtor = T?.Mesh as (new (geometry: unknown, material: unknown) => UnknownRecord) | undefined;
  if (!GroupCtor || !BoxGeometryCtor || !MaterialCtor || !MeshCtor) return false;

  const group = new GroupCtor();
  group.name = ROOM_ARCHITECTURE_GROUP_NAME;
  group.visible = !geometry.config.surfacesHidden;
  group.userData = { __kind: 'room_architecture', ignorePicking: true };

  const wallColor = geometry.config.wallColor;
  const openings: readonly ResolvedRoomOpeningGeometry[] = plan.resolvedOpenings;
  if (openings.length && (!BufferGeometryCtor || !Float32BufferAttributeCtor)) return false;

  const factory: ArchitectureWallFactoryArgs = {
    group,
    BoxGeometryCtor,
    MaterialCtor,
    MeshCtor,
    ...(BufferGeometryCtor ? { BufferGeometryCtor } : {}),
    ...(Float32BufferAttributeCtor ? { Float32BufferAttributeCtor } : {}),
  };

  addWallWithOpenings({ factory, geometry, wall: 'back', color: wallColor, openings });

  if (geometry.leftWall) {
    addWallWithOpenings({ factory, geometry, wall: 'left', color: wallColor, castShadow: true, openings });
  }

  if (geometry.rightWall) {
    addWallWithOpenings({ factory, geometry, wall: 'right', color: wallColor, castShadow: true, openings });
  }

  addWallMeasurementTarget({ factory, geometry, wall: 'back' });
  if (geometry.leftWall) addWallMeasurementTarget({ factory, geometry, wall: 'left' });
  if (geometry.rightWall) addWallMeasurementTarget({ factory, geometry, wall: 'right' });

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
