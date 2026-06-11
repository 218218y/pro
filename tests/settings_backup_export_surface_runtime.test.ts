import test from 'node:test';
import assert from 'node:assert/strict';

import { exportSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { createDownloadContext, createStore } from './settings_backup_export_runtime_helpers.ts';

function summarizeSavedModels(value: unknown) {
  return Array.isArray(value)
    ? value.map(model => ({
        id: (model as Record<string, unknown>)?.id,
        name: (model as Record<string, unknown>)?.name,
        depth: (model as Record<string, unknown>)?.depth,
        width: (model as Record<string, unknown>)?.width,
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

test('exportSystemSettings serializes a complete backup payload and triggers a browser download', async () => {
  const { doc, downloads, blobRecords } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({ savedColors: [{ id: 'c1', value: '#ffffff' }] }),
    services: {
      uiFeedback: {
        toast() {
          return undefined;
        },
      },
      models: {
        exportUserModels() {
          return [{ id: 'm1', name: 'Model 1', depth: 60 }];
        },
      },
      storage: {
        KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
        getJSON(key: string, fallback: unknown[]) {
          if (key === 'wardrobeSavedModels:presetOrder') return ['m1'];
          if (key === 'wardrobeSavedModels:hiddenPresets') return ['preset-hidden'];
          if (key === 'wardrobeSavedColors:order') return ['c1'];
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 1 });
  assert.equal(downloads.length, 1);
  assert.equal(blobRecords.length, 1);
  assert.match(downloads[0] || '', /^wardrobe_system_backup_\d{4}-\d{2}-\d{2}\.json$/);

  const payload = JSON.parse(await blobRecords[0]!.blob.text());
  assert.equal(payload.type, 'system_backup');
  assertCanonicalModelShape(payload.savedModels);
  assert.deepEqual(summarizeSavedModels(payload.savedModels), [
    { id: 'm1', name: 'Model 1', depth: 60, width: undefined },
  ]);
  assert.deepEqual(payload.savedColors, [{ id: 'c1', value: '#ffffff' }]);
  assert.deepEqual(payload.presetOrder, ['m1']);
  assert.deepEqual(payload.hiddenPresets, ['preset-hidden']);
  assert.deepEqual(payload.colorSwatchesOrder, ['c1']);
  assert.equal(typeof payload.timestamp, 'number');
});

test('exportSystemSettings collapses duplicate saved color identities and prefers richer object payloads', async () => {
  const { doc, blobRecords } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({
      savedColors: [
        'oak',
        { id: 'oak', value: '#deb887', textureData: { grain: 'oak' } },
        { id: 'solid', value: '#ffffff' },
      ],
    }),
    services: {
      models: {
        exportUserModels() {
          return [];
        },
      },
      storage: {
        KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
        getJSON(key: string, fallback: unknown[]) {
          if (key === 'wardrobeSavedColors:order') return ['solid', 'oak', 'oak'];
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 0, colorsCount: 2 });
  assert.equal(blobRecords.length, 1);

  const payload = JSON.parse(await blobRecords[0]!.blob.text());
  assert.deepEqual(payload.savedColors, [
    { id: 'oak', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid', value: '#ffffff' },
  ]);
  assert.deepEqual(payload.colorSwatchesOrder, ['solid', 'oak']);
});

test('exportSystemSettings normalizes model/color order collections to unique canonical ids and drops stale color-order entries', async () => {
  const { doc, blobRecords } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({
      savedColors: [
        { id: 'c1', value: '#ffffff' },
        { id: 7, value: '#000000' },
      ],
    }),
    services: {
      models: {
        exportUserModels() {
          return [{ id: 'm1', name: 'Model 1' }];
        },
      },
      storage: {
        KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
        getJSON(key: string, fallback: unknown[]) {
          if (key === 'wardrobeSavedModels:presetOrder') return [' m1 ', 'm1', 7, null, ''];
          if (key === 'wardrobeSavedModels:hiddenPresets') return [' hidden-a ', 'hidden-a', 'hidden-b'];
          if (key === 'wardrobeSavedColors:order') return [' c1 ', 'missing', 7, 'c1', '', null];
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 2 });
  assert.equal(blobRecords.length, 1);

  const payload = JSON.parse(await blobRecords[0]!.blob.text());
  assert.deepEqual(payload.presetOrder, ['m1', '7']);
  assert.deepEqual(payload.hiddenPresets, ['hidden-a', 'hidden-b']);
  assert.deepEqual(payload.colorSwatchesOrder, ['c1', '7']);
});

test('exportSystemSettings sanitizes saved model payloads and drops stale preset collection ids when live presets are available', async () => {
  const { doc, blobRecords } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({ savedColors: [] }),
    services: {
      models: {
        exportUserModels() {
          return [
            { id: 'm1', name: ' Model 1 ' },
            { id: 'm1', name: 'Duplicate should drop', width: 180 },
            { id: 'm2', name: 'Model 2' },
            { id: '  ', name: 'Missing id should drop' },
            { id: 'm3', name: '   ' },
          ];
        },
        getAll() {
          return [
            { id: 'preset-a', name: 'Preset A', isPreset: true },
            { id: 'preset-b', name: 'Preset B', isPreset: true },
            { id: 'm1', name: 'User Model', isPreset: false },
          ];
        },
      },
      storage: {
        KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
        getJSON(key: string, fallback: unknown[]) {
          if (key === 'wardrobeSavedModels:presetOrder')
            return ['preset-a', 'missing', 'preset-b', 'preset-a'];
          if (key === 'wardrobeSavedModels:hiddenPresets') return ['missing', ' preset-b ', 'preset-b', ''];
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 2, colorsCount: 0 });
  assert.equal(blobRecords.length, 1);

  const payload = JSON.parse(await blobRecords[0]!.blob.text());
  assertCanonicalModelShape(payload.savedModels);
  assert.deepEqual(summarizeSavedModels(payload.savedModels), [
    { id: 'm1', name: 'Duplicate should drop', depth: undefined, width: 180 },
    { id: 'm2', name: 'Model 2', depth: undefined, width: undefined },
  ]);
  assert.deepEqual(payload.presetOrder, ['preset-a', 'preset-b']);
  assert.deepEqual(payload.hiddenPresets, ['preset-b']);
});

test('exportSystemSettings prefers live swatch order and appends remaining saved-color ids from storage/canonical order', async () => {
  const { doc, blobRecords } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({
      savedColors: [
        { id: 'oak', value: '#deb887' },
        { id: 'solid', value: '#ffffff' },
        { id: 'walnut', value: '#5c4033' },
      ],
      colorSwatchesOrder: ['solid', 'oak'],
    }),
    services: {
      models: {
        exportUserModels() {
          return [];
        },
      },
      storage: {
        KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
        getJSON(key: string, fallback: unknown[]) {
          if (key === 'wardrobeSavedColors:order') return ['oak', 'walnut', 'solid'];
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 0, colorsCount: 3 });
  assert.equal(blobRecords.length, 1);

  const payload = JSON.parse(await blobRecords[0]!.blob.text());
  assert.deepEqual(payload.colorSwatchesOrder, ['solid', 'oak', 'walnut']);
});

test('exportSystemSettings materializes color swatch order from canonical saved-color order when live and storage order are missing', async () => {
  const { doc, blobRecords } = createDownloadContext();
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({
      savedColors: [
        'oak',
        { id: 'oak', value: '#deb887', textureData: { grain: 'oak' } },
        { id: 'solid', value: '#ffffff' },
      ],
    }),
    services: {
      models: {
        exportUserModels() {
          return [];
        },
      },
      storage: {
        KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
        getJSON(_key: string, fallback: unknown[]) {
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: true, kind: 'export', modelsCount: 0, colorsCount: 2 });
  assert.equal(blobRecords.length, 1);

  const payload = JSON.parse(await blobRecords[0]!.blob.text());
  assert.deepEqual(payload.savedColors, [
    { id: 'oak', value: '#deb887', textureData: { grain: 'oak' } },
    { id: 'solid', value: '#ffffff' },
  ]);
  assert.deepEqual(payload.colorSwatchesOrder, ['oak', 'solid']);
});
