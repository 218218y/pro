// Side-effect free installer for App.services.storage.
// Centralizes localStorage access with safe guards.
//
// Policy (delete-pass):
// - Canonical storage adapter lives in `App.services.storage`.
// - We do NOT install/override any legacy `root storage slot`.
// - All code must read storage through `App.services.storage` only.

import { ensureServiceSlot } from '../runtime/services_root_access.js';

type UnknownRecord = Record<string, unknown>;

export type StorageKeys = {
  SAVED_COLORS: string;
  SAVED_MODELS: string;
  AUTOSAVE_LATEST: string;
};

export type StorageApi = {
  KEYS: StorageKeys;
  getString: (key: unknown) => string | null;
  setString: (key: unknown, value: unknown) => boolean;
  remove: (key: unknown) => boolean;
  getJSON: <T = unknown>(key: unknown, fallback: T) => T;
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
});

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

function getJSON<T = unknown>(key: unknown, fallback: T): T {
  const s = getString(key);
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch (_) {
    return fallback;
  }
}

function setJSON(key: unknown, obj: unknown): boolean {
  try {
    return setString(key, JSON.stringify(obj));
  } catch (_) {
    return false;
  }
}

function createStorageApi(): StorageApi {
  return {
    KEYS: STORAGE_KEYS,
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
  const api = createStorageApi();

  if (storage.KEYS !== STORAGE_KEYS) storage.KEYS = STORAGE_KEYS;
  if (storage.getString !== api.getString) storage.getString = api.getString;
  if (storage.setString !== api.setString) storage.setString = api.setString;
  if (storage.remove !== api.remove) storage.remove = api.remove;
  if (storage.getJSON !== api.getJSON) storage.getJSON = api.getJSON;
  if (storage.setJSON !== api.setJSON) storage.setJSON = api.setJSON;
}
