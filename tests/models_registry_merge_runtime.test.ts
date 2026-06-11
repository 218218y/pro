import test from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeImportedModelsInternal,
  ensureModelsLoadedInternal,
  setModelPresetsInternal,
  getAllModelsInternal,
} from '../esm/native/services/models_registry.ts';
import { modelsRuntimeState } from '../esm/native/services/models_registry_shared.ts';

function createApp() {
  const store = new Map<string, string>();
  const storage = {
    KEYS: { SAVED_MODELS: 'saved_models' },
    getJSON<T>(key: string, fallback: T): T {
      const raw = store.get(key);
      if (raw == null) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    getString(key: string) {
      return store.get(key) ?? null;
    },
    setJSON(key: string, value: unknown) {
      store.set(key, JSON.stringify(value));
    },
    setString(key: string, value: string) {
      store.set(key, value);
    },
  };

  return {
    App: {
      STORAGE: storage,
      AppSettings: { STORAGE: storage },
      services: { storage, models: {} },
    } as any,
    store,
  };
}

function resetRuntimeState() {
  modelsRuntimeState.normalizer = null;
  modelsRuntimeState.presets = [];
  modelsRuntimeState.loaded = false;
  modelsRuntimeState.all = [];
  modelsRuntimeState.listeners = [];
  modelsRuntimeState.revision = 0;
}

test('models registry ensureLoaded returns detached lists instead of the live runtime array', () => {
  const { App } = createApp();
  resetRuntimeState();

  setModelPresetsInternal(App, [] as any);
  assert.deepEqual(mergeImportedModelsInternal(App, [{ id: 'm1', name: 'Alpha' }] as any), {
    added: 1,
    updated: 0,
  });

  const first = ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });
  assert.equal(first.length, 1);
  first.push({ id: 'fake', name: 'Injected' } as any);

  const second = ensureModelsLoadedInternal(App, { silent: true });
  assert.equal(second.length, 1);
  assert.deepEqual(
    second.map((m: any) => ({ id: m.id, name: m.name })),
    [{ id: 'm1', name: 'Alpha' }]
  );
  assert.deepEqual(
    getAllModelsInternal(App).map((m: any) => ({ id: m.id, name: m.name })),
    [{ id: 'm1', name: 'Alpha' }]
  );
});

test('models registry merge preserves updated names and avoids stale duplicate ids', () => {
  const { App } = createApp();
  resetRuntimeState();

  setModelPresetsInternal(App, [] as any);
  assert.deepEqual(mergeImportedModelsInternal(App, [{ id: 'm1', name: 'Alpha' }] as any), {
    added: 1,
    updated: 0,
  });
  assert.deepEqual(mergeImportedModelsInternal(App, [{ id: 'm1', name: 'Beta' }] as any), {
    added: 0,
    updated: 1,
  });
  assert.deepEqual(
    mergeImportedModelsInternal(App, [
      { id: 'm1', name: 'Gamma' },
      { id: 'm2', name: 'Alpha' },
    ] as any),
    { added: 1, updated: 1 }
  );

  const loaded = ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });
  assert.deepEqual(
    loaded.map((m: any) => ({ id: String(m.id), name: String(m.name) })),
    [
      { id: 'm1', name: 'Gamma' },
      { id: 'm2', name: 'Alpha' },
    ]
  );
});

test('models registry merge keeps the latest duplicate entry within a single import batch', () => {
  const { App } = createApp();
  resetRuntimeState();

  setModelPresetsInternal(App, [] as any);
  assert.deepEqual(
    mergeImportedModelsInternal(App, [
      { id: 'm1', name: 'Alpha' },
      { id: 'm1', name: 'Beta' },
    ] as any),
    { added: 1, updated: 0 }
  );

  const loaded = ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });
  assert.equal(loaded.length, 1);
  assert.equal(String(loaded[0].id), 'm1');
  assert.equal(String(loaded[0].name), 'Beta');
});

test('models registry merge treats identical imported models as a no-op update', () => {
  const { App, store } = createApp();
  resetRuntimeState();

  setModelPresetsInternal(App, [] as any);
  assert.deepEqual(mergeImportedModelsInternal(App, [{ id: 'm1', name: 'Alpha', locked: true }] as any), {
    added: 1,
    updated: 0,
  });

  const firstPersisted = store.get('saved_models');
  assert.deepEqual(mergeImportedModelsInternal(App, [{ id: 'm1', name: 'Alpha', locked: true }] as any), {
    added: 0,
    updated: 0,
  });
  assert.equal(store.get('saved_models'), firstPersisted);

  const loaded = ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });
  assert.deepEqual(
    loaded.map((m: any) => ({ id: String(m.id), name: String(m.name), locked: !!m.locked })),
    [{ id: 'm1', name: 'Alpha', locked: true }]
  );
});
