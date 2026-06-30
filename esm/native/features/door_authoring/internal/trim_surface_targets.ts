import type { UnknownRecord } from '../../../../../types';

export const CABINET_BODY_DOOR_TRIM_SURFACE_PARTS = Object.freeze([
  'body_left',
  'body_right',
  'body_ceil',
  'lower_body_left',
  'lower_body_right',
  'lower_body_ceil',
  'chest_left',
  'chest_right',
  'chest_ceil',
]);

export type DoorTrimSurfacePlane = 'xy' | 'yz' | 'xz';

export type DoorTrimSurfaceInfo = {
  plane: DoorTrimSurfacePlane;
  faceSign: 1 | -1;
  faceCoord: number;
  doorWidth: number;
  doorHeight: number;
  rectMinX: number;
  rectMaxX: number;
  rectMinY: number;
  rectMaxY: number;
};

type BoardDimensionsLike = {
  width?: unknown;
  height?: unknown;
  depth?: unknown;
};

function readFinite(value: unknown, defaultValue = NaN): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function readPositive(value: unknown): number | null {
  const n = readFinite(value);
  return n > 0 ? n : null;
}

function normalizePartId(partId: unknown): string {
  return typeof partId === 'string' ? partId : String(partId ?? '');
}

export function isCabinetBodyDoorTrimSurfacePartId(partId: unknown): boolean {
  const pid = normalizePartId(partId);
  return CABINET_BODY_DOOR_TRIM_SURFACE_PARTS.includes(pid);
}

export function resolveCabinetBodyDoorTrimSurfaceInfo(
  partId: unknown,
  dimensions: BoardDimensionsLike | null | undefined
): DoorTrimSurfaceInfo | null {
  const pid = normalizePartId(partId);
  if (!isCabinetBodyDoorTrimSurfacePartId(pid)) return null;

  const width = readPositive(dimensions?.width);
  const height = readPositive(dimensions?.height);
  const depth = readPositive(dimensions?.depth);
  if (width == null || height == null || depth == null) return null;

  if (pid.endsWith('_left') || pid === 'body_left' || pid === 'chest_left') {
    return {
      plane: 'yz',
      faceSign: -1,
      faceCoord: -width / 2,
      doorWidth: depth,
      doorHeight: height,
      rectMinX: -depth / 2,
      rectMaxX: depth / 2,
      rectMinY: -height / 2,
      rectMaxY: height / 2,
    };
  }

  if (pid.endsWith('_right') || pid === 'body_right' || pid === 'chest_right') {
    return {
      plane: 'yz',
      faceSign: 1,
      faceCoord: width / 2,
      doorWidth: depth,
      doorHeight: height,
      rectMinX: -depth / 2,
      rectMaxX: depth / 2,
      rectMinY: -height / 2,
      rectMaxY: height / 2,
    };
  }

  if (pid.endsWith('_ceil') || pid === 'body_ceil' || pid === 'chest_ceil') {
    return {
      plane: 'xz',
      faceSign: 1,
      faceCoord: height / 2,
      doorWidth: width,
      doorHeight: depth,
      rectMinX: -width / 2,
      rectMaxX: width / 2,
      rectMinY: -depth / 2,
      rectMaxY: depth / 2,
    };
  }

  return null;
}

export function buildDoorTrimSurfaceUserData(
  partId: unknown,
  dimensions: BoardDimensionsLike
): UnknownRecord | null {
  const info = resolveCabinetBodyDoorTrimSurfaceInfo(partId, dimensions);
  if (!info) return null;
  return {
    partId: normalizePartId(partId),
    __wpDoorTrimSurface: true,
    __wpDoorTrimSurfacePlane: info.plane,
    __wpDoorTrimSurfaceFaceSign: info.faceSign,
    __wpDoorTrimSurfaceFaceCoord: info.faceCoord,
    __doorWidth: info.doorWidth,
    __doorHeight: info.doorHeight,
    __doorMeshOffsetX: 0,
    __doorRectMinX: info.rectMinX,
    __doorRectMaxX: info.rectMaxX,
    __doorRectMinY: info.rectMinY,
    __doorRectMaxY: info.rectMaxY,
    __handleZSign: info.faceSign,
  };
}

export function readDoorTrimSurfacePlaneFromUserData(
  userData: UnknownRecord | null | undefined
): DoorTrimSurfacePlane {
  const value =
    typeof userData?.__wpDoorTrimSurfacePlane === 'string' ? userData.__wpDoorTrimSurfacePlane : '';
  return value === 'yz' || value === 'xz' ? value : 'xy';
}

export function readDoorTrimSurfaceFaceSignFromUserData(userData: UnknownRecord | null | undefined): 1 | -1 {
  return Number(userData?.__wpDoorTrimSurfaceFaceSign) < 0 ? -1 : 1;
}

export function readDoorTrimSurfaceFaceCoordFromUserData(
  userData: UnknownRecord | null | undefined,
  defaultValue = 0
): number {
  return readFinite(userData?.__wpDoorTrimSurfaceFaceCoord, defaultValue);
}

export function mapDoorTrimSurfaceLocalPoint(
  userData: UnknownRecord | null | undefined,
  point: { x?: unknown; y?: unknown; z?: unknown }
): { localX: number; localY: number } {
  const plane = readDoorTrimSurfacePlaneFromUserData(userData);
  const x = readFinite(point.x, 0);
  const y = readFinite(point.y, 0);
  const z = readFinite(point.z, 0);
  if (plane === 'yz') return { localX: z, localY: y };
  if (plane === 'xz') return { localX: x, localY: z };
  return { localX: x, localY: y };
}

export function mapDoorTrimSurfaceLogicalToLocalPoint(args: {
  userData?: UnknownRecord | null;
  localX: number;
  localY: number;
  faceCoord: number;
}): { x: number; y: number; z: number } {
  const plane = readDoorTrimSurfacePlaneFromUserData(args.userData);
  if (plane === 'yz') return { x: args.faceCoord, y: args.localY, z: args.localX };
  if (plane === 'xz') return { x: args.localX, y: args.faceCoord, z: args.localY };
  return { x: args.localX, y: args.localY, z: args.faceCoord };
}
