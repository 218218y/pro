import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { cfgMapRecord, getInternalConfigMapOwnerNamespace, readMapRecord } from './cfg_access_shared.js';
import { applyConfigPatchReplaceKeys } from './cfg_access_scalars.js';

export const SIMPLE_WRITABLE_MAP_NAMES = [
  'handlesMap',
  'hingeMap',
  'curtainMap',
  'doorSpecialMap',
  'individualColors',
  'drawerDividersMap',
  'roundedFrameSideShelvesMap',
] as const;

export type SimpleWritableMapName = (typeof SIMPLE_WRITABLE_MAP_NAMES)[number];

const SIMPLE_WRITABLE_MAP_NAME_SET: ReadonlySet<string> = new Set(SIMPLE_WRITABLE_MAP_NAMES);

export function isSimpleWritableMapName(mapName: unknown): mapName is SimpleWritableMapName {
  return SIMPLE_WRITABLE_MAP_NAME_SET.has(String(mapName || ''));
}

function setCfgSimpleWritableMapFromOwner(
  App: unknown,
  mapName: SimpleWritableMapName,
  nextMap: unknown,
  meta?: ActionMetaLike
): UnknownRecord {
  const next = readMapRecord(nextMap);
  const cfgNs = getInternalConfigMapOwnerNamespace(App);
  if (typeof cfgNs?.setMap === 'function') {
    cfgNs.setMap(mapName, next, meta);
    return next;
  }

  applyConfigPatchReplaceKeys(App, { [mapName]: next }, { [mapName]: true }, meta);
  return next;
}

function readSimpleWritableMapFromOwner(
  App: unknown,
  mapName: SimpleWritableMapName
): Record<string, unknown> {
  return { ...cfgMapRecord(App, mapName) };
}

function areSimpleWritableValuesEquivalent(left: unknown, right: unknown, depth = 3): boolean {
  if (Object.is(left, right)) return true;
  if (depth <= 0) return false;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!areSimpleWritableValuesEquivalent(left[i], right[i], depth - 1)) return false;
    }
    return true;
  }

  const leftRecord = readMapRecord(left);
  const rightRecord = readMapRecord(right);
  const leftIsRecord = Object.is(leftRecord, left);
  const rightIsRecord = Object.is(rightRecord, right);
  if (!leftIsRecord || !rightIsRecord) return false;

  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(rightRecord, key)) return false;
    if (!areSimpleWritableValuesEquivalent(leftRecord[key], rightRecord[key], depth - 1)) return false;
  }
  return true;
}

export function patchSimpleWritableMapEntryFromOwner(
  App: unknown,
  mapName: SimpleWritableMapName,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): boolean {
  const cleanKey = String(key || '');
  if (!cleanKey) return false;

  const nextMap = readSimpleWritableMapFromOwner(App, mapName);
  const hasOwn = Object.prototype.hasOwnProperty.call(nextMap, cleanKey);
  if (value === undefined || value === null) {
    if (!hasOwn) return true;
    delete nextMap[cleanKey];
  } else {
    if (hasOwn && areSimpleWritableValuesEquivalent(nextMap[cleanKey], value)) return true;
    nextMap[cleanKey] = value;
  }

  setCfgSimpleWritableMapFromOwner(App, mapName, nextMap, meta);
  return true;
}

export function replaceSimpleWritableMapFromOwner(
  App: unknown,
  mapName: SimpleWritableMapName,
  nextMap: unknown,
  meta?: ActionMetaLike
): boolean {
  setCfgSimpleWritableMapFromOwner(App, mapName, nextMap, meta);
  return true;
}

export function toggleSimpleWritableBooleanMapEntryFromOwner(
  App: unknown,
  mapName: Extract<SimpleWritableMapName, 'drawerDividersMap'>,
  key: unknown,
  meta?: ActionMetaLike
): boolean {
  const cleanKey = String(key || '');
  if (!cleanKey) return false;
  const current = readSimpleWritableMapFromOwner(App, mapName);
  return patchSimpleWritableMapEntryFromOwner(App, mapName, cleanKey, current[cleanKey] ? null : true, meta);
}
