import type {
  ActionMetaLike,
  AppContainer,
  DrawerVisualEntryLike,
  ModuleConfigLike,
  RoomArchitectureConfigLike,
  UnknownRecord,
} from '../../../types';
import {
  collectDrawerVisualIdentityAliases,
  drawerVisualMatchesId,
  readDrawerVisualPrimaryId,
  readDrawerVisualUserData,
} from '../runtime/drawer_visual_identity.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type PatchConfigForKeyFn = (
  mk: ModuleKey | 'corner' | null,
  patchFn: (cfg: ModuleConfigLike) => void,
  meta: ActionMetaLike
) => unknown;

export type InternalGridInfoLike = UnknownRecord & {
  effectiveBottomY?: number;
  effectiveTopY?: number;
  gridDivisions?: number;
  startY?: number;
  woodThick?: number;
};

export type DrawerVisualLike = DrawerVisualEntryLike & {
  isInternal?: boolean;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asInternalGridInfo(value: unknown): InternalGridInfoLike | null {
  return asRecord(value);
}

export function readDrawerUserData(drawer: DrawerVisualEntryLike | null | undefined): UnknownRecord | null {
  return readDrawerVisualUserData(drawer);
}

export function hasPartId(drawer: DrawerVisualEntryLike | null | undefined, partId: string | null): boolean {
  return drawerVisualMatchesId(drawer, partId);
}

export function readDrawerId(drawer: DrawerVisualEntryLike | null | undefined): string | null {
  return readDrawerVisualPrimaryId(drawer);
}

export function readDrawerIdentityAliases(drawer: DrawerVisualEntryLike | null | undefined): string[] {
  return collectDrawerVisualIdentityAliases(drawer);
}

export function readDrawerIsInternal(
  drawer: DrawerVisualLike | DrawerVisualEntryLike | null | undefined
): boolean | null {
  const drawerRecord = asRecord(drawer);
  if (typeof drawerRecord?.isInternal === 'boolean') return drawerRecord.isInternal;
  return null;
}

export const ROOM_COLUMN_DRAWER_ADD_BLOCKED_MESSAGE = 'לא ניתן לבנות מגירות בתא זה, כי העמוד חודר לתוך התא.';

const ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M = 0.00005;
const ROOM_COLUMN_BACK_WALL_GAP_M = 0.01;
const ROOM_COLUMN_LINER_THICKNESS_M = 0.005;

type DrawerCollisionBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function readPositiveNumber(value: unknown): number | null {
  const n = readFiniteNumber(value);
  return n != null && n > 0 ? n : null;
}

function boxesOverlap(a: DrawerCollisionBox, b: DrawerCollisionBox): boolean {
  return (
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
  );
}

function readRoomArchitecture(value: unknown): RoomArchitectureConfigLike | null {
  const root = asRecord(value);
  const backWall = asRecord(root?.backWall);
  const column = asRecord(root?.column);
  if (!backWall || !column || backWall.enabled !== true || column.enabled !== true) return null;

  const wallWidthCm = readPositiveNumber(backWall.widthCm);
  const wallHeightCm = readPositiveNumber(backWall.heightCm);
  const wardrobeOffsetLeftCm = readFiniteNumber(backWall.wardrobeOffsetLeftCm);
  const offsetLeftCm = readFiniteNumber(column.offsetLeftCm);
  const widthCm = readPositiveNumber(column.widthCm);
  const depthCm = readPositiveNumber(column.depthCm);
  const heightCm = readPositiveNumber(column.heightCm);
  const bottomOffsetCm = readFiniteNumber(column.bottomOffsetCm);
  if (
    wallWidthCm == null ||
    wallHeightCm == null ||
    wardrobeOffsetLeftCm == null ||
    offsetLeftCm == null ||
    widthCm == null ||
    depthCm == null ||
    heightCm == null ||
    bottomOffsetCm == null
  ) {
    return null;
  }

  return {
    backWall: {
      enabled: true,
      widthCm: wallWidthCm,
      heightCm: wallHeightCm,
      wardrobeOffsetLeftCm,
    },
    column: {
      enabled: true,
      offsetLeftCm,
      widthCm,
      depthCm,
      heightCm,
      bottomOffsetCm,
    },
    surfacesHidden: root?.surfacesHidden === true,
  };
}

function readWardrobeDimensionM(
  App: AppContainer,
  key: 'wardrobeWidthM' | 'wardrobeHeightM' | 'wardrobeDepthM'
): number | null {
  return readPositiveNumber(readRuntimeScalarOrDefaultFromApp(App, key, null));
}

/**
 * Service-side build guard for drawers. It mirrors the physical room-column
 * collision envelope used by the builder without importing the builder layer.
 */
export function shouldBlockDrawerBuildForRoomColumn(args: {
  App: AppContainer;
  roomArchitecture: unknown;
  moduleKey: ModuleKey | 'corner' | null;
  isBottomStack: boolean;
}): boolean {
  if (args.moduleKey == null) return false;
  const architecture = readRoomArchitecture(args.roomArchitecture);
  if (!architecture) return false;

  const wardrobeWidthM = readWardrobeDimensionM(args.App, 'wardrobeWidthM');
  const wardrobeHeightM = readWardrobeDimensionM(args.App, 'wardrobeHeightM');
  const wardrobeDepthM = readWardrobeDimensionM(args.App, 'wardrobeDepthM');
  if (wardrobeWidthM == null || wardrobeHeightM == null || wardrobeDepthM == null) return false;

  const grid = getInternalGridMap(args.App, args.isBottomStack);
  const info = asInternalGridInfo(grid[String(args.moduleKey)] ?? grid[args.moduleKey as keyof typeof grid]);
  const effectiveBottomY = readFiniteNumber(info?.effectiveBottomY);
  const effectiveTopY = readFiniteNumber(info?.effectiveTopY);
  const innerW = readPositiveNumber(info?.innerW);
  const internalCenterX = readFiniteNumber(info?.internalCenterX);
  const internalDepth = readPositiveNumber(info?.internalDepth);
  const internalZ = readFiniteNumber(info?.internalZ);
  if (
    effectiveBottomY == null ||
    effectiveTopY == null ||
    effectiveTopY <= effectiveBottomY ||
    innerW == null ||
    internalCenterX == null ||
    internalDepth == null ||
    internalZ == null
  ) {
    return false;
  }

  const wallLeftX = -wardrobeWidthM / 2 - architecture.backWall.wardrobeOffsetLeftCm / 100;
  const wallFrontZ = -wardrobeDepthM / 2 - ROOM_COLUMN_BACK_WALL_GAP_M;
  const obstacle: DrawerCollisionBox = {
    minX: wallLeftX + architecture.column.offsetLeftCm / 100,
    maxX: wallLeftX + (architecture.column.offsetLeftCm + architecture.column.widthCm) / 100,
    minY: architecture.column.bottomOffsetCm / 100,
    maxY: (architecture.column.bottomOffsetCm + architecture.column.heightCm) / 100,
    minZ: wallFrontZ,
    maxZ: wallFrontZ + architecture.column.depthCm / 100,
  };
  const wardrobe: DrawerCollisionBox = {
    minX: -wardrobeWidthM / 2,
    maxX: wardrobeWidthM / 2,
    minY: 0,
    maxY: wardrobeHeightM,
    minZ: -wardrobeDepthM / 2,
    maxZ: wardrobeDepthM / 2,
  };
  if (!boxesOverlap(obstacle, wardrobe)) return false;

  const cutObstacle: DrawerCollisionBox = {
    minX:
      obstacle.minX > wardrobe.minX + ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
        ? obstacle.minX - ROOM_COLUMN_LINER_THICKNESS_M
        : obstacle.minX,
    maxX:
      obstacle.maxX < wardrobe.maxX - ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
        ? obstacle.maxX + ROOM_COLUMN_LINER_THICKNESS_M
        : obstacle.maxX,
    minY:
      obstacle.minY > wardrobe.minY + ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
        ? obstacle.minY - ROOM_COLUMN_LINER_THICKNESS_M
        : obstacle.minY,
    maxY:
      obstacle.maxY < wardrobe.maxY - ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
        ? obstacle.maxY + ROOM_COLUMN_LINER_THICKNESS_M
        : obstacle.maxY,
    minZ: obstacle.minZ,
    maxZ:
      obstacle.maxZ < wardrobe.maxZ - ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
        ? obstacle.maxZ + ROOM_COLUMN_LINER_THICKNESS_M
        : obstacle.maxZ,
  };
  const cell: DrawerCollisionBox = {
    minX: internalCenterX - innerW / 2,
    maxX: internalCenterX + innerW / 2,
    minY: effectiveBottomY,
    maxY: effectiveTopY,
    minZ: internalZ - internalDepth / 2,
    maxZ: internalZ + internalDepth / 2,
  };
  return boxesOverlap(cutObstacle, cell);
}
