import type { AppContainer, ActionMetaLike } from '../../../types';

import { patchConfigMap } from '../runtime/cfg_access.js';
import type { MapsApiShared } from './maps_api_shared.js';
import { createRecord, asObject } from './maps_api_shared.js';

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

function readPrefixedMapFlag(map: Record<string, unknown>, value: unknown, prefix: string): boolean {
  const canonicalKey = normalizePrefixedMapKey(value, prefix);
  if (!canonicalKey) return false;
  if (Object.prototype.hasOwnProperty.call(map, canonicalKey)) return map[canonicalKey] === true;
  const aliasKey = readLegacyPrefixedAliasKey(value, prefix);
  return !!aliasKey && aliasKey !== canonicalKey && map[aliasKey] === true;
}

function patchCanonicalPrefixedMapEntry(
  App: AppContainer,
  shared: MapsApiShared,
  mapName: string,
  value: unknown,
  prefix: string,
  nextValue: unknown,
  meta: ActionMetaLike | undefined
): unknown {
  const canonicalKey = normalizePrefixedMapKey(value, prefix);
  if (!canonicalKey) return undefined;
  const aliasKey = readLegacyPrefixedAliasKey(value, prefix);
  const patch: Record<string, unknown> = { [canonicalKey]: nextValue };
  if (aliasKey && aliasKey !== canonicalKey) patch[aliasKey] = null;
  return patchConfigMap(App, mapName, patch, shared.metaNorm(meta, 'maps:' + mapName + ':canonical'));
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
    const k0 = readMapKey(grooveKey);
    if (!k0) return undefined;

    const current = readNamedMap('groovesMap');
    const next = readPrefixedMapFlag(current, k0, 'groove_') ? null : true;
    return patchCanonicalPrefixedMapEntry(App, shared, 'groovesMap', k0, 'groove_', next, meta);
  };

  maps.getGroove = function getGroove(partId: string) {
    const k = readMapKey(partId);
    if (!k) return false;
    return readPrefixedMapFlag(readNamedMap('groovesMap'), k, 'groove_');
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
    return patchCanonicalPrefixedMapEntry(
      App,
      shared,
      'splitDoorsMap',
      k,
      'split_',
      isSplit ? true : false,
      meta
    );
  };

  maps.setSplitBottom = function setSplitBottom(doorId: string, isOn: boolean, meta?: ActionMetaLike) {
    const k0 = readMapKey(doorId);
    if (!k0) return undefined;
    return patchCanonicalPrefixedMapEntry(
      App,
      shared,
      'splitDoorsBottomMap',
      k0,
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
    let pid = String(partId || '');
    if (!pid) return undefined;
    if (!/(?:_(?:full|top|bot|mid))$/i.test(pid)) {
      if (
        /^(?:lower_)?d\d+$/.test(pid) ||
        /^(?:lower_)?corner_door_\d+$/.test(pid) ||
        /^(?:lower_)?corner_pent_door_\d+$/.test(pid)
      ) {
        pid = pid + '_full';
      }
    }
    const k = pid.indexOf('removed_') === 0 ? pid : 'removed_' + pid;
    return maps.setKey?.('removedDoorsMap', k, isRemoved ? true : null, metaFixed);
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
