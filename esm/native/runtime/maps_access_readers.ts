import type { KnownMapName, MapsByName } from '../../../types';

import {
  bindMapReader,
  cloneMapRecord,
  createMapRecord,
  mapsAccessReportNonFatal,
  normalizeHandleValue,
  readMapFromBag,
  readOwn,
} from './maps_access_shared.js';
import type { HandleValue } from './maps_access_shared.js';
import {
  createEmptyKnownMapSnapshot,
  isKnownMapName,
  normalizeKnownMapSnapshot,
} from './maps_access_normalizers.js';
import { readMapsBagOrNull } from './maps_access_runtime.js';

type ReadMapFn = {
  <K extends KnownMapName>(App: unknown, mapName: K): MapsByName[K] | null;
  (App: unknown, mapName: string): Record<string, unknown> | null;
};

type ReadMapOrEmptyFn = {
  <K extends KnownMapName>(App: unknown, mapName: K): MapsByName[K];
  (App: unknown, mapName: string): Record<string, unknown>;
};

export function getGrooveReader(App: unknown): ((doorId: string) => boolean) | null {
  const maps = readMapsBagOrNull(App);
  if (!maps) return null;
  try {
    const bound = bindMapReader<boolean>(maps.getGroove, maps);
    if (bound) return bound;
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.getGrooveReader', err);
  }
  return null;
}

export function getCurtainReader(App: unknown): ((doorId: string) => string | null) | null {
  const maps = readMapsBagOrNull(App);
  if (!maps) return null;
  try {
    const bound = bindMapReader<string | null>(maps.getCurtain, maps);
    if (bound) return bound;
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.getCurtainReader', err);
  }
  return null;
}

export const readMap: ReadMapFn = (App: unknown, mapName: string) => {
  const name = String(mapName || '');
  if (!name) return null;
  const maps = readMapsBagOrNull(App);
  if (!maps) return null;
  const raw = readMapFromBag(maps, name);
  if (!raw) return null;
  if (isKnownMapName(name)) return normalizeKnownMapSnapshot(name, raw);
  return cloneMapRecord(raw);
};

export const readMapOrEmpty: ReadMapOrEmptyFn = (App: unknown, mapName: string) => {
  const name = String(mapName || '');
  const current = name ? readMap(App, name) : null;
  if (current) return current;
  if (isKnownMapName(name)) return createEmptyKnownMapSnapshot(name);
  return createMapRecord();
};

export function readHandle(App: unknown, partId: unknown): HandleValue {
  const id = String(partId || '');
  if (!id) return undefined;
  const maps = readMapsBagOrNull(App);
  if (!maps) return undefined;
  try {
    const getHandle = maps.getHandle;
    if (typeof getHandle === 'function') return normalizeHandleValue(getHandle.call(maps, id));
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.readHandle', err);
  }
  const handles = readMapFromBag(maps, 'handlesMap');
  return handles ? normalizeHandleValue(readOwn(handles, id)) : undefined;
}
