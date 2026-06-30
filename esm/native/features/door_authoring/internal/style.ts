import type { DoorStyleMap, UnknownRecord } from '../../../../../types';

import { readDoorVisualMapEntry, toDoorStyleOverrideMapKey } from './visual_keys.js';

export type DoorStyleOverrideValue = 'flat' | 'profile' | 'double_profile';

export const DOOR_STYLE_OVERRIDE_PAINT_PREFIX = '__wp_door_style__:';

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

export function normalizeDoorStyleOverrideValue(
  value: unknown,
  defaultValue: DoorStyleOverrideValue = 'flat'
): DoorStyleOverrideValue {
  const raw = String(value == null ? defaultValue : value)
    .trim()
    .toLowerCase();
  return raw === 'profile' || raw === 'double_profile' || raw === 'flat' ? raw : defaultValue;
}

export function isDoorStyleOverrideValue(value: unknown): value is DoorStyleOverrideValue {
  return value === 'flat' || value === 'profile' || value === 'double_profile';
}

export function encodeDoorStyleOverridePaintToken(style: unknown): string {
  return `${DOOR_STYLE_OVERRIDE_PAINT_PREFIX}${normalizeDoorStyleOverrideValue(style)}`;
}

export function parseDoorStyleOverridePaintToken(value: unknown): DoorStyleOverrideValue | null {
  if (typeof value !== 'string') return null;
  const raw = String(value).trim();
  if (!raw.startsWith(DOOR_STYLE_OVERRIDE_PAINT_PREFIX)) return null;
  const style = raw.slice(DOOR_STYLE_OVERRIDE_PAINT_PREFIX.length).trim().toLowerCase();
  return isDoorStyleOverrideValue(style) ? style : null;
}

export function isDoorStyleOverridePaintToken(value: unknown): boolean {
  return parseDoorStyleOverridePaintToken(value) != null;
}

export const GLASS_FRAME_STYLE_PAINT_PREFIX = '__wp_glass_style__:';

export function encodeGlassFrameStylePaintToken(style: unknown): string {
  return `${GLASS_FRAME_STYLE_PAINT_PREFIX}${normalizeDoorStyleOverrideValue(style, 'profile')}`;
}

export function parseGlassFrameStylePaintToken(value: unknown): DoorStyleOverrideValue | null {
  if (typeof value !== 'string') return null;
  const raw = String(value).trim();
  if (!raw.startsWith(GLASS_FRAME_STYLE_PAINT_PREFIX)) return null;
  const style = raw.slice(GLASS_FRAME_STYLE_PAINT_PREFIX.length).trim().toLowerCase();
  return isDoorStyleOverrideValue(style) ? style : null;
}

export function isGlassPaintSelection(value: unknown): boolean {
  return resolveGlassFrameStylePaintSelection(value) != null;
}

export function resolveGlassFrameStylePaintSelection(value: unknown): DoorStyleOverrideValue | null {
  if (value === 'glass') return 'profile';
  return parseGlassFrameStylePaintToken(value);
}

export function resolveGlassFrameStyleValue(
  rawFrameStyle: unknown,
  globalDoorStyle: unknown
): DoorStyleOverrideValue {
  return normalizeDoorStyleOverrideValue(
    rawFrameStyle,
    normalizeDoorStyleOverrideValue(globalDoorStyle, 'profile')
  );
}

export function readDoorStyleMap(value: unknown): DoorStyleMap {
  const rec = asRecord(value);
  const out: DoorStyleMap = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const normalized = typeof rec[key] === 'string' ? String(rec[key]).trim().toLowerCase() : '';
    const canonicalKey = toDoorStyleOverrideMapKey(key);
    if (!canonicalKey || !isDoorStyleOverrideValue(normalized)) continue;
    if (canonicalKey === key || typeof out[canonicalKey] === 'undefined') out[canonicalKey] = normalized;
  }
  return out;
}

export function resolveDoorStyleOverrideValue(
  doorStyleMap: DoorStyleMap | Record<string, unknown> | null | undefined,
  partId: unknown
): DoorStyleOverrideValue | null {
  const map = asRecord(doorStyleMap);
  if (!map) return null;
  const directKey = typeof partId === 'string' ? partId.trim() : String(partId ?? '').trim();

  const effectiveEntry = readDoorVisualMapEntry(map, directKey);
  if (effectiveEntry && isDoorStyleOverrideValue(effectiveEntry.value)) return effectiveEntry.value;

  const scopedKey = toDoorStyleOverrideMapKey(directKey);
  if (scopedKey && scopedKey !== directKey) {
    const scopedEntry = readDoorVisualMapEntry(map, scopedKey);
    if (scopedEntry && isDoorStyleOverrideValue(scopedEntry.value)) return scopedEntry.value;
  }

  return null;
}

export function resolveDoorStylePaintSelectionState(args: {
  paintSelection: unknown;
  doorStyleMap: DoorStyleMap | Record<string, unknown> | null | undefined;
  partId: unknown;
}): {
  selection: DoorStyleOverrideValue | null;
  existingStyle: DoorStyleOverrideValue | null;
  willRemove: boolean;
} {
  const selection = parseDoorStyleOverridePaintToken(args.paintSelection);
  const existingStyle = resolveDoorStyleOverrideValue(args.doorStyleMap, args.partId);
  return {
    selection,
    existingStyle,
    willRemove: !!selection && existingStyle === selection,
  };
}

export function resolveEffectiveDoorStyle(
  globalStyle: unknown,
  doorStyleMap: DoorStyleMap | Record<string, unknown> | null | undefined,
  partId: unknown
): DoorStyleOverrideValue {
  return resolveDoorStyleOverrideValue(doorStyleMap, partId) || normalizeDoorStyleOverrideValue(globalStyle);
}
