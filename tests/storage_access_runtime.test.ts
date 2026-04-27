import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStorageJSON,
  getStorageKey,
  getStorageServiceMaybe,
  getStorageString,
  removeStorageKey,
  setStorageJSON,
  setStorageString,
} from '../esm/native/runtime/storage_access.ts';
import { installStorage } from '../esm/native/platform/storage.ts';

test('storage access runtime: canonical getters/setters use storage service seam', () => {
  const raw = new Map<string, string>();
  const App: any = {
    services: {
      storage: {
        KEYS: {
          AUTOSAVE_LATEST: 'wardrobe_autosave_latest',
        },
        getString(key: string) {
          return raw.has(key) ? (raw.get(key) ?? null) : null;
        },
        setString(key: string, value: string) {
          raw.set(key, value);
          return true;
        },
        getJSON<T>(key: string, fallback: T): T {
          const value = raw.get(key);
          if (!value) return fallback;
          try {
            return JSON.parse(value) as T;
          } catch {
            return fallback;
          }
        },
        setJSON(key: string, value: unknown) {
          raw.set(key, JSON.stringify(value));
          return true;
        },
        remove(key: string) {
          return raw.delete(key);
        },
      },
    },
  };

  assert.ok(getStorageServiceMaybe(App));
  assert.equal(getStorageKey(App, 'AUTOSAVE_LATEST', 'fallback'), 'wardrobe_autosave_latest');
  assert.equal(getStorageKey(App, 'MISSING', 'fallback'), 'fallback');

  assert.equal(setStorageString(App, 'plain', '123'), true);
  assert.equal(getStorageString(App, 'plain'), '123');

  assert.equal(setStorageJSON(App, 'json', { ok: true, count: 2 }), true);
  assert.deepEqual(getStorageJSON(App, 'json', { ok: false, count: 0 }), { ok: true, count: 2 });
  assert.deepEqual(getStorageJSON(App, 'missing', { ok: false, count: 0 }), { ok: false, count: 0 });

  assert.equal(removeStorageKey(App, 'plain'), true);
  assert.equal(getStorageString(App, 'plain'), null);
});

test('installStorage heals a damaged storage surface in place and keeps canonical method refs stable', () => {
  const App: any = {
    services: {
      storage: {
        getString() {
          return 'stale';
        },
        setJSON() {
          return false;
        },
      },
    },
  };

  installStorage(App);

  const storage = App.services.storage;
  const firstGetString = storage.getString;
  const firstSetString = storage.setString;
  const firstKeys = storage.KEYS;

  assert.equal(typeof storage.getJSON, 'function');
  assert.equal(typeof storage.remove, 'function');
  assert.equal(storage.KEYS.AUTOSAVE_LATEST, 'wardrobe_autosave_latest');

  delete storage.setJSON;
  storage.KEYS = { SAVED_COLORS: 'broken' };

  installStorage(App);

  assert.equal(storage.getString, firstGetString);
  assert.equal(storage.setString, firstSetString);
  assert.equal(storage.KEYS, firstKeys);
  assert.equal(typeof storage.setJSON, 'function');
  assert.equal(storage.KEYS.SAVED_MODELS, 'wardrobeSavedModels');
});
