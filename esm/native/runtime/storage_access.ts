import type { StorageKeysLike, StorageNamespaceLike } from '../../../types';

import { asRecord } from './record.js';
import { getServiceSlotMaybe } from './services_root_access.js';

function readStorageService(value: unknown): StorageNamespaceLike | null {
  const rec = asRecord<StorageNamespaceLike>(value);
  return rec ? rec : null;
}

function readStorageKeys(value: unknown): StorageKeysLike | null {
  return asRecord<StorageKeysLike>(value);
}

export function getStorageServiceMaybe(App: unknown): StorageNamespaceLike | null {
  try {
    return readStorageService(getServiceSlotMaybe<StorageNamespaceLike>(App, 'storage'));
  } catch {
    return null;
  }
}

export function getStorageKey(App: unknown, keyName: string, fallback: string): string {
  try {
    const storage = getStorageServiceMaybe(App);
    const keys = storage ? readStorageKeys(storage.KEYS) : null;
    const raw = keys && typeof keys[keyName] === 'string' ? String(keys[keyName] || '') : '';
    return raw || fallback;
  } catch {
    return fallback;
  }
}

export function getStorageString(App: unknown, key: string): string | null {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.getString === 'function' ? storage.getString : null;
    const out = fn ? fn.call(storage, key) : null;
    return typeof out === 'string' ? out : out == null ? null : String(out);
  } catch {
    return null;
  }
}

export function getStorageJSON<T>(App: unknown, key: string, fallback: T): T {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn: (<TValue>(storageKey: string, storageFallback: TValue) => TValue) | null =
      storage && typeof storage.getJSON === 'function' ? storage.getJSON : null;
    const out = fn ? fn(key, fallback) : fallback;
    return out ?? fallback;
  } catch {
    return fallback;
  }
}

export function setStorageString(App: unknown, key: string, value: string): boolean {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.setString === 'function' ? storage.setString : null;
    return !!(fn && fn.call(storage, key, value));
  } catch {
    return false;
  }
}

export function setStorageJSON(App: unknown, key: string, value: unknown): boolean {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.setJSON === 'function' ? storage.setJSON : null;
    return !!(fn && fn.call(storage, key, value));
  } catch {
    return false;
  }
}

export function removeStorageKey(App: unknown, key: string): boolean {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.remove === 'function' ? storage.remove : null;
    return !!(fn && fn.call(storage, key));
  } catch {
    return false;
  }
}
