import type {
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  DoorTrimEntry,
  DoorTrimMap,
  GroovesMap,
  GrooveLinesCountMap,
  HandlesMap,
  HingeMap,
  IndividualColorsMap,
  MirrorLayoutMap,
  RemovedDoorsMap,
  RoundedFrameSideShelvesMap,
  SplitDoorsBottomMap,
  SplitDoorsMap,
  ToggleValue,
  UnknownRecord,
} from '../../../../types/index.js';

import {
  isCanonicalGrooveLinesCountMapKey,
  isCanonicalGroovesMapKey,
} from '../../../shared/door_groove_key_contracts_shared.js';
import { isCanonicalRemovedDoorsMapKey } from '../../../shared/removed_doors_map_keys_shared.js';
import { isCanonicalDoorVisualMapKey } from '../../../shared/door_visual_key_contracts_shared.js';
import { isCanonicalDoorTrimTargetKey } from '../../../shared/door_trim_key_contracts_shared.js';
import { normalizeDoorTrimEntryValueList } from '../../../shared/door_trim_value_contracts_shared.js';
import { readCanonicalMirrorLayoutMap } from '../../../shared/mirror_layout_contracts_shared.js';

function isObjectRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asObjectRecord(value: unknown): UnknownRecord | null {
  return isObjectRecord(value) ? value : null;
}

function asMapRecord(value: unknown): Record<string, unknown> {
  return asObjectRecord(value) ?? Object.create(null);
}

