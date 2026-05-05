import type { DoorStyleMap, UnknownRecord } from '../../../types';

export type DoorStyleOverrideValue = 'flat' | 'profile' | 'tom';

export const DOOR_STYLE_OVERRIDE_PAINT_PREFIX = '__wp_door_style__:';

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isUnknownRecord(value) ? value : null;
}

export function normalizeDoorStyleOverrideValue(
  value: unknown,
  fallback: DoorStyleOverrideValue = 'flat'
): DoorStyleOverrideValue {
  const raw = String(value == null ? fallback : value)
    .trim()
    .toLowerCase();
  return raw === 'profile' || raw === 'tom' || raw === 'flat' ? raw : fallback;
}

export function isDoorStyleOverrideValue(value: unknown): value is DoorStyleOverrideValue {
  return value === 'flat' || value === 'profile' || value === 'tom';
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

function isSegmentedDoorBaseId(partId: string): boolean {
  return (
    /^(?:lower_)?d\d+$/.test(partId) ||
    /^(?:lower_)?corner_door_\d+$/.test(partId) ||
    /^(?:lower_)?corner_pent_door_\d+$/.test(partId)
  );
}

export function toDoorStyleOverrideMapKey(partId: unknown): string {
  const pid = typeof partId === 'string' ? partId.trim() : String(partId ?? '').trim();
  if (!pid) return '';
  if (/(?:_(?:full|top|bot|mid\d*))$/i.test(pid)) return pid;
  if (isSegmentedDoorBaseId(pid)) return `${pid}_full`;
  return pid;
}

export function readDoorStyleMap(value: unknown): DoorStyleMap {
  const rec = asRecord(value);
  const out: DoorStyleMap = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const normalized = typeof rec[key] === 'string' ? String(rec[key]).trim().toLowerCase() : '';
    if (isDoorStyleOverrideValue(normalized)) out[key] = normalized;
  }
  return out;
}

function readDoorStyleOverrideFromMap(map: UnknownRecord, key: string): DoorStyleOverrideValue | null {
  if (!key) return null;
  const value = typeof map[key] === 'string' ? String(map[key]).trim().toLowerCase() : '';
  return isDoorStyleOverrideValue(value) ? value : null;
}

export function resolveDoorStyleOverrideValue(
  doorStyleMap: DoorStyleMap | Record<string, unknown> | null | undefined,
  partId: unknown
): DoorStyleOverrideValue | null {
  const map = asRecord(doorStyleMap);
  if (!map) return null;
  const directKey = typeof partId === 'string' ? partId.trim() : String(partId ?? '').trim();
  const direct = readDoorStyleOverrideFromMap(map, directKey);
  if (direct) return direct;

  const segmentMatch = directKey.match(/^(.*)_(?:top|bot|mid\d*)$/i);
  if (segmentMatch && segmentMatch[1]) {
    const fullFromSegment = `${segmentMatch[1]}_full`;
    const fullStyle = readDoorStyleOverrideFromMap(map, fullFromSegment);
    if (fullStyle) return fullStyle;
  }

  const scopedKey = toDoorStyleOverrideMapKey(directKey);
  if (scopedKey && scopedKey !== directKey) {
    const scoped = readDoorStyleOverrideFromMap(map, scopedKey);
    if (scoped) return scoped;
  }

  const legacyMatch = (scopedKey || directKey).match(/^(.*)_(?:full|top|bot|mid\d*)$/i);
  if (legacyMatch && legacyMatch[1]) {
    const legacy = readDoorStyleOverrideFromMap(map, legacyMatch[1]);
    if (legacy) return legacy;
  }
  return null;
}

export function resolveEffectiveDoorStyle(
  globalStyle: unknown,
  doorStyleMap: DoorStyleMap | Record<string, unknown> | null | undefined,
  partId: unknown
): DoorStyleOverrideValue {
  return resolveDoorStyleOverrideValue(doorStyleMap, partId) || normalizeDoorStyleOverrideValue(globalStyle);
}
