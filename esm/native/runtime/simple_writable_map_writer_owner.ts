import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { cfgMapRecord, getConfigNamespace, readMapRecord } from './cfg_access_shared.js';
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
  const cfgNs = getConfigNamespace(App);
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
  if (value === undefined || value === null) {
    delete nextMap[cleanKey];
  } else {
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
