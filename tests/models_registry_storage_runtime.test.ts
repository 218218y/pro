import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureModelsLoadedInternal,
  getModelsRuntimeStateForApp,
  modelsRuntimeState,
  onModelsChangeInternal,
  setModelPresetsInternal,
  setModelsNormalizerInternal,
} from '../esm/native/services/models_registry.ts';
import { syncModelsStateToApp } from '../esm/native/services/models_registry_storage_state.ts';

import {
  _getStoredHiddenPresets,
  _getStoredPresetOrder,
  _setStoredHiddenPresets,
  _setStoredPresetOrder,
} from '../esm/native/services/models_registry.ts';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function resetModelsRuntimeState(): void {
  modelsRuntimeState.normalizer = null;
  modelsRuntimeState.presets = [];
  modelsRuntimeState.loaded = false;
  modelsRuntimeState.all = [];
  modelsRuntimeState.listeners = [];
  modelsRuntimeState.revision = 0;
}

function summarizeSavedModels(value: unknown) {
  return Array.isArray(value)
    ? value.map(model => ({
        id: (model as Record<string, unknown>)?.id,
        name: (model as Record<string, unknown>)?.name,
        isPreset: (model as Record<string, unknown>)?.isPreset,
      }))
    : [];
}

function assertCanonicalModelShape(value: unknown): void {
  assert.equal(Array.isArray(value), true);
  const first = Array.isArray(value) && value.length > 0 ? (value[0] as Record<string, unknown>) : null;
  assert.ok(first && typeof first === 'object');
  assert.equal(Array.isArray(first?.modulesConfiguration), true);
  assert.equal(Array.isArray(first?.stackSplitLowerModulesConfiguration), true);
  assert.equal(typeof first?.cornerConfiguration, 'object');
}

function createApp(initialStore: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(clone(initialStore)));
  const writes: Record<string, unknown> = Object.create(null);
  const storage = {
    KEYS: { SAVED_MODELS: 'savedModels' },
    getJSON<T>(key: string, fallback: T): T {
      return store.has(key) ? clone(store.get(key) as T) : fallback;
    },
    setJSON(key: string, value: unknown): void {
      const next = clone(value);
      writes[key] = next;
      store.set(key, next);
    },
  };
  const App = {
    services: {
      models: {},
      storage,
    },
  } as any;
  return { App, storage, writes, store };
}

test.beforeEach(() => {
  resetModelsRuntimeState();
});

test.after(() => {
  resetModelsRuntimeState();
});

test('models registry runtime: ensureLoaded repairs stored preset and user-model collections to canonical form', () => {
  const { App, writes } = createApp({
    savedModels: [
      { id: ' user-1 ', name: ' User 1 ' },
      { id: 'user-1', name: 'Duplicate should drop' },
      { id: '', name: 'broken' },
    ],
    'savedModels:presetOrder': [' preset-b ', 'missing', 'preset-b', 'preset-a'],
    'savedModels:hiddenPresets': ['missing', ' preset-a ', 'preset-a', ''],
  });

  setModelPresetsInternal(App, [
    { id: 'preset-a', name: 'Preset A' },
    { id: 'preset-b', name: 'Preset B' },
  ] as any);

  const loaded = ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });

  assert.deepEqual(
    loaded.map(model => model.id),
    ['preset-b', 'user-1']
  );
  assert.deepEqual(writes['savedModels:presetOrder'], ['preset-b', 'preset-a']);
  assert.deepEqual(writes['savedModels:hiddenPresets'], ['preset-a']);
  assertCanonicalModelShape(writes.savedModels);
  assert.deepEqual(summarizeSavedModels(writes.savedModels), [
    { id: 'user-1', name: 'User 1', isPreset: false },
  ]);
});

test('models registry runtime: preset-order repair preserves live user presets alongside core presets', () => {
  const { App, writes } = createApp({
    savedModels: [
      { id: ' user-preset ', name: ' User Preset ', isPreset: true },
      { id: 'user-preset', name: 'duplicate drop', isPreset: true },
    ],
    'savedModels:presetOrder': [' user-preset ', 'missing', 'preset-a', 'user-preset'],
    'savedModels:hiddenPresets': [],
  });

  setModelPresetsInternal(App, [{ id: 'preset-a', name: 'Preset A' }] as any);

  const loaded = ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });

  assert.deepEqual(
    loaded.map(model => model.id),
    ['user-preset', 'preset-a']
  );
  assertCanonicalModelShape(writes.savedModels);
  assert.deepEqual(summarizeSavedModels(writes.savedModels), [
    { id: 'user-preset', name: 'User Preset', isPreset: true },
  ]);
  assert.deepEqual(writes['savedModels:presetOrder'], ['user-preset', 'preset-a']);
});

test('models registry storage: preset-order and hidden-preset writes stay canonical for string-only storage backends', () => {
  const store = new Map<string, string>();
  const writes: Record<string, string> = Object.create(null);
  const App = {
    services: {
      models: {},
      storage: {
        KEYS: { SAVED_MODELS: 'savedModels' },
        getString(key: string): string {
          return store.get(key) ?? '';
        },
        setString(key: string, value: string): void {
          writes[key] = value;
          store.set(key, value);
        },
      },
    },
  } as any;

  assert.equal(_setStoredPresetOrder(App, [' preset-b ', '', 'preset-a', 'preset-b']), true);
  assert.equal(_setStoredHiddenPresets(App, [' preset-a ', 'preset-a', '', 'preset-c']), true);

  assert.equal(writes['savedModels:presetOrder'], JSON.stringify(['preset-b', 'preset-a']));
  assert.equal(writes['savedModels:hiddenPresets'], JSON.stringify(['preset-a', 'preset-c']));
  assert.deepEqual(_getStoredPresetOrder(App), ['preset-b', 'preset-a']);
  assert.deepEqual(_getStoredHiddenPresets(App), ['preset-a', 'preset-c']);
});

