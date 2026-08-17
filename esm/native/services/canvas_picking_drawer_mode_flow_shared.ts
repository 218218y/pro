import type {
  ActionMetaLike,
  AppContainer,
  DrawerVisualEntryLike,
  ModuleConfigLike,
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
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { resolveSketchFreeBoxGeometry } from './canvas_picking_sketch_free_box_geometry_box.js';
import { __wp_measureWardrobeLocalBox } from './canvas_picking_projection_runtime_box.js';

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

type RoomColumnArchitectureLike = {
  backWall: {
    enabled: true;
    widthCm: number;
    heightCm: number;
    wardrobeOffsetLeftCm: number;
  };
  column: {
    enabled: true;
    offsetLeftCm: number;
    widthCm: number;
    depthCm: number;
    heightCm: number;
    bottomOffsetCm: number;
  };
  surfacesHidden: boolean;
};

type RoomColumnCutContext = {
  wardrobe: DrawerCollisionBox;
  cutObstacle: DrawerCollisionBox;
};

function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) ? n : null;
}

function readPositiveNumber(value: unknown): number | null {
  const n = readFiniteNumber(value);
  return n != null && n > 0 ? n : null;
}

export function readRoomArchitectureForDrawerGuard(App: AppContainer): unknown {
  const state = readStoreStateMaybe(App);
  return asRecord(asRecord(state)?.config)?.roomArchitecture ?? null;
}

function boxesOverlap(a: DrawerCollisionBox, b: DrawerCollisionBox): boolean {
  return (
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M &&
    Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M &&
    Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > ROOM_COLUMN_DRAWER_COLLISION_EPSILON_M
  );
}

function readRoomArchitecture(value: unknown): RoomColumnArchitectureLike | null {
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
  key: 'wardrobeWidthM' | 'wardrobeHeightM' | 'wardrobeDepthM',
  uiRawKey: 'width' | 'height' | 'depth',
  fallbackM: number
): number | null {
  const runtimeValue = readPositiveNumber(readRuntimeScalarOrDefaultFromApp(App, key, null));
  if (runtimeValue != null) return runtimeValue;

  // Builder room-architecture geometry falls back to ui.raw dimensions whenever
  // the runtime dimension cache has not been populated yet. Drawer eligibility
  // must follow the same source order; otherwise a visibly notched free box can
  // still accept drawers during the window where runtime.* dimensions are null.
  const state = readStoreStateMaybe(App);
  const root = asRecord(state);
  const ui = asRecord(root?.ui);
  const raw = asRecord(ui?.raw);
  const rawValue = raw?.[uiRawKey];
  const rawCm = readPositiveNumber(rawValue) ?? readPositiveNumber(Number(rawValue));
  if (rawCm != null) return rawCm / 100;

  return fallbackM > 0 ? fallbackM : null;
}

function resolveRoomColumnCutContext(
  App: AppContainer,
  roomArchitecture: unknown
): RoomColumnCutContext | null {
  const architecture = readRoomArchitecture(roomArchitecture);
  if (!architecture) return null;

  const wardrobeWidthM = readWardrobeDimensionM(App, 'wardrobeWidthM', 'width', 2.4);
  const wardrobeHeightM = readWardrobeDimensionM(App, 'wardrobeHeightM', 'height', 2.4);
  const wardrobeDepthM = readWardrobeDimensionM(App, 'wardrobeDepthM', 'depth', 0.6);
  if (wardrobeWidthM == null || wardrobeHeightM == null || wardrobeDepthM == null) return null;

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
  if (!boxesOverlap(obstacle, wardrobe)) return null;

  return {
    wardrobe,
    cutObstacle: {
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
    },
  };
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
  const roomColumn = resolveRoomColumnCutContext(args.App, args.roomArchitecture);
  if (!roomColumn) return false;

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

  const cell: DrawerCollisionBox = {
    minX: internalCenterX - innerW / 2,
    maxX: internalCenterX + innerW / 2,
    minY: effectiveBottomY,
    maxY: effectiveTopY,
    minZ: internalZ - internalDepth / 2,
    maxZ: internalZ + internalDepth / 2,
  };
  return boxesOverlap(roomColumn.cutObstacle, cell);
}

/**
 * Free-placement sketch boxes are independent enclosures. Their host wardrobe
 * cell may be clear even while the box itself is physically notched by the
 * room column, so drawer eligibility must use the rendered free-box envelope.
 */
export function shouldBlockFreeBoxDrawerBuildForRoomColumn(args: {
  App: AppContainer;
  roomArchitecture: unknown;
  box: unknown;
}): boolean {
  const roomColumn = resolveRoomColumnCutContext(args.App, args.roomArchitecture);
  if (!roomColumn) return false;

  const box = asRecord(args.box);
  if (!box || box.freePlacement !== true) return false;
  const centerX = readFiniteNumber(box.absX);
  const centerY = readFiniteNumber(box.absY);
  const heightM = readPositiveNumber(box.heightM);
  if (centerX == null || centerY == null || heightM == null) return false;

  const wardrobeBox = __wp_measureWardrobeLocalBox(args.App);
  const measuredWidth = readPositiveNumber(wardrobeBox?.width);
  const measuredDepth = readPositiveNumber(wardrobeBox?.depth);
  const measuredCenterZ = readFiniteNumber(wardrobeBox?.centerZ);
  const wardrobeWidth = measuredWidth ?? roomColumn.wardrobe.maxX - roomColumn.wardrobe.minX;
  const wardrobeDepth = measuredDepth ?? roomColumn.wardrobe.maxZ - roomColumn.wardrobe.minZ;
  const wardrobeBackZ =
    measuredDepth != null && measuredCenterZ != null
      ? measuredCenterZ - measuredDepth / 2
      : roomColumn.wardrobe.minZ;

  const geometry = resolveSketchFreeBoxGeometry({
    wardrobeWidth,
    wardrobeDepth,
    backZ: wardrobeBackZ,
    centerX,
    widthM: readPositiveNumber(box.widthM),
    depthM: readPositiveNumber(box.depthM),
  });
  const freeBox: DrawerCollisionBox = {
    minX: geometry.centerX - geometry.outerW / 2,
    maxX: geometry.centerX + geometry.outerW / 2,
    minY: centerY - heightM / 2,
    maxY: centerY + heightM / 2,
    minZ: geometry.centerZ - geometry.outerD / 2,
    maxZ: geometry.centerZ + geometry.outerD / 2,
  };
  return boxesOverlap(roomColumn.cutObstacle, freeBox);
}
