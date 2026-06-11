import { DOOR_SYSTEM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export type SlidingDoorMotionEntryLike = {
  total?: unknown;
  index?: unknown;
  width?: unknown;
  originalX?: unknown;
  originalZ?: unknown;
  outerZ?: unknown;
  minX?: unknown;
  maxX?: unknown;
  stackZStep?: unknown;
  slidingOpenMode?: unknown;
  slidingTrackOpenSide?: unknown;
  __slidingOpenMode?: unknown;
  __slidingTrackOpenSide?: unknown;
};

export type SlidingDoorOpenPosition = {
  finalX: number;
  finalZ: number;
};

function readFinite(value: unknown, defaultValue: number): number {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(num) ? num : defaultValue;
}

function readDoorCount(door: SlidingDoorMotionEntryLike): number {
  const raw = Math.round(readFinite(door.total, DOOR_SYSTEM_DIMENSIONS.sliding.defaultDoorsCount));
  return raw > 0 ? raw : DOOR_SYSTEM_DIMENSIONS.sliding.defaultDoorsCount;
}

function readDoorIndex(door: SlidingDoorMotionEntryLike, doorsCount: number): number {
  const raw = Math.round(readFinite(door.index, 0));
  if (raw < 0) return 0;
  if (raw >= doorsCount) return doorsCount - 1;
  return raw;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function isSlidingDoorTrackOpenMode(door: SlidingDoorMotionEntryLike | null | undefined): boolean {
  if (!door) return false;
  return door.slidingOpenMode === 'track' || door.__slidingOpenMode === 'track';
}

export function isSlidingDoorWideOpenMode(door: SlidingDoorMotionEntryLike | null | undefined): boolean {
  if (!door) return false;
  return door.slidingOpenMode === 'wide' || door.__slidingOpenMode === 'wide';
}

export function shouldUseSlidingDoorWideOpen(
  door: SlidingDoorMotionEntryLike | null | undefined,
  opts?: { forceWideOpen?: boolean }
): boolean {
  return opts?.forceWideOpen === true || isSlidingDoorWideOpenMode(door);
}

export function shouldUseSlidingDoorTrackOpen(
  door: SlidingDoorMotionEntryLike | null | undefined,
  opts?: { forceWideOpen?: boolean }
): boolean {
  if (!door || shouldUseSlidingDoorWideOpen(door, opts)) return false;
  return isSlidingDoorTrackOpenMode(door);
}

export function resolveSlidingDoorWideOpenPosition(
  door: SlidingDoorMotionEntryLike,
  totalW: number,
  doorW: number,
  outerZ: number
): SlidingDoorOpenPosition {
  const doorsCount = readDoorCount(door);
  const idx = readDoorIndex(door, doorsCount);
  const leftCount = Math.floor(doorsCount / 2);
  const epsX = DOOR_SYSTEM_DIMENSIONS.sliding.runtimeOpenEpsilonXM;
  const sideX = totalW / 2 + doorW / 2 + epsX;
  const onLeft = idx < leftCount;
  const stackPos = Number(onLeft ? idx : doorsCount - 1 - idx);
  const zStep = readFinite(door.stackZStep, DOOR_SYSTEM_DIMENSIONS.sliding.runtimeStackZStepDefaultM);
  return {
    finalX: onLeft ? -sideX : sideX,
    finalZ: outerZ - stackPos * zStep,
  };
}

function resolveTrackTargetIndex(door: SlidingDoorMotionEntryLike, doorsCount: number, idx: number): number {
  if (doorsCount <= 1) return idx;
  if (doorsCount === 2) return idx === 0 ? 1 : 0;

  const center = (doorsCount - 1) / 2;
  if (Math.abs(idx - center) < 0.000001) {
    const side = door.slidingTrackOpenSide ?? door.__slidingTrackOpenSide;
    if (side === 'left') return clamp(idx - 1, 0, doorsCount - 1);
    return clamp(idx + 1, 0, doorsCount - 1);
  }

  return idx < center ? clamp(idx + 1, 0, doorsCount - 1) : clamp(idx - 1, 0, doorsCount - 1);
}

export function resolveSlidingDoorTrackOpenPosition(
  door: SlidingDoorMotionEntryLike,
  totalW: number,
  doorW: number,
  closedZ: number
): SlidingDoorOpenPosition {
  const doorsCount = readDoorCount(door);
  const idx = readDoorIndex(door, doorsCount);
  const derivedMinX = -totalW / 2 + doorW / 2;
  const derivedMaxX = totalW / 2 - doorW / 2;
  const minX = readFinite(door.minX, derivedMinX);
  const maxX = readFinite(door.maxX, derivedMaxX);

  if (doorsCount <= 1 || !(maxX > minX)) {
    return { finalX: readFinite(door.originalX, 0), finalZ: closedZ };
  }

  const targetIndex = resolveTrackTargetIndex(door, doorsCount, idx);
  const step = (maxX - minX) / Math.max(1, doorsCount - 1);
  return {
    finalX: clamp(minX + step * targetIndex, minX, maxX),
    finalZ: closedZ,
  };
}
