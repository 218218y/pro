import type {
  AppContainer,
  ActionMetaLike,
  KnownMapName,
  MapsByName,
  MapsNamespaceLike,
  SavedColorLike,
  UnknownRecord,
} from '../../../types';

import { getCfg } from './store_access.js';
import { reportErrorThrottled } from '../runtime/api.js';
import { normalizeColorSwatchesOrder, normalizeSavedColorsList } from '../runtime/maps_access_shared.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';

type Obj = Record<string, unknown>;
export type StorageKeysLike = Obj & { SAVED_COLORS?: string };
export type StorageSurfaceLike = Obj & {
  KEYS?: StorageKeysLike;
  setJSON?: (key: string, value: unknown) => unknown;
  setString?: (key: string, value: string) => unknown;
};
export type MapsNamespaceRecord = MapsNamespaceLike & Obj;
export type CfgSnapshotLike = UnknownRecord & {
  savedColors?: unknown;
  colorSwatchesOrder?: unknown;
};
export type SavedColorsSurfaceList = Array<SavedColorLike | string>;
export type ColorSwatchesOrderSurfaceList = Array<string | null | undefined>;

export function isObjectRecord<T extends Obj = Obj>(x: unknown): x is T {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

export function asObject<T extends Obj = Obj>(x: unknown): T | null {
  return isObjectRecord<T>(x) ? x : null;
}

export function createRecord(): UnknownRecord {
  const next: UnknownRecord = Object.create(null);
  return next;
}

export function cloneArrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : [];
}

export function normalizeSavedColorsSurfaceList(value: unknown): SavedColorsSurfaceList {
  const normalized = normalizeSavedColorsList(value);
  const out: SavedColorsSurfaceList = [];
  for (const entry of normalized) {
    out.push(entry && typeof entry === 'object' && !Array.isArray(entry) ? { ...entry } : entry);
  }
  return out;
}

export function normalizeColorSwatchesOrderSurfaceList(value: unknown): ColorSwatchesOrderSurfaceList {
  return normalizeColorSwatchesOrder(value);
}

export interface MapsApiShared {
  maps: MapsNamespaceRecord;
  reportNonFatal: (op: string, err: unknown, throttleMs?: number) => void;
  metaNorm: (meta: ActionMetaLike | UnknownRecord | null | undefined, source?: string) => ActionMetaLike;
  safeCfg: () => CfgSnapshotLike;
  readConfigMap: (mapName: string) => UnknownRecord;
  readNamedMap: <K extends KnownMapName>(mapName: K) => MapsByName[K];
  createMapPatch: (key: string, value: unknown) => UnknownRecord;
  shouldSkipStorageWrite: (meta: ActionMetaLike | UnknownRecord | null | undefined) => boolean;
  writeStorageJson: (key: string, value: unknown, op: string) => void;
  getSavedColorsStorageKey: () => string;
}

function readStorage(App: AppContainer): StorageSurfaceLike | null {
  return asObject<StorageSurfaceLike>(getStorageServiceMaybe(App));
}

function ensureMapsNamespace(App: AppContainer): MapsNamespaceRecord {
  const appRecord = asObject<Obj & { maps?: unknown }>(App);
  if (!appRecord) throw new Error('[WardrobePro][maps_api] failed to initialize app record');
  if (!asObject(appRecord['maps'])) appRecord['maps'] = createRecord();
  const maps = asObject<MapsNamespaceRecord>(appRecord['maps']);
  if (!maps) throw new Error('[WardrobePro][maps_api] failed to initialize maps namespace');
  return maps;
}

export function createMapsApiShared(App: AppContainer): MapsApiShared {
  const maps = ensureMapsNamespace(App);

  function reportNonFatal(op: string, err: unknown, throttleMs = 4000): void {
    reportErrorThrottled(App, err, { where: 'native/kernel/maps_api', op, throttleMs });
    try {
      console.warn('[WardrobePro][maps_api]', op, err);
    } catch {
      // ignore
    }
  }

  function metaNorm(
    meta: ActionMetaLike | UnknownRecord | null | undefined,
    source?: string
  ): ActionMetaLike {
    const m = asObject(meta) || {};
    const out: ActionMetaLike = Object.assign({}, m);
    if (source && typeof out.source !== 'string') out.source = source;
    return out;
  }

  function safeCfg(): CfgSnapshotLike {
    try {
      return asObject<CfgSnapshotLike>(getCfg(App)) || createRecord();
    } catch (_e) {
      reportNonFatal('safeCfg', _e, 6000);
      return createRecord();
    }
  }

  function readConfigMap(mapName: string): UnknownRecord {
    const cfg = safeCfg();
    const value = cfg[mapName];
    return asObject(value) || createRecord();
  }

  function readNamedMap<K extends KnownMapName>(mapName: K): MapsByName[K] {
    const cfg = safeCfg();
    const value = asObject<MapsByName[K]>(cfg[mapName]);
    if (value) return value;
    const empty: MapsByName[K] = {};
    return empty;
  }

  function createMapPatch(key: string, value: unknown): UnknownRecord {
    const patch = createRecord();
    patch[key] = value;
    return patch;
  }

  function shouldSkipStorageWrite(meta: ActionMetaLike | UnknownRecord | null | undefined): boolean {
    try {
      const m = asObject(meta) || {};
      return !!m.noStorageWrite;
    } catch (_e) {
      reportNonFatal('shouldSkipStorageWrite', _e, 6000);
      return false;
    }
  }

  function writeStorageJson(key: string, value: unknown, op: string): void {
    try {
      const storage = readStorage(App);
      if (!storage) return;
      if (typeof storage.setJSON === 'function') {
        storage.setJSON(key, value);
        return;
      }
      if (typeof storage.setString === 'function') {
        storage.setString(key, JSON.stringify(value));
      }
    } catch (_e) {
      reportNonFatal(op, _e, 6000);
    }
  }

  function getSavedColorsStorageKey(): string {
    try {
      const storage = readStorage(App);
      const keys = storage ? asObject<StorageKeysLike>(storage.KEYS) || {} : {};
      const k = typeof keys.SAVED_COLORS === 'string' ? String(keys.SAVED_COLORS) : '';
      return k || 'wardrobeSavedColors';
    } catch (_e) {
      reportNonFatal('getSavedColorsStorageKey', _e, 6000);
      return 'wardrobeSavedColors';
    }
  }

  return {
    maps,
    reportNonFatal,
    metaNorm,
    safeCfg,
    readConfigMap,
    readNamedMap,
    createMapPatch,
    shouldSkipStorageWrite,
    writeStorageJson,
    getSavedColorsStorageKey,
  };
}
