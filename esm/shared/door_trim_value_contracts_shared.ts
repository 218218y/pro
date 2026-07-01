import type {
  DoorTrimAxis,
  DoorTrimColor,
  DoorTrimEntry,
  DoorTrimSpan,
  UnknownRecord,
} from '../../types/index.js';
import { DOOR_TRIM_DIMENSIONS } from './wardrobe_dimension_tokens_shared.js';

export type DoorTrimStableIdParts = {
  axis: DoorTrimAxis;
  color: DoorTrimColor;
  span: DoorTrimSpan;
  centerXNorm: number;
  centerYNorm: number;
  sizeCm: number | null;
  crossSizeCm: number | null;
};

export type DoorTrimValueNormalizationOptions = {
  missingId?: unknown;
  useStableIdWhenMissing?: boolean;
};

export const DEFAULT_DOOR_TRIM_COLOR: DoorTrimColor = 'nickel';
export const DEFAULT_DOOR_TRIM_SPAN: DoorTrimSpan = 'full';
export const DEFAULT_DOOR_TRIM_AXIS: DoorTrimAxis = 'horizontal';
export const DEFAULT_DOOR_TRIM_CENTER_NORM: number = DOOR_TRIM_DIMENSIONS.defaults.centerNorm;
export const MIN_DOOR_TRIM_CUSTOM_CM: number = DOOR_TRIM_DIMENSIONS.limits.customMinCm;
export const MAX_DOOR_TRIM_CUSTOM_CM: number = DOOR_TRIM_DIMENSIONS.limits.customMaxCm;
export const MIN_DOOR_TRIM_CROSS_SIZE_CM: number = DOOR_TRIM_DIMENSIONS.limits.crossSizeMinCm;
export const MAX_DOOR_TRIM_CROSS_SIZE_CM: number = DOOR_TRIM_DIMENSIONS.limits.crossSizeMaxCm;

const CENTER_EPSILON = DOOR_TRIM_DIMENSIONS.normalize.centerEpsilonNorm;

export function isDoorTrimValueRecord(value: unknown): value is UnknownRecord {
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
  defaultAxis: DoorTrimAxis = DEFAULT_DOOR_TRIM_AXIS
): DoorTrimAxis {
  return value === 'vertical' ? 'vertical' : value === 'horizontal' ? 'horizontal' : defaultAxis;
}

export function normalizeDoorTrimColor(
  value: unknown,
  defaultColor: DoorTrimColor = DEFAULT_DOOR_TRIM_COLOR
): DoorTrimColor {
  return value === 'silver' || value === 'gold' || value === 'black' || value === 'nickel'
    ? value
    : defaultColor;
}

export function normalizeDoorTrimSpan(
  value: unknown,
  defaultSpan: DoorTrimSpan = DEFAULT_DOOR_TRIM_SPAN
): DoorTrimSpan {
  return value === 'full' ||
    value === 'three_quarters' ||
    value === 'half' ||
    value === 'third' ||
    value === 'quarter' ||
    value === 'custom'
    ? value
    : defaultSpan;
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

export function resolveDoorTrimCenterPair(value: UnknownRecord): {
  centerXNorm: number;
  centerYNorm: number;
} {
  const centerXNorm = normalizeDoorTrimCenterNorm(value.centerXNorm);
  const centerYNorm = normalizeDoorTrimCenterNorm(value.centerYNorm);
  return {
    centerXNorm,
    centerYNorm,
  };
}

function readDoorTrimId(value: unknown): string {
  return typeof value === 'string' && value.trim() ? String(value) : '';
}

export function createStableDoorTrimId(parts: DoorTrimStableIdParts): string {
  const tokens = [
    parts.axis,
    parts.color,
    parts.span,
    parts.centerXNorm.toFixed(4),
    parts.centerYNorm.toFixed(4),
    parts.sizeCm == null ? '' : parts.sizeCm.toFixed(4),
    parts.crossSizeCm == null ? '' : parts.crossSizeCm.toFixed(4),
  ];
  let hash = 2166136261;
  const seed = tokens.join('|');
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `trim_${(hash >>> 0).toString(36)}`;
}

export function normalizeDoorTrimEntryValue(
  value: unknown,
  options: DoorTrimValueNormalizationOptions = {}
): DoorTrimEntry | null {
  const rec = isDoorTrimValueRecord(value) ? value : null;
  if (!rec) return null;
  const axis = normalizeDoorTrimAxis(rec.axis);
  const color = normalizeDoorTrimColor(rec.color);
  const span = normalizeDoorTrimSpan(rec.span);
  const { centerXNorm, centerYNorm } = resolveDoorTrimCenterPair(rec);
  const sizeCm = normalizeDoorTrimCustomSizeCm(rec.sizeCm);
  const crossSizeCm = normalizeDoorTrimCrossSizeCm(rec.crossSizeCm);
  const stableIdParts: DoorTrimStableIdParts = {
    axis,
    color,
    span,
    centerXNorm,
    centerYNorm,
    sizeCm,
    crossSizeCm,
  };
  const id =
    readDoorTrimId(rec.id) ||
    readDoorTrimId(options.missingId) ||
    (options.useStableIdWhenMissing ? createStableDoorTrimId(stableIdParts) : '');
  if (!id) return null;

  const out: DoorTrimEntry = {
    id,
    axis,
    color,
    span,
    centerXNorm,
    centerYNorm,
  };
  if (span === 'custom' && sizeCm != null) out.sizeCm = sizeCm;
  if (crossSizeCm != null) out.crossSizeCm = crossSizeCm;
  return out;
}

export function normalizeDoorTrimEntryValueList(
  value: unknown,
  options: DoorTrimValueNormalizationOptions = {}
): DoorTrimEntry[] {
  if (Array.isArray(value)) {
    const out: DoorTrimEntry[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const entry = normalizeDoorTrimEntryValue(value[i], options);
      if (entry) out.push({ ...entry });
    }
    return out;
  }
  const single = normalizeDoorTrimEntryValue(value, options);
  return single ? [{ ...single }] : [];
}
