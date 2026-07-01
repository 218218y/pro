import type { ActionMetaLike, KnownMapName } from '../../../types';

import { ensureMapRecord, mapsAccessReportNonFatal, readOwn, writeOwn } from './maps_access_shared.js';
import { splitBottomKey, splitKey, splitPosKey } from './maps_access_split_helpers.js';
import type { HandleValue, HingeValue, KnownMapValue } from './maps_access_shared.js';
import { readMapsBagOrNull, trySetKey } from './maps_access_runtime.js';
import { toCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';
import { VISUAL_KEYED_MAP_NAMES, isVisualKeyedMapName } from './visual_keyed_map_names.js';
import {
  patchVisualKeyedMapEntriesFromOwner,
  toggleVisualKeyedMapEntryFromOwner,
  type VisualKeyedOwnerPatchMapName,
} from './visual_keyed_map_writer_owner.js';

export { VISUAL_KEYED_MAP_NAMES, isVisualKeyedMapName };

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

type VisualKeyedWriterEntry = { readonly key: unknown; readonly value: unknown };

function writeVisualKeyedMapEntryFromOwner(
  App: unknown,
  mapName: Extract<VisualKeyedOwnerPatchMapName, 'doorTrimMap' | 'groovesMap' | 'grooveLinesCountMap'>,
  key: unknown,
  value: unknown,
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(App, mapName, [{ key, value }], meta);
}

export function writeDoorTrimListForPart(
  App: unknown,
  partId: unknown,
  trimListOrNull: unknown,
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(
    App,
    'doorTrimMap',
    [{ key: partId, value: trimListOrNull }],
    meta
  );
}

export function patchDoorGrooveMapEntries(
  App: unknown,
  entries: readonly VisualKeyedWriterEntry[],
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(App, 'groovesMap', entries, meta);
}

export function patchDoorGrooveLinesCountEntries(
  App: unknown,
  entries: readonly VisualKeyedWriterEntry[],
  meta?: ActionMetaLike
): boolean {
  return patchVisualKeyedMapEntriesFromOwner(App, 'grooveLinesCountMap', entries, meta);
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
  if (name === 'doorTrimMap' || name === 'groovesMap' || name === 'grooveLinesCountMap') {
    return writeVisualKeyedMapEntryFromOwner(App, name, key, val, meta);
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

  const canonicalKey = splitKey(id0);
  if (!canonicalKey) return false;

  try {
    const fn = maps?.setSplit;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isSplit, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplit.ownerRejected', err, App);
  }

  return patchVisualKeyedMapEntriesFromOwner(
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

  const canonicalKey = splitBottomKey(id0);
  if (!canonicalKey) return false;

  try {
    const fn = maps?.setSplitBottom;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isOn, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplitBottom.ownerRejected', err, App);
  }

  return patchVisualKeyedMapEntriesFromOwner(
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
  return patchVisualKeyedMapEntriesFromOwner(
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
  return patchVisualKeyedMapEntriesFromOwner(
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
  return toggleVisualKeyedMapEntryFromOwner(App, mapName, key, meta);
}

export function toggleDivider(App: unknown, dividerKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleKeyInMap(App, 'drawerDividersMap', String(dividerKey || ''), meta);
}

export function toggleGrooveKey(App: unknown, grooveKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleCanonicalGrooveKeyInMap(App, 'groovesMap', grooveKey, meta);
}
