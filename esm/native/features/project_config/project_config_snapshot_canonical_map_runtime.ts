import { readMirrorLayoutMap } from '../mirror_layout.js';
import { readDoorTrimMap } from '../door_trim.js';
import { readDoorStyleMap as normalizeDoorStyleMap } from '../door_style_overrides.js';
import {
  cloneComparableProjectConfigValue,
  isComparableRecord,
  isKnownProjectConfigMapKey,
} from './project_config_snapshot_canonical_shared.js';

function asMapRecord(value: unknown): Record<string, unknown> | null {
  return isComparableRecord(value) ? value : null;
}

function normalizeToggleValue(value: unknown): true | false | null | 1 | 0 | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null) return null;
  if (value === 1) return 1;
  if (value === 0) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value === 0 ? false : value === 1 ? true : undefined;
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (!s || s === 'null') return null;
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  }
  return undefined;
}

function normalizeToggleMap(value: unknown): Record<string, unknown> {
  const rec = asMapRecord(value);
  const out: Record<string, unknown> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const next = normalizeToggleValue(rec[key]);
    if (typeof next !== 'undefined') out[key] = next;
  }
  return out;
}

function normalizeNullableStringMap(value: unknown): Record<string, string | null> {
  const rec = asMapRecord(value);
  const out: Record<string, string | null> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

function normalizeNullablePositiveIntMap(value: unknown): Record<string, number | null> {
  const rec = asMapRecord(value);
  const out: Record<string, number | null> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    const n = Number(entry);
    if (Number.isFinite(n) && n >= 1) out[key] = Math.max(1, Math.floor(n));
  }
  return out;
}

function normalizeHandlesMap(value: unknown): Record<string, string | null> {
  const rec = asMapRecord(value);
  const out: Record<string, string | null> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

function normalizeHingeMap(value: unknown): Record<string, unknown> {
  const rec = asMapRecord(value);
  const out: Record<string, unknown> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') {
      out[key] = entry;
      continue;
    }
    if (isComparableRecord(entry)) out[key] = cloneComparableProjectConfigValue(entry);
  }
  return out;
}

function normalizeSplitDoorsMap(value: unknown): Record<string, unknown> {
  const rec = asMapRecord(value);
  const out: Record<string, unknown> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'boolean' || typeof entry === 'string') {
      out[key] = entry;
      continue;
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      out[key] = entry;
      continue;
    }
    if (Array.isArray(entry)) {
      const nums: number[] = [];
      for (const item of entry) {
        const num = typeof item === 'number' ? item : typeof item === 'string' ? Number(item) : NaN;
        if (Number.isFinite(num)) nums.push(num);
      }
      out[key] = nums;
    }
  }
  return out;
}

type ProjectConfigMapNormalizer = (value: unknown) => unknown;

const PROJECT_CONFIG_MAP_NORMALIZERS: Record<string, ProjectConfigMapNormalizer> = {
  handlesMap: normalizeHandlesMap,
  hingeMap: normalizeHingeMap,
  splitDoorsMap: normalizeSplitDoorsMap,
  splitDoorsBottomMap: normalizeToggleMap,
  drawerDividersMap: normalizeToggleMap,
  groovesMap: normalizeToggleMap,
  removedDoorsMap: normalizeToggleMap,
  grooveLinesCountMap: normalizeNullablePositiveIntMap,
  curtainMap: normalizeNullableStringMap,
  individualColors: normalizeNullableStringMap,
  doorSpecialMap: normalizeNullableStringMap,
  doorStyleMap: normalizeDoorStyleMap,
  mirrorLayoutMap: readMirrorLayoutMap,
  doorTrimMap: readDoorTrimMap,
};

export function normalizeKnownProjectConfigMap(key: string, value: unknown): unknown {
  if (!isKnownProjectConfigMapKey(key)) return cloneComparableProjectConfigValue(value);
  const normalize = PROJECT_CONFIG_MAP_NORMALIZERS[key];
  return normalize ? normalize(value) : cloneComparableProjectConfigValue(value);
}
