// Side-effect free installer for App.services.storage.
// Centralizes localStorage access with safe guards.
//
// Policy (delete-pass):
// - Canonical storage adapter lives in `App.services.storage`.
// - We do NOT install/override the obsolete root storage slot.
// - All code must read storage through `App.services.storage` only.

import { ensureServiceSlot } from '../runtime/services_root_access.js';
import { getDepsNamespaceMaybe } from '../runtime/deps_access.js';

type UnknownRecord = Record<string, unknown>;

export type StorageKeys = {
  SAVED_COLORS: string;
  SAVED_MODELS: string;
  AUTOSAVE_LATEST: string;
  PRIVATE_ROOM_CREDENTIAL: string;
};

export type StorageApi = {
  KEYS: StorageKeys;
  getString: (key: unknown) => string | null;
  setString: (key: unknown, value: unknown) => boolean;
  remove: (key: unknown) => boolean;
  getJSON: <T = unknown>(key: unknown, defaultValue: T) => T;
  setJSON: (key: unknown, obj: unknown) => boolean;
};

type AppLike = UnknownRecord & { services?: unknown };

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function assertApp(app: unknown): asserts app is AppLike {
  if (!isRecord(app)) {
    throw new Error('[WardrobePro][ESM] installStorage(app) requires an app object');
  }
}

const STORAGE_KEYS: StorageKeys = Object.freeze({
  SAVED_COLORS: 'wardrobeSavedColors',
  SAVED_MODELS: 'wardrobeSavedModels',
  AUTOSAVE_LATEST: 'wardrobe_autosave_latest',
  PRIVATE_ROOM_CREDENTIAL: 'wp_private_room_credential',
});

function readStorageNamespace(app: unknown): string {
  try {
    const cfg = getDepsNamespaceMaybe(app, 'config') as UnknownRecord | null;
    const raw = cfg && typeof cfg.storageNamespace === 'string' ? cfg.storageNamespace.trim() : '';
    if (!raw) return '';

    // Keep keys readable and safe for localStorage/debug exports.
    return raw
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 64);
  } catch (_) {
    return '';
  }
}

function applyNamespaceToKey(namespace: string, key: string): string {
  return namespace ? `${namespace}:${key}` : key;
}

function createStorageKeys(app: unknown): StorageKeys {
  const ns = readStorageNamespace(app);
  if (!ns) return STORAGE_KEYS;
  return Object.freeze({
    SAVED_COLORS: applyNamespaceToKey(ns, STORAGE_KEYS.SAVED_COLORS),
    SAVED_MODELS: applyNamespaceToKey(ns, STORAGE_KEYS.SAVED_MODELS),
    AUTOSAVE_LATEST: applyNamespaceToKey(ns, STORAGE_KEYS.AUTOSAVE_LATEST),
    PRIVATE_ROOM_CREDENTIAL: applyNamespaceToKey(ns, STORAGE_KEYS.PRIVATE_ROOM_CREDENTIAL),
  });
}

function hasLS(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch (_) {
    return false;
  }
}

function getString(key: unknown): string | null {
  try {
    if (!hasLS()) return null;
    return localStorage.getItem(String(key));
  } catch (_) {
    return null;
  }
}

function setString(key: unknown, value: unknown): boolean {
  try {
    if (!hasLS()) return false;
    localStorage.setItem(String(key), String(value));
    return true;
  } catch (_) {
    return false;
  }
}

function remove(key: unknown): boolean {
  try {
    if (!hasLS()) return false;
    localStorage.removeItem(String(key));
    return true;
  } catch (_) {
    return false;
  }
}

function getJSON<T = unknown>(key: unknown, defaultValue: T): T {
  const s = getString(key);
  if (!s) return defaultValue;
  try {
    return JSON.parse(s);
  } catch (_) {
    return defaultValue;
  }
}

function setJSON(key: unknown, obj: unknown): boolean {
  try {
    return setString(key, JSON.stringify(obj));
  } catch (_) {
    return false;
  }
}

function createStorageApi(app: unknown): StorageApi {
  return {
    KEYS: createStorageKeys(app),
    getString,
    setString,
    remove,
    getJSON,
    setJSON,
  };
}

export function installStorage(app: unknown): void {
  assertApp(app);

  const storage = ensureServiceSlot<StorageApi>(app, 'storage');
  const api = createStorageApi(app);

  storage.KEYS = api.KEYS;
  if (storage.getString !== api.getString) storage.getString = api.getString;
  if (storage.setString !== api.setString) storage.setString = api.setString;
  if (storage.remove !== api.remove) storage.remove = api.remove;
  if (storage.getJSON !== api.getJSON) storage.getJSON = api.getJSON;
  if (storage.setJSON !== api.setJSON) storage.setJSON = api.setJSON;
}
