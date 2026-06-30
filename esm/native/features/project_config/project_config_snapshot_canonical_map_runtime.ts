import { isCanonicalRemovedDoorsMapKey } from '../../../shared/removed_doors_map_keys_shared.js';
import {
  readGroovesMap,
  readSplitDoorsBottomMapValue,
  readSplitDoorsMapValue,
} from './project_config_map_readers.js';
import {
  readDoorStyleMap as normalizeDoorStyleMap,
  readDoorTrimMap,
  readMirrorLayoutMap,
} from '../door_authoring/api.js';
import {
  cloneComparableProjectConfigValue,
  isComparableRecord,
  isKnownProjectConfigMapKey,
} from './project_config_snapshot_canonical_shared.js';

function asMapRecord(value: unknown): Record<string, unknown> | null {
  return isComparableRecord(value) ? value : null;
}

function normalizeToggleValue(value: unknown): true | false | null | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null) return null;
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

function normalizeRemovedDoorsMap(value: unknown): Record<string, unknown> {
  const rec = asMapRecord(value);
  const out: Record<string, unknown> = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    if (!isCanonicalRemovedDoorsMapKey(key)) continue;
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
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 1) {
      out[key] = Math.max(1, Math.floor(entry));
    }
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

type ProjectConfigMapNormalizer = (value: unknown) => unknown;

const PROJECT_CONFIG_MAP_NORMALIZERS: Record<string, ProjectConfigMapNormalizer> = {
  handlesMap: normalizeHandlesMap,
  hingeMap: normalizeHingeMap,
  splitDoorsMap: readSplitDoorsMapValue,
  splitDoorsBottomMap: readSplitDoorsBottomMapValue,
  drawerDividersMap: normalizeToggleMap,
  groovesMap: readGroovesMap,
  removedDoorsMap: normalizeRemovedDoorsMap,
  roundedFrameSideShelvesMap: normalizeToggleMap,
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
