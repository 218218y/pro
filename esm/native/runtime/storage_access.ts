import type { StorageKeysLike, StorageNamespaceLike } from '../../../types';

import { asRecord } from './record.js';
import { getServiceSlotMaybe } from './services_root_access.js';
import { reportError } from './errors.js';

function readStorageService(value: unknown): StorageNamespaceLike | null {
  const rec = asRecord<StorageNamespaceLike>(value);
  return rec ? rec : null;
}

function readStorageKeys(value: unknown): StorageKeysLike | null {
  return asRecord<StorageKeysLike>(value);
}

function reportStorageAccessIssue(App: unknown, op: string, error: unknown): void {
  reportError(
    App,
    error,
    { where: 'native/runtime/storage_access', op, fatal: false },
    {
      consoleFallback: false,
    }
  );
}

export function getStorageServiceMaybe(App: unknown): StorageNamespaceLike | null {
  try {
    return readStorageService(getServiceSlotMaybe<StorageNamespaceLike>(App, 'storage'));
  } catch (error) {
    reportStorageAccessIssue(App, 'getStorageServiceMaybe', error);
    return null;
  }
}

export function getStorageKey(App: unknown, keyName: string, defaultKey: string): string {
  try {
    const storage = getStorageServiceMaybe(App);
    const keys = storage ? readStorageKeys(storage.KEYS) : null;
    const raw = keys && typeof keys[keyName] === 'string' ? String(keys[keyName] || '') : '';
    return raw || defaultKey;
  } catch (error) {
    reportStorageAccessIssue(App, 'getStorageKey', error);
    return defaultKey;
  }
}

export function getStorageString(App: unknown, key: string): string | null {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.getString === 'function' ? storage.getString : null;
    const out = fn ? fn.call(storage, key) : null;
    return typeof out === 'string' ? out : out == null ? null : String(out);
  } catch (error) {
    reportStorageAccessIssue(App, 'getStorageString', error);
    return null;
  }
}

export function getStorageJSON<T>(App: unknown, key: string, defaultValue: T): T {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn: (<TValue>(storageKey: string, storageDefault: TValue) => TValue) | null =
      storage && typeof storage.getJSON === 'function' ? storage.getJSON : null;
    const out = fn ? fn(key, defaultValue) : defaultValue;
    return out ?? defaultValue;
  } catch (error) {
    reportStorageAccessIssue(App, 'getStorageJSON', error);
    return defaultValue;
  }
}

export function setStorageString(App: unknown, key: string, value: string): boolean {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.setString === 'function' ? storage.setString : null;
    return !!(fn && fn.call(storage, key, value));
  } catch (error) {
    reportStorageAccessIssue(App, 'setStorageString', error);
    return false;
  }
}

export function setStorageJSON(App: unknown, key: string, value: unknown): boolean {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.setJSON === 'function' ? storage.setJSON : null;
    return !!(fn && fn.call(storage, key, value));
  } catch (error) {
    reportStorageAccessIssue(App, 'setStorageJSON', error);
    return false;
  }
}

export function removeStorageKey(App: unknown, key: string): boolean {
  try {
    const storage = getStorageServiceMaybe(App);
    const fn = storage && typeof storage.remove === 'function' ? storage.remove : null;
    return !!(fn && fn.call(storage, key));
  } catch (error) {
    reportStorageAccessIssue(App, 'removeStorageKey', error);
    return false;
  }
}
