import type {
  DoorTrimAxis,
  DoorTrimColor,
  DoorTrimEntry,
  DoorTrimMap,
  DoorTrimSpan,
  UnknownRecord,
} from '../../../types';

import { DOOR_TRIM_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

export type { DoorTrimAxis, DoorTrimColor, DoorTrimEntry, DoorTrimMap, DoorTrimSpan, UnknownRecord };

export const DOOR_TRIM_COLORS: readonly DoorTrimColor[] = ['nickel', 'silver', 'gold', 'black'];
export const DOOR_TRIM_AXES: readonly DoorTrimAxis[] = ['horizontal', 'vertical'];
export const DOOR_TRIM_SPANS: readonly DoorTrimSpan[] = [
  'full',
  'three_quarters',
  'half',
  'third',
  'quarter',
  'custom',
];

export const DEFAULT_DOOR_TRIM_COLOR: DoorTrimColor = 'nickel';
export const DEFAULT_DOOR_TRIM_SPAN: DoorTrimSpan = 'full';
export const DEFAULT_DOOR_TRIM_AXIS: DoorTrimAxis = 'horizontal';
export const DEFAULT_DOOR_TRIM_THICKNESS_M: number = DOOR_TRIM_DIMENSIONS.defaults.thicknessM;
export const DEFAULT_DOOR_TRIM_DEPTH_M: number = DOOR_TRIM_DIMENSIONS.defaults.depthM;
export const DOOR_TRIM_CENTER_SNAP_NORM_THRESHOLD: number = DOOR_TRIM_DIMENSIONS.snap.centerNormThreshold;
export const MIN_DOOR_TRIM_SPAN_M: number = DOOR_TRIM_DIMENSIONS.limits.minSpanM;
export const MIN_DOOR_TRIM_CUSTOM_CM: number = DOOR_TRIM_DIMENSIONS.limits.customMinCm;
export const MAX_DOOR_TRIM_CUSTOM_CM: number = DOOR_TRIM_DIMENSIONS.limits.customMaxCm;
export const MIN_DOOR_TRIM_CROSS_SIZE_CM: number = DOOR_TRIM_DIMENSIONS.limits.crossSizeMinCm;
export const MAX_DOOR_TRIM_CROSS_SIZE_CM: number = DOOR_TRIM_DIMENSIONS.limits.crossSizeMaxCm;
export const DEFAULT_DOOR_TRIM_CROSS_SIZE_CM: number = DOOR_TRIM_DIMENSIONS.defaults.crossSizeCm;
export const DOOR_TRIM_MIRROR_SNAP_ZONE_M: number = DOOR_TRIM_DIMENSIONS.snap.mirrorZoneM;
// Keep trims visually attached to mirrors while still avoiding edge shimmer / aliasing.
export const DOOR_TRIM_MIRROR_EDGE_GAP_M: number = DOOR_TRIM_DIMENSIONS.snap.mirrorEdgeGapM;

export const DEFAULT_DOOR_TRIM_CENTER_NORM: number = DOOR_TRIM_DIMENSIONS.defaults.centerNorm;
const CENTER_EPSILON = DOOR_TRIM_DIMENSIONS.normalize.centerEpsilonNorm;

export type DoorTrimRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ResolvedDoorTrimPlacement = {
  axis: DoorTrimAxis;
  color: DoorTrimColor;
  span: DoorTrimSpan;
  sizeCm: number | null;
  crossSizeCm: number | null;
  centerNorm: number;
  centerXNorm: number;
  centerYNorm: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

export type DoorTrimMatch = {
  index: number;
  entry: DoorTrimEntry;
  placement: ResolvedDoorTrimPlacement;
  distanceM: number;
};

export function isDoorTrimRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readDoorTrimFinite(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const text = value.trim().replace(',', '.');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function clampDoorTrimNumber(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizeDoorTrimAxis(
  value: unknown,
  fallback: DoorTrimAxis = DEFAULT_DOOR_TRIM_AXIS
): DoorTrimAxis {
  return value === 'vertical' ? 'vertical' : value === 'horizontal' ? 'horizontal' : fallback;
}

export function normalizeDoorTrimColor(
  value: unknown,
  fallback: DoorTrimColor = DEFAULT_DOOR_TRIM_COLOR
): DoorTrimColor {
  return value === 'silver' || value === 'gold' || value === 'black' || value === 'nickel' ? value : fallback;
}

export function normalizeDoorTrimSpan(
  value: unknown,
  fallback: DoorTrimSpan = DEFAULT_DOOR_TRIM_SPAN
): DoorTrimSpan {
  return value === 'full' ||
    value === 'three_quarters' ||
    value === 'half' ||
    value === 'third' ||
    value === 'quarter' ||
    value === 'custom'
    ? value
    : fallback;
}

export function normalizeDoorTrimCenterNorm(value: unknown): number {
  const n = readDoorTrimFinite(value);
  if (!Number.isFinite(n)) return DEFAULT_DOOR_TRIM_CENTER_NORM;
  const next = clampDoorTrimNumber(Number(n), 0, 1);
  return Math.abs(next - DEFAULT_DOOR_TRIM_CENTER_NORM) <= CENTER_EPSILON
    ? DEFAULT_DOOR_TRIM_CENTER_NORM
    : next;
}

export function normalizeDoorTrimCustomSizeCm(value: unknown): number | null {
  const n = readDoorTrimFinite(value);
  if (!Number.isFinite(n) || !(Number(n) > 0)) return null;
  return clampDoorTrimNumber(Number(n), MIN_DOOR_TRIM_CUSTOM_CM, MAX_DOOR_TRIM_CUSTOM_CM);
}

export function normalizeDoorTrimCrossSizeCm(value: unknown): number | null {
  const n = readDoorTrimFinite(value);
  if (!Number.isFinite(n) || !(Number(n) > 0)) return null;
  return clampDoorTrimNumber(Number(n), MIN_DOOR_TRIM_CROSS_SIZE_CM, MAX_DOOR_TRIM_CROSS_SIZE_CM);
}

export function resolveDoorTrimCenterPair(
  value: UnknownRecord,
  axis: DoorTrimAxis
): {
  centerNorm: number;
  centerXNorm: number;
  centerYNorm: number;
} {
  const legacyCenterNorm = normalizeDoorTrimCenterNorm(value.centerNorm);
  const centerXNorm = normalizeDoorTrimCenterNorm(
    value.centerXNorm ?? (axis === 'vertical' ? legacyCenterNorm : DEFAULT_DOOR_TRIM_CENTER_NORM)
  );
  const centerYNorm = normalizeDoorTrimCenterNorm(
    value.centerYNorm ?? (axis === 'horizontal' ? legacyCenterNorm : DEFAULT_DOOR_TRIM_CENTER_NORM)
  );
  return {
    centerNorm: axis === 'vertical' ? centerXNorm : centerYNorm,
    centerXNorm,
    centerYNorm,
  };
}

export function resolveDoorTrimNormalizedCenter(
  value: number,
  min: number,
  max: number,
  spanSize: number
): number {
  const total = Math.max(0, max - min);
  if (!(total > 0)) return (min + max) / 2;
  const desired = min + normalizeDoorTrimCenterNorm(value) * total;
  const half = Math.max(0, spanSize) / 2;
  const lo = min + Math.min(half, total / 2);
  const hi = max - Math.min(half, total / 2);
  if (!(lo <= hi)) return (min + max) / 2;
  return clampDoorTrimNumber(desired, lo, hi);
}
