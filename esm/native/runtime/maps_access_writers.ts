import type { ActionMetaLike, KnownMapName } from '../../../types';

import { ensureMapRecord, mapsAccessReportNonFatal, readOwn, writeOwn } from './maps_access_shared.js';
import { splitBottomKey, splitKey, splitPosKey } from './maps_access_split_helpers.js';
import type { HandleValue, HingeValue, KnownMapValue } from './maps_access_shared.js';
import { readMapsBagOrNull, trySetKey } from './maps_access_runtime.js';
import { cfgMap, setCfgVisualKeyedMapFromOwner } from './cfg_access_maps.js';
import { normalizeKnownMapSnapshot } from './maps_access_normalizers.js';
import {
  toCanonicalGrooveLinesCountMapKey,
  toCanonicalGroovesMapKey,
} from '../../shared/door_groove_key_contracts_shared.js';
import { toCanonicalDoorTrimTargetKey } from '../../shared/door_trim_key_contracts_shared.js';
import { toCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';
import {
  VISUAL_KEYED_MAP_NAMES,
  isVisualKeyedMapName,
  type VisualKeyedMapName,
} from './visual_keyed_map_names.js';

type GrooveContractMapName = 'groovesMap' | 'grooveLinesCountMap';
type CanonicalVisualPatchMapName = GrooveContractMapName | 'doorTrimMap';
type CanonicalOwnerPatchMapName =
  | CanonicalVisualPatchMapName
  | Extract<VisualKeyedMapName, 'removedDoorsMap' | 'splitDoorsMap' | 'splitDoorsBottomMap'>;

export type CanonicalVisualMapPatchEntry = Readonly<{
  key: unknown;
  value: unknown;
}>;

export { VISUAL_KEYED_MAP_NAMES, isVisualKeyedMapName };

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

function replaceMapRecord(target: Record<string, unknown>, next: Record<string, unknown>): void {
  for (const key of Object.keys(target)) delete target[key];
  for (const key of Object.keys(next)) writeOwn(target, key, next[key]);
}

function readGrooveContractMapKey(mapName: GrooveContractMapName, key: unknown): string {
  return mapName === 'groovesMap' ? toCanonicalGroovesMapKey(key) : toCanonicalGrooveLinesCountMapKey(key);
}

function readCanonicalVisualPatchKey(mapName: CanonicalVisualPatchMapName, key: unknown): string {
  if (mapName === 'doorTrimMap') return toCanonicalDoorTrimTargetKey(key);
  return readGrooveContractMapKey(mapName, key);
}

function readCanonicalOwnerPatchKey(mapName: CanonicalOwnerPatchMapName, key: unknown): string {
  if (mapName === 'removedDoorsMap') return toCanonicalRemovedDoorsMapKey(key);
  if (mapName === 'splitDoorsMap' || mapName === 'splitDoorsBottomMap') return String(key || '').trim();
  return readCanonicalVisualPatchKey(mapName, key);
}

function patchCanonicalOwnerMapEntries(
  App: unknown,
  mapName: CanonicalOwnerPatchMapName,
  entries: readonly CanonicalVisualMapPatchEntry[],
  meta?: ActionMetaLike
): boolean {
  if (!entries.length) return false;
  const maps = readMapsBagOrNull(App);
  const current = cfgMap(App, mapName);
  const nextMap = { ...(normalizeKnownMapSnapshot(mapName, current) as Record<string, unknown>) };

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const canonicalKey = readCanonicalOwnerPatchKey(mapName, entry.key);
    if (!canonicalKey) continue;
    if (entry.value == null) {
      delete nextMap[canonicalKey];
    } else {
      const normalizedEntryMap = normalizeKnownMapSnapshot(mapName, {
        [canonicalKey]: entry.value,
      }) as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(normalizedEntryMap, canonicalKey)) {
        nextMap[canonicalKey] = normalizedEntryMap[canonicalKey];
      } else {
        delete nextMap[canonicalKey];
      }
    }
  }

  try {
    setCfgVisualKeyedMapFromOwner(App, mapName, nextMap, meta);
    return true;
  } catch {
    if (maps) replaceMapRecord(ensureMapRecord(maps, mapName), nextMap);
  }
  return !!maps;
}

export function patchCanonicalVisualMapEntries(
  App: unknown,
  mapName: CanonicalVisualPatchMapName,
  entries: readonly CanonicalVisualMapPatchEntry[],
  meta?: ActionMetaLike
): boolean {
  return patchCanonicalOwnerMapEntries(App, mapName, entries, meta);
}

function writeGrooveContractMapKey(
  App: unknown,
  mapName: GrooveContractMapName,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): boolean {
  return patchCanonicalVisualMapEntries(App, mapName, [{ key, value }], meta);
}

