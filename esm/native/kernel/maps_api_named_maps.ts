import type { AppContainer, ActionMetaLike } from '../../../types';

import { patchConfigMap, setCfgVisualKeyedMapFromOwner } from '../runtime/cfg_access.js';
import {
  isVisualKeyedMapName,
  patchCanonicalVisualMapEntries,
  splitBottomKey,
  splitKey,
} from '../runtime/maps_access.js';
import { normalizeKnownMapSnapshot } from '../runtime/maps_access.js';
import type { MapsApiShared } from './maps_api_shared.js';
import { createRecord, asObject } from './maps_api_shared.js';
import { toCanonicalGroovesMapKey } from '../../shared/door_groove_key_contracts_shared.js';
import { toCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

function normalizePrefixedMapKey(value: unknown, prefix: string): string {
  const key = readMapKey(value);
  if (!key) return '';
  return key.indexOf(prefix) === 0 ? key : prefix + key;
}

function patchVisualKeyedMapEntry(
  App: AppContainer,
  shared: MapsApiShared,
  mapName: 'removedDoorsMap' | 'splitDoorsMap' | 'splitDoorsBottomMap' | 'groovesMap',
  canonicalKey: string,
  nextValue: unknown,
  meta: ActionMetaLike | undefined
): unknown {
  if (!canonicalKey) return undefined;
  const currentMap = normalizeKnownMapSnapshot(mapName, shared.readNamedMap(mapName));
  const nextMap = { ...currentMap };
  if (nextValue == null) {
    delete nextMap[canonicalKey];
  } else {
    const normalizedEntryMap = normalizeKnownMapSnapshot(mapName, { [canonicalKey]: nextValue });
    if (Object.prototype.hasOwnProperty.call(normalizedEntryMap, canonicalKey)) {
      nextMap[canonicalKey] = normalizedEntryMap[canonicalKey];
    } else {
      delete nextMap[canonicalKey];
    }
  }
  return setCfgVisualKeyedMapFromOwner(
    App,
    mapName,
    nextMap,
    shared.metaNorm(meta, 'maps:' + mapName + ':canonical')
  );
}

function patchCanonicalPrefixedMapEntry(
  App: AppContainer,
  shared: MapsApiShared,
  mapName: 'splitDoorsMap' | 'splitDoorsBottomMap',
  value: unknown,
  prefix: string,
  nextValue: unknown,
  meta: ActionMetaLike | undefined
): unknown {
  const canonicalKey = normalizePrefixedMapKey(value, prefix);
  if (!canonicalKey) return undefined;
  return patchVisualKeyedMapEntry(App, shared, mapName, canonicalKey, nextValue, meta);
}

export function installMapsApiNamedMaps(App: AppContainer, shared: MapsApiShared): void {
  const { maps, metaNorm, readConfigMap, readNamedMap, createMapPatch, reportNonFatal } = shared;

  maps.getMap = function getMap(mapName: string) {
    const name = String(mapName || '');
    return name ? readConfigMap(name) : createRecord();
  };

  maps.setKey = function setKey(mapName: string, key: string, val: unknown, meta?: ActionMetaLike) {
    const cleanMapName = String(mapName || '');
    const cleanKey = String(key || '');
    if (!cleanMapName || !cleanKey) return undefined;
    const metaFixed = metaNorm(meta, 'maps:setKey:' + cleanMapName);
    if (
      cleanMapName === 'doorTrimMap' ||
      cleanMapName === 'groovesMap' ||
      cleanMapName === 'grooveLinesCountMap'
    ) {
      return patchCanonicalVisualMapEntries(App, cleanMapName, [{ key: cleanKey, value: val }], metaFixed);
    }
    if (isVisualKeyedMapName(cleanMapName)) {
      reportNonFatal(
        'maps.setKey.visualKeyedMapRejected',
        new Error(`maps.setKey cannot write visual/keyed map "${cleanMapName}"; use the map owner writer`),
        6000
      );
      return undefined;
    }

    try {
      return patchConfigMap(App, cleanMapName, createMapPatch(cleanKey, val), metaFixed);
    } catch (_e) {
      reportNonFatal('maps.setKey.patchConfigMap', _e, 6000);
      return undefined;
    }
  };

  maps.toggleKey = function toggleKey(mapName: string, key: string, meta?: ActionMetaLike) {
    const cleanMapName = String(mapName || '');
    const cleanKey = String(key || '');
    if (!cleanMapName || !cleanKey) return undefined;
    const metaFixed = metaNorm(meta, 'maps:toggleKey:' + cleanMapName);
    const current = maps.getMap?.(cleanMapName) || createRecord();
    const currentRecord = asObject(current) || createRecord();
    const next = currentRecord[cleanKey] === true ? null : true;
    return maps.setKey?.(cleanMapName, cleanKey, next, metaFixed);
  };

  maps.toggleDivider = function toggleDivider(dividerKey: string, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:toggleDivider');
    const k = String(dividerKey || '');
    if (!k) return undefined;
    return maps.toggleKey?.('drawerDividersMap', k, metaFixed);
  };

  maps.toggleGrooveKey = function toggleGrooveKey(grooveKey: string, meta?: ActionMetaLike) {
    const canonicalKey = toCanonicalGroovesMapKey(grooveKey);
    if (!canonicalKey) return undefined;

    const nextMap = { ...normalizeKnownMapSnapshot('groovesMap', readNamedMap('groovesMap')) };
    if (nextMap[canonicalKey] === true) delete nextMap[canonicalKey];
    else nextMap[canonicalKey] = true;
    return setCfgVisualKeyedMapFromOwner(
      App,
      'groovesMap',
      nextMap,
      metaNorm(meta, 'maps:groovesMap:canonical')
    );
  };

  maps.getGroove = function getGroove(partId: string) {
    const canonicalKey = toCanonicalGroovesMapKey(partId);
    if (!canonicalKey) return false;
    return normalizeKnownMapSnapshot('groovesMap', readNamedMap('groovesMap'))[canonicalKey] === true;
  };

  maps.getCurtain = function getCurtain(partId: string) {
    const k = String(partId || '');
    if (!k) return null;
    const curtains = readNamedMap('curtainMap');
    const v1 = curtains[k];
    if (v1 == null || v1 === '' || v1 === 'none') return null;
    return String(v1);
  };

  maps.setSplit = function setSplit(doorId: string, isSplit: boolean, meta?: ActionMetaLike) {
    const k = readMapKey(doorId);
    if (!k) return undefined;
    const canonicalKey = splitKey(k);
    if (!canonicalKey) return undefined;
    return patchCanonicalPrefixedMapEntry(
      App,
      shared,
      'splitDoorsMap',
      canonicalKey,
      'split_',
      isSplit ? true : false,
      meta
    );
  };

  maps.setSplitBottom = function setSplitBottom(doorId: string, isOn: boolean, meta?: ActionMetaLike) {
    const k0 = readMapKey(doorId);
    if (!k0) return undefined;
    const canonicalKey = splitBottomKey(k0);
    if (!canonicalKey) return undefined;
    return patchCanonicalPrefixedMapEntry(
      App,
      shared,
      'splitDoorsBottomMap',
      canonicalKey,
      'splitb_',
      isOn ? true : null,
      meta
    );
  };

  maps.setHinge = function setHinge(doorId: string, hingeDir: unknown, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:setHinge');
    const k = String(doorId || '');
    if (!k) return undefined;
    return maps.setKey?.('hingeMap', k, hingeDir, metaFixed);
  };

  maps.setRemoved = function setRemoved(partId: string, isRemoved: boolean, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:setRemoved');
    const k = toCanonicalRemovedDoorsMapKey(partId);
    if (!k) return undefined;
    return patchVisualKeyedMapEntry(App, shared, 'removedDoorsMap', k, isRemoved ? true : null, metaFixed);
  };

  maps.getHandle = function getHandle(partId: string) {
    const handles = readNamedMap('handlesMap');
    const k = String(partId || '');
    if (!k) return null;
    return Object.prototype.hasOwnProperty.call(handles, k) ? handles[k] : null;
  };

  maps.setHandle = function setHandle(partId: string, handleType: unknown, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:setHandle');
    return maps.setKey?.('handlesMap', String(partId || ''), handleType, metaFixed);
  };
}
