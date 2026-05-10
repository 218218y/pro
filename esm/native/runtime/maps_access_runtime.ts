import type { ActionMetaLike, MapsNamespaceLike } from '../../../types';

import { mapsAccessReportNonFatal, mapsBagMaybe } from './maps_access_shared.js';

export type RuntimeMapsNamespace = MapsNamespaceLike;

export function readMapsBagOrNull(App: unknown) {
  return mapsBagMaybe(App);
}

export function trySetKey(
  App: unknown,
  maps: RuntimeMapsNamespace,
  mapName: string,
  key: string,
  value: unknown,
  meta?: ActionMetaLike,
  reportOp = 'maps_access.trySetKey'
): boolean {
  try {
    const setKey = maps.setKey;
    if (typeof setKey === 'function') {
      setKey.call(maps, mapName, key, value, meta);
      return true;
    }
  } catch (err) {
    mapsAccessReportNonFatal(reportOp, err, App);
  }
  return false;
}
