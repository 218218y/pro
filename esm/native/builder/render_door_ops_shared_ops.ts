import type {
  HingedDoorOpLike,
  SlidingDoorOpLike,
  SlidingRailLike,
} from './render_door_ops_shared_contracts.js';
import { isRecord } from './render_door_ops_shared_core.js';

function readFinite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readDoorPartId(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

export function readSlidingDoorOp(value: unknown, index: number): SlidingDoorOpLike | null {
  if (!isRecord(value)) return null;
  const width = readFinite(value.width, NaN);
  const height = readFinite(value.height, NaN);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return {
    x: readFinite(value.x),
    y: readFinite(value.y),
    z: readFinite(value.z),
    width,
    height,
    partId: readDoorPartId(value.partId, `sliding_door_${index + 1}`),
    isOuter: value.isOuter === true,
    index: typeof value.index === 'number' && Number.isFinite(value.index) ? value.index : undefined,
    total: typeof value.total === 'number' && Number.isFinite(value.total) ? value.total : undefined,
    minX: typeof value.minX === 'number' && Number.isFinite(value.minX) ? value.minX : undefined,
    maxX: typeof value.maxX === 'number' && Number.isFinite(value.maxX) ? value.maxX : undefined,
  };
}

export function readSlidingRail(value: unknown): SlidingRailLike | null {
  if (!isRecord(value)) return null;
  const rail = {
    width: readFinite(value.width, NaN),
    height: readFinite(value.height, NaN),
    depth: readFinite(value.depth, NaN),
    lineOffsetY: readFinite(value.lineOffsetY),
    lineOffsetZ: readFinite(value.lineOffsetZ),
    topY: readFinite(value.topY),
    bottomY: readFinite(value.bottomY),
    z: readFinite(value.z),
  };
  return Number.isFinite(rail.width) && Number.isFinite(rail.height) && Number.isFinite(rail.depth)
    ? rail
    : null;
}

export function readHingedDoorOp(value: unknown): HingedDoorOpLike | null {
  if (!isRecord(value)) return null;
  const width = readFinite(value.width, NaN);
  const height = readFinite(value.height, NaN);
  const partId = readString(value.partId);
  if (!partId || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  return {
    x: readFinite(value.x),
    y: readFinite(value.y),
    z: readFinite(value.z),
    width,
    height,
    thickness:
      typeof value.thickness === 'number' && Number.isFinite(value.thickness) ? value.thickness : undefined,
    partId,
    isLeftHinge: value.isLeftHinge === true,
    openAngle:
      typeof value.openAngle === 'number' && Number.isFinite(value.openAngle) ? value.openAngle : undefined,
    isRemoved: value.isRemoved === true,
    isMirror: value.isMirror === true,
    hasGroove: value.hasGroove === true,
    moduleIndex: value.moduleIndex,
    pivotX: typeof value.pivotX === 'number' && Number.isFinite(value.pivotX) ? value.pivotX : undefined,
    meshOffsetX:
      typeof value.meshOffsetX === 'number' && Number.isFinite(value.meshOffsetX)
        ? value.meshOffsetX
        : undefined,
    style: typeof value.style === 'string' ? value.style : undefined,
    curtain: value.curtain,
    handleAbsY:
      typeof value.handleAbsY === 'number' && Number.isFinite(value.handleAbsY)
        ? value.handleAbsY
        : undefined,
    allowHandle: value.allowHandle === false ? false : undefined,
  };
}
