import type {
  AppContainer,
  CloudSyncLocalCollections,
  CloudSyncOrderList,
  SavedColorLike,
} from '../../../types';

import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import {
  asRecord,
  normalizeList,
  normalizeModelList,
  normalizeSavedColorsList,
  safeParseJSON,
} from './cloud_sync_support_shared.js';

export type StorageLike = {
  KEYS?: { SAVED_MODELS?: string; SAVED_COLORS?: string };
  getString?(key: unknown): string | null;
  setString?(key: unknown, value: unknown): boolean;
  getJSON?<T>(key: unknown, defaultValue: T): T;
  setJSON?(key: unknown, value: unknown): boolean;
  remove?(key: unknown): boolean;
};

export type CloudSyncStorageWrappedFnsLike = {
  setString?: StorageLike['setString'];
  setJSON?: StorageLike['setJSON'];
  remove?: StorageLike['remove'];
};

export type MarkedStorageLike = StorageLike & {
  __wp_cloudSync_origStorageFns?: CloudSyncStorageWrappedFnsLike;
};

export function isStorageLike(v: unknown): v is StorageLike {
  const rec = asRecord(v);
  return (
    !!rec &&
    (typeof rec.getString === 'undefined' || typeof rec.getString === 'function') &&
    (typeof rec.setString === 'undefined' || typeof rec.setString === 'function') &&
    (typeof rec.getJSON === 'undefined' || typeof rec.getJSON === 'function') &&
    (typeof rec.setJSON === 'undefined' || typeof rec.setJSON === 'function') &&
    (typeof rec.remove === 'undefined' || typeof rec.remove === 'function')
  );
}

export function storageWithMarker(storage: StorageLike): MarkedStorageLike {
  return storage;
}

export function restoreWrappedStorageFns(storage: StorageLike): void {
  const marked = storageWithMarker(storage);
  const orig = marked.__wp_cloudSync_origStorageFns || null;
  if (!orig) return;
  if ('setString' in orig) marked.setString = orig.setString;
  if ('setJSON' in orig) marked.setJSON = orig.setJSON;
  if ('remove' in orig) marked.remove = orig.remove;
  try {
    delete marked.__wp_cloudSync_origStorageFns;
  } catch {
    marked.__wp_cloudSync_origStorageFns = undefined;
  }
}

export function rememberWrappedStorageFns(storage: StorageLike): CloudSyncStorageWrappedFnsLike {
  const marked = storageWithMarker(storage);
  const orig: CloudSyncStorageWrappedFnsLike = {
    setString: marked.setString,
    setJSON: marked.setJSON,
    remove: marked.remove,
  };
  marked.__wp_cloudSync_origStorageFns = orig;
  return orig;
}

export function getStorage(App: AppContainer): StorageLike | null {
  try {
    const storage = getStorageServiceMaybe(App);
    return isStorageLike(storage) ? storage : null;
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'getStorage.read', e, { throttleMs: 8000 });
    return null;
  }
}

function readNormalizedStorageJsonList<T>(
  storage: StorageLike,
  key: string,
  normalize: (value: unknown) => T
): T {
  if (typeof storage.getJSON === 'function') return normalize(storage.getJSON(key, []));
  if (typeof storage.getString === 'function') {
    const raw = storage.getString(key) || '';
    return normalize(raw ? safeParseJSON(raw) : []);
  }
  return normalize([]);
}

export function readLocalOrderList(storage: StorageLike, key: string): CloudSyncOrderList {
  return readNormalizedStorageJsonList(storage, key, normalizeList);
}

export function readLocalModelList(storage: StorageLike, key: string) {
  return readNormalizedStorageJsonList(storage, key, normalizeModelList);
}

export function readLocalSavedColorsList(storage: StorageLike, key: string): SavedColorLike[] {
  return readNormalizedStorageJsonList(storage, key, normalizeSavedColorsList);
}

export function buildEmptyCloudSyncLocalCollections(): CloudSyncLocalCollections {
  return { m: [], c: [], o: [], p: [], h: [] };
}
