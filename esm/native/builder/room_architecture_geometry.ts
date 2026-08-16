import type { AppContainer, RoomArchitectureConfigLike, UnknownRecord } from '../../../types/index.js';

import { normalizeRoomArchitecture } from '../../shared/room_architecture_shared.js';
import { readRootState } from '../runtime/root_state_access.js';
import { readRuntimeStateFromApp } from '../runtime/runtime_selectors.js';

export const ROOM_BACK_WALL_THICKNESS_M = 0.04;
export const ROOM_BACK_WALL_GAP_M = 0.01;
export const ROOM_ARCHITECTURE_EPSILON_M = 0.00005;

export type AxisAlignedBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

export type RoomArchitectureGeometry = {
  config: RoomArchitectureConfigLike;
  wardrobeWidthM: number;
  wardrobeHeightM: number;
  wardrobeDepthM: number;
  wall: AxisAlignedBox & {
    centerX: number;
    centerY: number;
    centerZ: number;
    width: number;
    height: number;
    depth: number;
  };
  column:
    | (AxisAlignedBox & {
        centerX: number;
        centerY: number;
        centerZ: number;
        width: number;
        height: number;
        depth: number;
      })
    | null;
};

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function finitePositive(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readUiRawDimensionM(root: unknown, key: 'width' | 'height' | 'depth', defaultM: number): number {
  const rootRec = asRecord(root);
  const ui = asRecord(rootRec?.ui);
  const raw = asRecord(ui?.raw);
  const cm = finitePositive(raw?.[key]);
  return cm == null ? defaultM : cm / 100;
}

function resolveWardrobeDimensions(App: AppContainer): { width: number; height: number; depth: number } {
  const runtime = asRecord(readRuntimeStateFromApp(App)) || {};
  const root = readRootState(App);
  return {
    width: finitePositive(runtime.wardrobeWidthM) ?? readUiRawDimensionM(root, 'width', 2.4),
    height: finitePositive(runtime.wardrobeHeightM) ?? readUiRawDimensionM(root, 'height', 2.4),
    depth: finitePositive(runtime.wardrobeDepthM) ?? readUiRawDimensionM(root, 'depth', 0.6),
  };
}

export function readRoomArchitectureConfigFromApp(App: AppContainer): RoomArchitectureConfigLike {
  const root = asRecord(readRootState(App));
  const config = asRecord(root?.config);
  return normalizeRoomArchitecture(config?.roomArchitecture);
}

function withBoxMetrics(box: AxisAlignedBox) {
  const width = Math.max(0, box.maxX - box.minX);
  const height = Math.max(0, box.maxY - box.minY);
  const depth = Math.max(0, box.maxZ - box.minZ);
  return {
    ...box,
    width,
    height,
    depth,
    centerX: (box.minX + box.maxX) / 2,
    centerY: (box.minY + box.maxY) / 2,
    centerZ: (box.minZ + box.maxZ) / 2,
  };
}

export function resolveRoomArchitectureGeometry(App: AppContainer): RoomArchitectureGeometry {
  const config = readRoomArchitectureConfigFromApp(App);
  const wardrobe = resolveWardrobeDimensions(App);
  const wallWidthM = config.backWall.widthCm / 100;
  const wallHeightM = config.backWall.heightCm / 100;
  const offsetLeftM = config.backWall.wardrobeOffsetLeftCm / 100;
  const wallLeftX = -wardrobe.width / 2 - offsetLeftM;
  const wallFrontZ = -wardrobe.depth / 2 - ROOM_BACK_WALL_GAP_M;
  const wall = withBoxMetrics({
    minX: wallLeftX,
    maxX: wallLeftX + wallWidthM,
    minY: 0,
    maxY: wallHeightM,
    minZ: wallFrontZ - ROOM_BACK_WALL_THICKNESS_M,
    maxZ: wallFrontZ,
  });

  let column: RoomArchitectureGeometry['column'] = null;
  if (config.backWall.enabled && config.column.enabled) {
    const columnLeftX = wallLeftX + config.column.offsetLeftCm / 100;
    const columnBottomY = config.column.bottomOffsetCm / 100;
    column = withBoxMetrics({
      minX: columnLeftX,
      maxX: columnLeftX + config.column.widthCm / 100,
      minY: columnBottomY,
      maxY: columnBottomY + config.column.heightCm / 100,
      minZ: wallFrontZ,
      maxZ: wallFrontZ + config.column.depthCm / 100,
    });
  }

  return {
    config,
    wardrobeWidthM: wardrobe.width,
    wardrobeHeightM: wardrobe.height,
    wardrobeDepthM: wardrobe.depth,
    wall,
    column,
  };
}

export function resolveActiveRoomColumnObstacle(App: AppContainer): AxisAlignedBox | null {
  const geometry = resolveRoomArchitectureGeometry(App);
  return geometry.config.backWall.enabled && geometry.config.column.enabled ? geometry.column : null;
}

export function intersectAxisAlignedBoxes(a: AxisAlignedBox, b: AxisAlignedBox): AxisAlignedBox | null {
  const overlap: AxisAlignedBox = {
    minX: Math.max(a.minX, b.minX),
    maxX: Math.min(a.maxX, b.maxX),
    minY: Math.max(a.minY, b.minY),
    maxY: Math.min(a.maxY, b.maxY),
    minZ: Math.max(a.minZ, b.minZ),
    maxZ: Math.min(a.maxZ, b.maxZ),
  };
  if (
    overlap.maxX - overlap.minX <= ROOM_ARCHITECTURE_EPSILON_M ||
    overlap.maxY - overlap.minY <= ROOM_ARCHITECTURE_EPSILON_M ||
    overlap.maxZ - overlap.minZ <= ROOM_ARCHITECTURE_EPSILON_M
  ) {
    return null;
  }
  return overlap;
}

export function boxFromCenterSize(args: {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}): AxisAlignedBox {
  return {
    minX: args.x - args.width / 2,
    maxX: args.x + args.width / 2,
    minY: args.y - args.height / 2,
    maxY: args.y + args.height / 2,
    minZ: args.z - args.depth / 2,
    maxZ: args.z + args.depth / 2,
  };
}

function appendBoxIfPositive(out: AxisAlignedBox[], box: AxisAlignedBox): void {
  if (
    box.maxX - box.minX > ROOM_ARCHITECTURE_EPSILON_M &&
    box.maxY - box.minY > ROOM_ARCHITECTURE_EPSILON_M &&
    box.maxZ - box.minZ > ROOM_ARCHITECTURE_EPSILON_M
  ) {
    out.push(box);
  }
}

/** Exact decomposition of A \\ B for axis-aligned rectangular prisms. */
export function subtractAxisAlignedBox(source: AxisAlignedBox, obstacle: AxisAlignedBox): AxisAlignedBox[] {
  const cut = intersectAxisAlignedBoxes(source, obstacle);
  if (!cut) return [source];

  const out: AxisAlignedBox[] = [];
  appendBoxIfPositive(out, { ...source, maxX: cut.minX });
  appendBoxIfPositive(out, { ...source, minX: cut.maxX });

  const midX = { minX: cut.minX, maxX: cut.maxX };
  appendBoxIfPositive(out, { ...source, ...midX, maxY: cut.minY });
  appendBoxIfPositive(out, { ...source, ...midX, minY: cut.maxY });

  const midXY = { ...midX, minY: cut.minY, maxY: cut.maxY };
  appendBoxIfPositive(out, { ...source, ...midXY, maxZ: cut.minZ });
  appendBoxIfPositive(out, { ...source, ...midXY, minZ: cut.maxZ });
  return out;
}

export function axisAlignedBoxToCenterSize(box: AxisAlignedBox) {
  return {
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
    depth: box.maxZ - box.minZ,
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    z: (box.minZ + box.maxZ) / 2,
  };
}
