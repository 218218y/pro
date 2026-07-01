import type {
  DoorTrimAxis,
  DoorTrimColor,
  DoorTrimEntry,
  DoorTrimMap,
  DoorTrimSpan,
  UnknownRecord,
} from '../../../../../types';

import {
  DEFAULT_DOOR_TRIM_AXIS,
  DEFAULT_DOOR_TRIM_CENTER_NORM,
  DEFAULT_DOOR_TRIM_COLOR,
  DEFAULT_DOOR_TRIM_SPAN,
  MAX_DOOR_TRIM_CROSS_SIZE_CM,
  MAX_DOOR_TRIM_CUSTOM_CM,
  MIN_DOOR_TRIM_CROSS_SIZE_CM,
  MIN_DOOR_TRIM_CUSTOM_CM,
  clampDoorTrimNumber,
  isDoorTrimValueRecord,
  normalizeDoorTrimAxis,
  normalizeDoorTrimCenterNorm,
  normalizeDoorTrimColor,
  normalizeDoorTrimCrossSizeCm,
  normalizeDoorTrimCustomSizeCm,
  normalizeDoorTrimSpan,
  readDoorTrimFinite,
  resolveDoorTrimCenterPair,
} from '../../../../shared/door_trim_value_contracts_shared.js';
import { DOOR_TRIM_DIMENSIONS } from '../../../../shared/wardrobe_dimension_tokens_shared.js';

export type { DoorTrimAxis, DoorTrimColor, DoorTrimEntry, DoorTrimMap, DoorTrimSpan, UnknownRecord };
export {
  DEFAULT_DOOR_TRIM_AXIS,
  DEFAULT_DOOR_TRIM_CENTER_NORM,
  DEFAULT_DOOR_TRIM_COLOR,
  DEFAULT_DOOR_TRIM_SPAN,
  MAX_DOOR_TRIM_CROSS_SIZE_CM,
  MAX_DOOR_TRIM_CUSTOM_CM,
  MIN_DOOR_TRIM_CROSS_SIZE_CM,
  MIN_DOOR_TRIM_CUSTOM_CM,
  clampDoorTrimNumber,
  normalizeDoorTrimAxis,
  normalizeDoorTrimCenterNorm,
  normalizeDoorTrimColor,
  normalizeDoorTrimCrossSizeCm,
  normalizeDoorTrimCustomSizeCm,
  normalizeDoorTrimSpan,
  readDoorTrimFinite,
  resolveDoorTrimCenterPair,
};

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

export const DEFAULT_DOOR_TRIM_THICKNESS_M: number = DOOR_TRIM_DIMENSIONS.defaults.thicknessM;
export const DEFAULT_DOOR_TRIM_DEPTH_M: number = DOOR_TRIM_DIMENSIONS.defaults.depthM;
export const DOOR_TRIM_CENTER_SNAP_NORM_THRESHOLD: number = DOOR_TRIM_DIMENSIONS.snap.centerNormThreshold;
export const MIN_DOOR_TRIM_SPAN_M: number = DOOR_TRIM_DIMENSIONS.limits.minSpanM;
export const DEFAULT_DOOR_TRIM_CROSS_SIZE_CM: number = DOOR_TRIM_DIMENSIONS.defaults.crossSizeCm;
export const DOOR_TRIM_MIRROR_SNAP_ZONE_M: number = DOOR_TRIM_DIMENSIONS.snap.mirrorZoneM;
// Keep trims visually attached to mirrors while still avoiding edge shimmer / aliasing.
export const DOOR_TRIM_MIRROR_EDGE_GAP_M: number = DOOR_TRIM_DIMENSIONS.snap.mirrorEdgeGapM;

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
  return isDoorTrimValueRecord(value);
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
