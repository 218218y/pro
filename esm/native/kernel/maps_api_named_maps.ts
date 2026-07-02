import type { AppContainer, ActionMetaLike } from '../../../types';

import { splitBottomKey, splitKey } from '../runtime/maps_access.js';
import { normalizeKnownMapSnapshot } from '../runtime/maps_access.js';
import {
  patchSimpleWritableMapEntryFromOwner,
  toggleSimpleWritableBooleanMapEntryFromOwner,
} from '../runtime/simple_writable_map_writer_owner.js';
import {
  patchVisualKeyedMapEntriesFromOwner,
  toggleVisualKeyedMapEntryFromOwner,
} from '../runtime/visual_keyed_map_writer_owner.js';
import type { MapsApiShared } from './maps_api_shared.js';
import { createRecord } from './maps_api_shared.js';
import { toCanonicalGroovesMapKey } from '../../shared/door_groove_key_contracts_shared.js';
import { toCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';

function readMapKey(value: unknown): string {
  return String(value || '').trim();
}

export function installMapsApiNamedMaps(App: AppContainer, shared: MapsApiShared): void {
  const { maps, metaNorm, readConfigMap, readNamedMap, reportNonFatal } = shared;

  delete maps.setKey;
  delete maps.toggleKey;

  maps.getMap = function getMap(mapName: string) {
    const name = String(mapName || '');
    return name ? readConfigMap(name) : createRecord();
  };

  maps.toggleDivider = function toggleDivider(dividerKey: string, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:toggleDivider');
    const k = String(dividerKey || '');
    if (!k) return undefined;
    try {
      return toggleSimpleWritableBooleanMapEntryFromOwner(App, 'drawerDividersMap', k, metaFixed);
    } catch (_e) {
      reportNonFatal('maps.toggleDivider.toggleSimpleWritableBooleanMapEntryFromOwner', _e, 6000);
      return undefined;
    }
  };

  maps.toggleGrooveKey = function toggleGrooveKey(grooveKey: string, meta?: ActionMetaLike) {
    const canonicalKey = toCanonicalGroovesMapKey(grooveKey);
    if (!canonicalKey) return undefined;
    return toggleVisualKeyedMapEntryFromOwner(
      App,
      'groovesMap',
      canonicalKey,
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
    return patchVisualKeyedMapEntriesFromOwner(
      App,
      'splitDoorsMap',
      [{ key: canonicalKey, value: isSplit ? true : false }],
      metaNorm(meta, 'maps:splitDoorsMap:canonical')
    );
  };

  maps.setSplitBottom = function setSplitBottom(doorId: string, isOn: boolean, meta?: ActionMetaLike) {
    const k0 = readMapKey(doorId);
    if (!k0) return undefined;
    const canonicalKey = splitBottomKey(k0);
    if (!canonicalKey) return undefined;
    return patchVisualKeyedMapEntriesFromOwner(
      App,
      'splitDoorsBottomMap',
      [{ key: canonicalKey, value: isOn ? true : null }],
      metaNorm(meta, 'maps:splitDoorsBottomMap:canonical')
    );
  };

  maps.setHinge = function setHinge(doorId: string, hingeDir: unknown, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:setHinge');
    const k = String(doorId || '');
    if (!k) return undefined;
    try {
      return patchSimpleWritableMapEntryFromOwner(App, 'hingeMap', k, hingeDir, metaFixed);
    } catch (_e) {
      reportNonFatal('maps.setHinge.patchSimpleWritableMapEntryFromOwner', _e, 6000);
      return undefined;
    }
  };

  maps.setRemoved = function setRemoved(partId: string, isRemoved: boolean, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:setRemoved');
    const k = toCanonicalRemovedDoorsMapKey(partId);
    if (!k) return undefined;
    return patchVisualKeyedMapEntriesFromOwner(
      App,
      'removedDoorsMap',
      [{ key: k, value: isRemoved ? true : null }],
      metaFixed
    );
  };

  maps.getHandle = function getHandle(partId: string) {
    const handles = readNamedMap('handlesMap');
    const k = String(partId || '');
    if (!k) return null;
    return Object.prototype.hasOwnProperty.call(handles, k) ? handles[k] : null;
  };

  maps.setHandle = function setHandle(partId: string, handleType: unknown, meta?: ActionMetaLike) {
    const metaFixed = metaNorm(meta, 'maps:setHandle');
    const k = String(partId || '');
    if (!k) return undefined;
    try {
      return patchSimpleWritableMapEntryFromOwner(App, 'handlesMap', k, handleType, metaFixed);
    } catch (_e) {
      reportNonFatal('maps.setHandle.patchSimpleWritableMapEntryFromOwner', _e, 6000);
      return undefined;
    }
  };
}