export function readStringMap(value: unknown): Record<string, string | null | undefined> {
  const src = asObjectRecord(value);
  if (!src) return {};
  const out: Record<string, string | null | undefined> = {};
  for (const [key, entry] of Object.entries(src)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function isToggleValue(value: unknown): value is ToggleValue | undefined {
  return value === true || value === false || value === null || typeof value === 'undefined';
}

export function readToggleMap(value: unknown): Record<string, ToggleValue | undefined> {
  const src = asObjectRecord(value);
  if (!src) return {};
  const out: Record<string, ToggleValue | undefined> = {};
  for (const [key, entry] of Object.entries(src)) {
    if (isToggleValue(entry)) out[key] = entry;
  }
  return out;
}

export function readHandlesMap(value: unknown): HandlesMap {
  return readStringMap(value);
}

export function readRemovedDoorsMap(value: unknown): RemovedDoorsMap {
  const src = readToggleMap(value);
  const out: RemovedDoorsMap = {};
  for (const [key, entry] of Object.entries(src)) {
    if (isCanonicalRemovedDoorsMapKey(key)) out[key] = entry;
  }
  return out;
}

export function readRoundedFrameSideShelvesMap(value: unknown): RoundedFrameSideShelvesMap {
  return readToggleMap(value);
}

export function readCurtainMap(value: unknown): CurtainMap {
  return readStringMap(value);
}

export function readGroovesMap(value: unknown): GroovesMap {
  const src = readToggleMap(value);
  const out: GroovesMap = {};
  for (const [key, entry] of Object.entries(src)) {
    if (isCanonicalGroovesMapKey(key)) out[key] = entry;
  }
  return out;
}

export function readGrooveLinesCountMap(value: unknown): GrooveLinesCountMap {
  const src = asObjectRecord(value);
  const out: GrooveLinesCountMap = {};
  if (!src) return out;
  for (const [key, entry] of Object.entries(src)) {
    if (!isCanonicalGrooveLinesCountMapKey(key)) continue;
    let next: number | null | undefined;
    if (entry === null) {
      next = null;
    } else if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 1) {
      next = Math.max(1, Math.floor(entry));
    }
    if (typeof next !== 'undefined') out[key] = next;
  }
  return out;
}

export function readIndividualColorsMap(value: unknown): IndividualColorsMap {
  return readStringMap(value);
}

export function readDoorSpecialMap(value: unknown): DoorSpecialMap {
  return readStringMap(value);
}

function readDoorStyleValue(value: unknown): DoorStyleMap[string] | undefined {
  const entry = typeof value === 'string' ? String(value).trim().toLowerCase() : '';
  return entry === 'flat' || entry === 'profile' || entry === 'double_profile' ? entry : undefined;
}

export function readDoorStyleMap(value: unknown): DoorStyleMap {
  const src = asObjectRecord(value);
  const out: DoorStyleMap = {};
  if (!src) return out;
  for (const [key, entry] of Object.entries(src)) {
    if (!isCanonicalDoorVisualMapKey(key)) continue;
    const next = readDoorStyleValue(entry);
    if (typeof next !== 'undefined') out[key] = next;
  }
  return out;
}

export function isHingeMapEntry(value: unknown): value is HingeMap[string] {
  return typeof value === 'string' || value === null || typeof value === 'undefined' || isObjectRecord(value);
}

export function readHingeMap(value: unknown): HingeMap {
  const src = asObjectRecord(value);
  if (!src) return {};
  const out: HingeMap = {};
  for (const [key, entry] of Object.entries(src)) {
    if (isHingeMapEntry(entry)) out[key] = entry;
  }
  return out;
}

function readBoolean(value: unknown): boolean | undefined {
  if (value === true) return true;
  if (value === false) return false;
  return undefined;
}

function readNullableBoolean(value: unknown): boolean | null | undefined {
  if (value === null) return null;
  return readBoolean(value);
}

function hasDoorSegmentSuffix(value: string): boolean {
  return /_(?:full|top|bot|mid\d*)$/i.test(value);
}

function parseSplitPositionList(raw: unknown): number[] {
  const out: number[] = [];
  const push = (value: unknown) => {
    const n = typeof value === 'number' ? value : NaN;
    if (!Number.isFinite(n)) return;
    out.push(Math.max(0, Math.min(1, n)));
  };

  try {
    if (Array.isArray(raw)) {
      for (const entry of raw) push(entry);
    }
  } catch {
    // Invalid split-position data produces no canonical entries.
  }

  out.sort((a, b) => a - b);
  const deduped: number[] = [];
  for (const value of out) {
    if (!deduped.length || Math.abs(deduped[deduped.length - 1] - value) > 1e-6) deduped.push(value);
  }
  return deduped;
}

export function readSplitDoorsMapValue(value: unknown): SplitDoorsMap {
  const src = asMapRecord(value);
  const out: SplitDoorsMap = {};
  const hasOwn = Object.prototype.hasOwnProperty;

  const assignSplitToggle = (key: string, entry: unknown) => {
    const next = readBoolean(entry);
    if (typeof next === 'undefined') return;
    if (hasOwn.call(out, key)) {
      if (out[key] === false || next === false) out[key] = false;
      else out[key] = true;
      return;
    }
    out[key] = next;
  };

  for (const rawKey in src) {
    if (!hasOwn.call(src, rawKey)) continue;
    const entry = src[rawKey];
    const key = String(rawKey || '');
    if (hasDoorSegmentSuffix(key)) continue;

    if (key.startsWith('split_')) {
      assignSplitToggle(key, entry);
      continue;
    }

    if (key.startsWith('splitpos_')) {
      const list = parseSplitPositionList(entry);
      if (list.length) out[key] = list;
    }
  }

  return out;
}

export function readSplitDoorsBottomMapValue(value: unknown): SplitDoorsBottomMap {
  const src = asMapRecord(value);
  const out: SplitDoorsBottomMap = {};
  const hasOwn = Object.prototype.hasOwnProperty;

  const assignNormalizedToggle = (key: string, entry: unknown): void => {
    const next = readNullableBoolean(entry);
    if (typeof next !== 'undefined') out[key] = next;
  };

  for (const rawKey in src) {
    if (!hasOwn.call(src, rawKey)) continue;
    const entry = src[rawKey];
    const key = String(rawKey || '');
    if (hasDoorSegmentSuffix(key)) continue;

    if (key.startsWith('splitb_')) assignNormalizedToggle(key, entry);
  }

  return out;
}

export function readMirrorLayoutConfigMap(value: unknown): MirrorLayoutMap {
  return readCanonicalMirrorLayoutMap(value);
}

function readDoorTrimConfigList(value: unknown): DoorTrimEntry[] {
  return normalizeDoorTrimEntryValueList(value, { useStableIdWhenMissing: true });
}

export function readDoorTrimConfigMap(value: unknown): DoorTrimMap {
  const src = asObjectRecord(value);
  const out: DoorTrimMap = {};
  if (!src) return out;
  for (const [key, entry] of Object.entries(src)) {
    if (!isCanonicalDoorTrimTargetKey(key)) continue;
    const next = readDoorTrimConfigList(entry);
    if (next.length) out[key] = next;
  }
  return out;
}
