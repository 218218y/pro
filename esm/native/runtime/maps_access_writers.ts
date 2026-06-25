import type { ActionMetaLike, KnownMapName } from '../../../types';

import { ensureMapRecord, mapsAccessReportNonFatal, readOwn, writeOwn } from './maps_access_shared.js';
import type { HandleValue, HingeValue, KnownMapValue } from './maps_access_shared.js';
import { readMapsBagOrNull, trySetKey } from './maps_access_runtime.js';

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

function normalizePrefixedMapKey(value: unknown, prefix: string): string {
  const key = readMapKey(value);
  if (!key) return '';
  return key.indexOf(prefix) === 0 ? key : prefix + key;
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
  const k = String(key || '');
  if (!name || !k) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

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

  const canonicalKey = normalizePrefixedMapKey(id0, 'split_');

  try {
    const fn = maps.setSplit;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isSplit, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplit.ownerRejected', err, App);
  }

  return writeMapKey(App, 'splitDoorsMap', canonicalKey, !!isSplit ? true : false, meta);
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

  const canonicalKey = normalizePrefixedMapKey(id0, 'splitb_');

  try {
    const fn = maps.setSplitBottom;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isOn, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplitBottom.ownerRejected', err, App);
  }

  return writeMapKey(App, 'splitDoorsBottomMap', canonicalKey, !!isOn ? true : null, meta);
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

function toggleCanonicalPrefixedKeyInMap(
  App: unknown,
  mapName: 'groovesMap',
  prefix: string,
  key: unknown,
  meta?: ActionMetaLike
): boolean {
  const canonicalKey = normalizePrefixedMapKey(key, prefix);
  if (!canonicalKey) return false;
  const maps = readMapsBagOrNull(App);
  if (!maps) return false;

  const m = ensureMapRecord(maps, mapName);
  const next = readOwn(m, canonicalKey) === true ? null : true;

  if (
    trySetKey(
      App,
      maps,
      mapName,
      canonicalKey,
      next,
      meta,
      'maps_access.toggleCanonicalPrefixedKeyInMap.setKey'
    )
  ) {
    return true;
  }

  writeOwn(m, canonicalKey, next);
  return true;
}

export function toggleDivider(App: unknown, dividerKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleKeyInMap(App, 'drawerDividersMap', String(dividerKey || ''), meta);
}

export function toggleGrooveKey(App: unknown, grooveKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleCanonicalPrefixedKeyInMap(App, 'groovesMap', 'groove_', grooveKey, meta);
}
