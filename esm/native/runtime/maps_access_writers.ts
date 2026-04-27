import type { ActionMetaLike, KnownMapName } from '../../../types';

import { ensureMapRecord, mapsAccessReportNonFatal, readOwn, writeOwn } from './maps_access_shared.js';
import type { HandleValue, HingeValue, KnownMapValue, MapsBagLike } from './maps_access_shared.js';
import { readMapsBagOrNull, trySetKey } from './maps_access_runtime.js';

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

function normalizePrefixedMapKey(value: unknown, prefix: string): string {
  const key = readMapKey(value);
  if (!key) return '';
  return key.indexOf(prefix) === 0 ? key : prefix + key;
}

function readLegacyPrefixedAliasKey(value: unknown, prefix: string): string {
  const key = readMapKey(value);
  if (!key) return '';
  return key.indexOf(prefix) === 0 ? key.slice(prefix.length) : key;
}

function clearLegacyPrefixedAlias(
  maps: MapsBagLike,
  mapName: KnownMapName,
  canonicalKey: string,
  aliasKey: string,
  meta: ActionMetaLike | undefined,
  reason: string
): void {
  if (!aliasKey || aliasKey === canonicalKey) return;
  if (trySetKey(maps, mapName, aliasKey, null, meta, reason)) return;
  const m = ensureMapRecord(maps, mapName);
  writeOwn(m, aliasKey, null);
}

function readPrefixedToggleState(
  map: Record<string, unknown>,
  canonicalKey: string,
  aliasKey: string
): boolean {
  if (canonicalKey && Object.prototype.hasOwnProperty.call(map, canonicalKey))
    return readOwn(map, canonicalKey) === true;
  if (aliasKey && aliasKey !== canonicalKey && Object.prototype.hasOwnProperty.call(map, aliasKey)) {
    return readOwn(map, aliasKey) === true;
  }
  return false;
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
    mapsAccessReportNonFatal('maps_access.writeHandle', err);
  }
  if (trySetKey(maps, 'handlesMap', id, handleType, meta, 'maps_access.writeHandle.setKey')) return true;
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
    mapsAccessReportNonFatal('maps_access.writeHinge', err);
  }

  if (trySetKey(maps, 'hingeMap', id, hinge, meta, 'maps_access.writeHinge.setKey')) return true;

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

  if (trySetKey(maps, name, k, val, meta)) return true;

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
  const aliasKey = readLegacyPrefixedAliasKey(id0, 'split_');

  try {
    const fn = maps.setSplit;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isSplit, meta);
      clearLegacyPrefixedAlias(
        maps,
        'splitDoorsMap',
        canonicalKey,
        aliasKey,
        meta,
        'maps_access.writeSplit.clearLegacyAlias'
      );
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplit', err);
  }

  const ok = writeMapKey(App, 'splitDoorsMap', canonicalKey, !!isSplit ? true : false, meta);
  if (ok) {
    clearLegacyPrefixedAlias(
      maps,
      'splitDoorsMap',
      canonicalKey,
      aliasKey,
      meta,
      'maps_access.writeSplit.clearLegacyAlias'
    );
  }
  return ok;
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
  const aliasKey = readLegacyPrefixedAliasKey(id0, 'splitb_');

  try {
    const fn = maps.setSplitBottom;
    if (typeof fn === 'function') {
      fn.call(maps, canonicalKey, !!isOn, meta);
      clearLegacyPrefixedAlias(
        maps,
        'splitDoorsBottomMap',
        canonicalKey,
        aliasKey,
        meta,
        'maps_access.writeSplitBottom.clearLegacyAlias'
      );
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.writeSplitBottom', err);
  }

  const ok = writeMapKey(App, 'splitDoorsBottomMap', canonicalKey, !!isOn ? true : null, meta);
  if (ok) {
    clearLegacyPrefixedAlias(
      maps,
      'splitDoorsBottomMap',
      canonicalKey,
      aliasKey,
      meta,
      'maps_access.writeSplitBottom.clearLegacyAlias'
    );
  }
  return ok;
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
    mapsAccessReportNonFatal('maps_access.toggleKeyInMap', err);
  }

  const m = ensureMapRecord(maps, mapName);
  const cur = readOwn(m, key);
  const next = cur ? null : true;

  if (trySetKey(maps, mapName, key, next, meta, 'maps_access.toggleKeyInMap.setKey')) return true;

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

  const aliasKey = readLegacyPrefixedAliasKey(key, prefix);
  const m = ensureMapRecord(maps, mapName);
  const next = readPrefixedToggleState(m, canonicalKey, aliasKey) ? null : true;

  if (
    trySetKey(maps, mapName, canonicalKey, next, meta, 'maps_access.toggleCanonicalPrefixedKeyInMap.setKey')
  ) {
    clearLegacyPrefixedAlias(
      maps,
      mapName,
      canonicalKey,
      aliasKey,
      meta,
      'maps_access.toggleCanonicalPrefixedKeyInMap.clearLegacyAlias'
    );
    return true;
  }

  writeOwn(m, canonicalKey, next);
  clearLegacyPrefixedAlias(
    maps,
    mapName,
    canonicalKey,
    aliasKey,
    meta,
    'maps_access.toggleCanonicalPrefixedKeyInMap.clearLegacyAlias'
  );
  return true;
}

export function toggleDivider(App: unknown, dividerKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleKeyInMap(App, 'drawerDividersMap', String(dividerKey || ''), meta);
}

export function toggleGrooveKey(App: unknown, grooveKey: unknown, meta?: ActionMetaLike): boolean {
  return toggleCanonicalPrefixedKeyInMap(App, 'groovesMap', 'groove_', grooveKey, meta);
}