test('models registry runtime: onChange listeners receive detached model snapshots instead of live state objects', () => {
  const { App } = createApp({ savedModels: [{ id: ' user-1 ', name: ' User 1 ' }] });
  setModelPresetsInternal(App, [{ id: 'preset-a', name: 'Preset A' }] as any);
  ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });

  const seen: any[] = [];
  onModelsChangeInternal(App, (models: any[]) => {
    seen.push(models);
    models[0].name = 'mutated listener payload';
  });

  ensureModelsLoadedInternal(App, { forceRebuild: true, silent: false });

  const state = getModelsRuntimeStateForApp(App);
  assert.equal(seen.length, 1);
  assert.notEqual(seen[0], state.all);
  assert.notEqual(seen[0][0], state.all[0]);
  assert.equal(state.all[0]?.name, 'Preset A');
});

test('models registry runtime: app-scoped runtime state keeps normalizers and loaded collections isolated per app', () => {
  const a = createApp({ savedModels: [{ id: ' shared ', name: ' Shared ' }] });
  const b = createApp({ savedModels: [{ id: ' shared ', name: ' Shared ' }] });

  setModelsNormalizerInternal(
    a.App,
    model => ({ ...model, name: `A:${String((model as any)?.name || '')}` }) as any
  );
  setModelPresetsInternal(a.App, [{ id: 'preset-a', name: 'Preset A' }] as any);
  setModelPresetsInternal(b.App, [{ id: 'preset-b', name: 'Preset B' }] as any);

  const loadedA = ensureModelsLoadedInternal(a.App, { forceRebuild: true, silent: true });
  const loadedB = ensureModelsLoadedInternal(b.App, { forceRebuild: true, silent: true });

  assert.deepEqual(
    loadedA.map(model => model.name),
    ['A:Preset A', 'A:Shared']
  );
  assert.deepEqual(
    loadedB.map(model => model.name),
    ['Preset B', 'Shared']
  );

  const stateA = getModelsRuntimeStateForApp(a.App);
  const stateB = getModelsRuntimeStateForApp(b.App);
  assert.notEqual(stateA, stateB);
  assert.deepEqual(
    stateA.all.map(model => model.id),
    ['preset-a', 'shared']
  );
  assert.deepEqual(
    stateB.all.map(model => model.id),
    ['preset-b', 'shared']
  );
  assert.notEqual(a.App.services.models._all, stateA.all);
  assert.notEqual(b.App.services.models._all, stateB.all);
  assert.deepEqual(
    (a.App.services.models._all || []).map((model: any) => model.id),
    ['preset-a', 'shared']
  );
  assert.deepEqual(
    (b.App.services.models._all || []).map((model: any) => model.id),
    ['preset-b', 'shared']
  );

  (a.App.services.models._all as any[])[0].name = 'mutated compatibility snapshot';
  assert.equal(stateA.all[0]?.name, 'A:Preset A');
});

test('models registry storage: repeated compat sync reuses the published compatibility snapshots when state revision is unchanged', () => {
  const { App } = createApp({ savedModels: [{ id: ' user-1 ', name: ' User 1 ' }] });
  setModelPresetsInternal(App, [{ id: 'preset-a', name: 'Preset A' }] as any);
  ensureModelsLoadedInternal(App, { forceRebuild: true, silent: true });

  const firstAll = App.services.models._all;
  const firstPresets = App.services.models._presets;
  const firstListeners = App.services.models._listeners;
  const firstRevision = App.services.models.__wpCompatRevision;

  syncModelsStateToApp(App);

  assert.equal(App.services.models._all, firstAll);
  assert.equal(App.services.models._presets, firstPresets);
  assert.equal(App.services.models._listeners, firstListeners);
  assert.equal(App.services.models.__wpCompatRevision, firstRevision);
});

test('models registry storage: no-op preset and normalizer installs do not trigger rebuild notifications', () => {
  const { App } = createApp({ savedModels: [{ id: ' user-1 ', name: ' User 1 ' }] });
  const seen: string[] = [];
  const normalizer = (model: any) => ({ ...model, name: `N:${String(model?.name || '')}` });

  onModelsChangeInternal(App, models => {
    seen.push(String(models[0]?.name || ''));
  });

  setModelsNormalizerInternal(App, normalizer as any);
  setModelPresetsInternal(App, [{ id: 'preset-a', name: 'Preset A' }] as any);
  ensureModelsLoadedInternal(App, { forceRebuild: true, silent: false });

  const notificationsAfterInitialLoad = seen.length;
  const compatRevisionAfterInitialLoad = App.services.models.__wpCompatRevision;
  const publishedAll = App.services.models._all;

  setModelsNormalizerInternal(App, normalizer as any);
  setModelPresetsInternal(App, [{ id: 'preset-a', name: 'Preset A' }] as any);

  assert.equal(seen.length, notificationsAfterInitialLoad);
  assert.equal(App.services.models.__wpCompatRevision, compatRevisionAfterInitialLoad);
  assert.equal(App.services.models._all, publishedAll);
});