export function writeHandle(
  App: unknown,
  partId: unknown,
  handleType: Exclude<HandleValue, undefined>,
  meta?: ActionMetaLike
): boolean {
  const id = String(partId || '');
  if (!id) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;
  try {
    const setHandle = maps.setHandle;
    if (typeof setHandle === 'function') {
      setHandle.call(maps, id, handleType, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeHandle.ownerRejected', err, App);
  }
  if (trySetKey(App, maps, 'handlesMap', id, handleType, meta, 'maps_access.writeHandle.setKey')) return true;
  const m = ensureMapRecord(maps, 'handlesMap');
  writeOwn(m, id, handleType);
  return true;
}

export function writeHinge(
  App: unknown,
  doorId: unknown,
  hinge: Exclude<HingeValue, undefined | null>,
  meta?: ActionMetaLike
): boolean {
  const id = String(doorId || '');
  if (!id) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  try {
    const setHinge = maps.setHinge;
    if (typeof setHinge === 'function') {
      setHinge.call(maps, id, hinge, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeHinge.ownerRejected', err, App);
  }

  if (trySetKey(App, maps, 'hingeMap', id, hinge, meta, 'maps_access.writeHinge.setKey')) return true;

  const m = ensureMapRecord(maps, 'hingeMap');
  writeOwn(m, id, hinge);
  return true;
}

export function writeMapKey<K extends string>(
  App: unknown,
  mapName: K,
  key: unknown,
  val: K extends KnownMapName ? KnownMapValue<Extract<K, KnownMapName>> : unknown,
  meta?: ActionMetaLike
): boolean {
  const name = String(mapName || '');
  if (!name) return false;
  if (name === 'doorTrimMap') {
    return patchCanonicalVisualMapEntries(App, name, [{ key, value: val }], meta);
  }
  if (name === 'groovesMap' || name === 'grooveLinesCountMap') {
    return writeGrooveContractMapKey(App, name, key, val, meta);
  }
  if (isVisualKeyedMapName(name)) {
    mapsAccessReportNonFatal(
      'maps_access.writeMapKey.visualKeyedMapRejected',
      new Error(`writeMapKey cannot write visual/keyed map "${name}"; use the map owner writer`),
      App
    );
    return false;
  }

  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  const k = String(key || '');
  if (!k) return false;

  if (trySetKey(App, maps, name, k, val, meta)) return true;

  const m = ensureMapRecord(maps, name);
  writeOwn(m, k, val);
  return true;
}

export function writeSplit(App: unknown, doorId: unknown, isSplit: boolean, meta?: ActionMetaLike): boolean {
  const id0 = readMapKey(doorId);
  if (!id0) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  const canonicalKey = splitKey(id0);
  if (!canonicalKey) return false;

  try {
    const fn = maps.setSplit;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isSplit, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplit.ownerRejected', err, App);
  }

  return patchCanonicalOwnerMapEntries(
    App,
    'splitDoorsMap',
    [{ key: canonicalKey, value: !!isSplit ? true : false }],
    meta
  );
}

export function writeSplitBottom(
  App: unknown,
  doorId: unknown,
  isOn: boolean,
  meta?: ActionMetaLike
): boolean {
  const id0 = readMapKey(doorId);
  if (!id0) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  const canonicalKey = splitBottomKey(id0);
  if (!canonicalKey) return false;

  try {
    const fn = maps.setSplitBottom;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isOn, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplitBottom.ownerRejected', err, App);
  }

  return patchCanonicalOwnerMapEntries(
    App,
    'splitDoorsBottomMap',
    [{ key: canonicalKey, value: !!isOn ? true : null }],
    meta
  );
}

export function writeSplitPositionList(
  App: unknown,
  doorId: unknown,
  positions: readonly number[],
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = splitPosKey(doorId);
  if (!canonicalKey) return false;
  const nextList = Array.isArray(positions) ? positions.filter(Number.isFinite) : [];
  return patchCanonicalOwnerMapEntries(
    App,
    'splitDoorsMap',
    [{ key: canonicalKey, value: nextList.length ? nextList : null }],
    meta
  );
}

export function writeRemoved(
  App: unknown,
  partId: unknown,
  isRemoved: boolean,
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = toCanonicalRemovedDoorsMapKey(partId);
  if (!canonicalKey) return false;
  return patchCanonicalOwnerMapEntries(
    App,
    'removedDoorsMap',
    [{ key: canonicalKey, value: isRemoved ? true : null }],
    meta
  );
}

function toggleKeyInMap(
  App: unknown,
  mapName: 'drawerDividersMap',
  key: string,
  meta?: ActionMetaLike
): boolean {
  if (!key) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  try {
    const fn = maps.toggleDivider;
    if (typeof fn === 'function') {
      fn.call(maps, key, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.toggleKeyInMap.ownerRejected', err, App);
  }

  const m = ensureMapRecord(maps, mapName);
  const cur = readOwn(m, key);
  const next = cur ? null : true;

  if (trySetKey(App, maps, mapName, key, next, meta, 'maps_access.toggleKeyInMap.setKey')) return true;

  writeOwn(m, key, next);
  return true;
}

function toggleCanonicalGrooveKeyInMap(
  App: unknown,
  mapName: 'groovesMap',
  key: unknown,
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = toCanonicalGroovesMapKey(key);
  if (!canonicalKey) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  const current = ensureMapRecord(maps, mapName);
  const nextMap = { ...normalizeKnownMapSnapshot(mapName, current) };
  if (nextMap[canonicalKey] === true) delete nextMap[canonicalKey];
  else nextMap[canonicalKey] = true;

  try {
    setCfgVisualKeyedMapFromOwner(App, mapName, nextMap, meta);
    return true;
  } catch {
    replaceMapRecord(current, nextMap);
  }

  return true;
}

export function toggleDivider(App: unknown, dividerKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleKeyInMap(App, 'drawerDividersMap', String(dividerKey || ''), meta);
}

export function toggleGrooveKey(App: unknown, grooveKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleCanonicalGrooveKeyInMap(App, 'groovesMap', grooveKey, meta);
}
