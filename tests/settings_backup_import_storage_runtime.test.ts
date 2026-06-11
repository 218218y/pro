import test from 'node:test';
import assert from 'node:assert/strict';

import { importSystemSettings } from '../esm/native/ui/settings_backup.ts';
import {
  createImportApp,
  createStore,
  installFakeFilePrimitives,
} from './settings_backup_import_runtime_helpers.ts';

test('importSystemSettings drops stale preset collection ids when live preset registry is available', async () => {
  const env = installFakeFilePrimitives();
  try {
    const storageWrites: Record<string, unknown> = {};
    const { app } = createImportApp();
    app.services.models.getAll = () => [
      { id: 'preset-a', name: 'Preset A', isPreset: true },
      { id: 'preset-b', name: 'Preset B', isPreset: true },
      { id: 'user-1', name: 'User 1', isPreset: false },
    ];
    app.services.storage.setJSON = (key: string, value: unknown) => {
      storageWrites[key] = value;
      return undefined;
    };
    const file = new env.FakeFile(
      [
        JSON.stringify({
          type: 'system_backup',
          timestamp: Date.now(),
          presetOrder: ['preset-a', 'missing', 'preset-b', 'preset-a'],
          hiddenPresets: ['missing', ' preset-b ', 'preset-b'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 0 });
    assert.deepEqual(storageWrites['wardrobeSavedModels:presetOrder'], ['preset-a', 'preset-b']);
    assert.deepEqual(storageWrites['wardrobeSavedModels:hiddenPresets'], ['preset-b']);
    assert.equal(input.value, '');
  } finally {
    env.restore();
  }
});

test('importSystemSettings skips storage and order writes when imported collections already match the live state', async () => {
  const env = installFakeFilePrimitives();
  try {
    const storageWrites: Array<[string, unknown]> = [];
    const liveColorOrders: string[][] = [];
    const colorState = [
      { id: 'existing', value: '#111111' },
      { id: 'new-color', value: '#ffffff' },
      { id: '7', value: '#000000' },
    ];
    const app = {
      store: createStore({ savedColors: colorState, colorSwatchesOrder: ['new-color', '7'] }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder(next: string[]) {
          liveColorOrders.push(next.slice());
          return undefined;
        },
      },
      actions: {
        models: {
          renderModelUI() {
            return undefined;
          },
        },
      },
      services: {
        uiFeedback: {
          confirm(_t: string, _m: string, onYes: () => void) {
            onYes();
          },
        },
        models: {
          mergeImportedModels(_list: unknown[]) {
            return { added: 0, updated: 0 };
          },
          ensureLoaded() {
            return undefined;
          },
          getAll() {
            return [
              { id: 'preset-a', name: 'Preset A', isPreset: true },
              { id: 'preset-b', name: 'Preset B', isPreset: true },
            ];
          },
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites.push([key, value]);
            return undefined;
          },
          getJSON(key: string, fallback: unknown[]) {
            if (key === 'wardrobeSavedModels:presetOrder') return ['preset-a', 'preset-b'];
            if (key === 'wardrobeSavedModels:hiddenPresets') return ['preset-b'];
            if (key === 'wardrobeSavedColors:order') return ['new-color', '7'];
            return fallback;
          },
        },
      },
    };
    const file = new env.FakeFile(
      [
        JSON.stringify({
          type: 'system_backup',
          timestamp: Date.now(),
          presetOrder: ['preset-a', 'preset-b'],
          hiddenPresets: [' preset-b ', 'preset-b'],
          savedColors: [
            { id: 'existing', value: '#111111' },
            { id: 'new-color', value: '#ffffff' },
            { id: '7', value: '#000000' },
          ],
          colorSwatchesOrder: ['new-color', '7', 'missing'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 0 });
    assert.equal(input.value, '');
    assert.deepEqual(storageWrites, [['wardrobeSavedColors:order', ['new-color', '7', 'existing']]]);
    assert.deepEqual(liveColorOrders, [['new-color', '7', 'existing']]);
  } finally {
    env.restore();
  }
});
