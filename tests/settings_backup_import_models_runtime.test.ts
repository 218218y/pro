import test from 'node:test';
import assert from 'node:assert/strict';

import { importSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { withSuppressedConsole } from './_console_silence.ts';
import {
  createImportApp,
  createStore,
  installFakeFilePrimitives,
} from './settings_backup_import_runtime_helpers.ts';

test('importSystemSettings fails closed with models-unavailable when saved models exist but canonical model merge is missing', async () => {
  const env = installFakeFilePrimitives();
  try {
    await withSuppressedConsole(async () => {
      const { app } = createImportApp();
      delete (app as any).services.models.mergeImportedModels;
      const file = new env.FakeFile(
        [
          JSON.stringify({
            type: 'system_backup',
            timestamp: Date.now(),
            savedModels: [{ id: 'm1', name: 'Model 1' }],
          }),
        ],
        'backup.json',
        { type: 'application/json' }
      );
      const input = { value: 'backup.json', files: [file] };
      const result = await importSystemSettings(app as never, { currentTarget: input });
      assert.deepEqual(result, {
        ok: false,
        kind: 'import',
        reason: 'models-unavailable',
        message:
          '[WardrobePro] settings backup import models merge requires canonical services.models.mergeImportedModels(list).',
      });
      assert.equal(input.value, '');
    });
  } finally {
    env.restore();
  }
});

test('importSystemSettings still succeeds for color-only backups even when model import seams are absent', async () => {
  const env = installFakeFilePrimitives();
  try {
    const { app } = createImportApp();
    delete (app as any).services.models;
    delete (app as any).actions.models;
    const file = new env.FakeFile(
      [
        JSON.stringify({
          type: 'system_backup',
          timestamp: Date.now(),
          savedColors: [{ id: 'c1', value: '#fff' }],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 1 });
    assert.equal(input.value, '');
  } finally {
    env.restore();
  }
});

test('importSystemSettings sanitizes mixed backup payload arrays and imports only valid models/colors/order ids', async () => {
  const env = installFakeFilePrimitives();
  try {
    const mergedModels: unknown[][] = [];
    const colorState: Array<Record<string, unknown> | string> = [];
    const colorOrderState: Array<string | number> = [];
    const storageWrites: Record<string, unknown> = {};
    const app = {
      store: createStore({ savedColors: [] }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: Array<Record<string, unknown> | string>) {
          colorState.splice(0, colorState.length, ...next);
          return undefined;
        },
        setColorSwatchesOrder(next: Array<string | number>) {
          colorOrderState.splice(0, colorOrderState.length, ...next);
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
          mergeImportedModels(list: unknown[]) {
            mergedModels.push(list);
            return { added: list.length, updated: 0 };
          },
          ensureLoaded() {
            return undefined;
          },
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
            return undefined;
          },
          getJSON(_key: string, fallback: unknown[]) {
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
          savedModels: [{ id: 'm1', name: 'Model 1', width: 180 }, null, { id: 'broken' }, 'x'],
          savedColors: [{ id: 'c1', value: '#fff' }, { value: '#broken' }, 'legacy-string-color'],
          colorSwatchesOrder: ['c1', null, 7, {}, 'legacy-string-color'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 2 });
    assert.equal(input.value, '');
    assert.equal((mergedModels[0] as any[])[0].id, 'm1');
    assert.equal((mergedModels[0] as any[])[0].name, 'Model 1');
    assert.equal((mergedModels[0] as any[])[0].width, 180);
    assert.ok(Array.isArray((mergedModels[0] as any[])[0].modulesConfiguration));
    assert.equal((mergedModels[0] as any[])[0].cornerConfiguration.layout, 'shelves');
    assert.deepEqual(colorState, [{ id: 'c1', value: '#fff' }, 'legacy-string-color']);
    assert.deepEqual(colorOrderState, ['c1', 'legacy-string-color']);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['c1', 'legacy-string-color']);
  } finally {
    env.restore();
  }
});

test('importSystemSettings keeps the latest duplicate saved model entry within a single backup payload', async () => {
  const env = installFakeFilePrimitives();
  try {
    const mergedModels: unknown[][] = [];
    const { app } = createImportApp();
    app.services.models.mergeImportedModels = (list: unknown[]) => {
      mergedModels.push(list);
      return { added: list.length, updated: 0 };
    };

    const file = new env.FakeFile(
      [
        JSON.stringify({
          type: 'system_backup',
          timestamp: Date.now(),
          savedModels: [
            { id: 'm1', name: 'Model 1', width: 100 },
            { id: 'm2', name: 'Model 2', width: 200 },
            { id: ' m1 ', name: 'Model 1 updated', width: 180, savedNotes: [{ id: 'n1', text: 'latest' }] },
          ],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );

    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });

    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 2, colorsAdded: 0 });
    assert.equal(input.value, '');
    assert.equal(mergedModels.length, 1);
    assert.equal((mergedModels[0] as any[]).length, 2);
    assert.equal((mergedModels[0] as any[])[0].id, 'm1');
    assert.equal((mergedModels[0] as any[])[0].name, 'Model 1 updated');
    assert.equal((mergedModels[0] as any[])[0].width, 180);
    assert.deepEqual((mergedModels[0] as any[])[0].savedNotes, [{ id: 'n1', text: 'latest' }]);
    assert.ok(Array.isArray((mergedModels[0] as any[])[0].modulesConfiguration));
    assert.equal((mergedModels[0] as any[])[1].id, 'm2');
    assert.equal((mergedModels[0] as any[])[1].name, 'Model 2');
    assert.equal((mergedModels[0] as any[])[1].width, 200);
  } finally {
    env.restore();
  }
});
test('importSystemSettings upgrades duplicate saved color ids from legacy strings to canonical object entries', async () => {
  const env = installFakeFilePrimitives();
  try {
    const colorState: Array<Record<string, unknown> | string> = [];
    const storageWrites: Record<string, unknown> = {};
    const app = {
      store: createStore({ savedColors: [] }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: Array<Record<string, unknown> | string>) {
          colorState.splice(0, colorState.length, ...next);
          return undefined;
        },
        setColorSwatchesOrder(next: string[]) {
          storageWrites.colorOrderState = next.slice();
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
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
            return undefined;
          },
          getJSON(_key: string, fallback: unknown[]) {
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
          savedColors: [
            'oak',
            { id: ' oak ', value: '#deb887', textureData: { grain: 'oak' } },
            { id: 'solid', value: '#ffffff' },
          ],
          colorSwatchesOrder: [' oak ', 'solid', 'oak'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 2 });
    assert.equal(input.value, '');
    assert.deepEqual(colorState, [
      { id: 'oak', value: '#deb887', textureData: { grain: 'oak' } },
      { id: 'solid', value: '#ffffff' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['oak', 'solid']);
    assert.deepEqual(storageWrites.colorOrderState, ['oak', 'solid']);
  } finally {
    env.restore();
  }
});

test('importSystemSettings upgrades existing live legacy saved-color aliases to richer imported object payloads without reporting a fake added count', async () => {
  const env = installFakeFilePrimitives();
  try {
    const colorState: Array<Record<string, unknown> | string> = ['oak', { id: 'solid', value: '#ffffff' }];
    const storageWrites: Record<string, unknown> = {};
    const app = {
      store: createStore({ savedColors: colorState }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: Array<Record<string, unknown> | string>) {
          colorState.splice(0, colorState.length, ...next);
          return undefined;
        },
        setColorSwatchesOrder(next: string[]) {
          storageWrites.colorOrderState = next.slice();
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
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
            return undefined;
          },
          getJSON(key: string, fallback: unknown[]) {
            if (key === 'wardrobeSavedColors:order') return ['solid', 'oak'];
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
          savedColors: [{ id: ' oak ', value: '#deb887', textureData: { grain: 'oak' } }],
          colorSwatchesOrder: ['solid', 'oak'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 0 });
    assert.equal(input.value, '');
    assert.deepEqual(colorState, [
      { id: 'oak', value: '#deb887', textureData: { grain: 'oak' } },
      { id: 'solid', value: '#ffffff' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['oak', 'solid']);
    assert.deepEqual(storageWrites.colorOrderState, ['oak', 'solid']);
  } finally {
    env.restore();
  }
});

test('importSystemSettings preserves live-only swatch order ids even when storage order is stale during partial color imports', async () => {
  const env = installFakeFilePrimitives();
  try {
    const storageWrites: Record<string, unknown> = {};
    const colorState: Array<Record<string, unknown> | string> = [
      { id: 'existing', value: '#111111' },
      { id: 'live-only', value: '#444444' },
    ];
    const app = {
      store: createStore({ savedColors: colorState, colorSwatchesOrder: ['live-only', 'existing'] }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: Array<Record<string, unknown> | string>) {
          colorState.splice(0, colorState.length, ...next);
          return undefined;
        },
        setColorSwatchesOrder(next: string[]) {
          storageWrites.colorOrderState = next.slice();
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
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
            return undefined;
          },
          getJSON(key: string, fallback: unknown[]) {
            if (key === 'wardrobeSavedColors:order') return ['existing'];
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
          savedColors: [{ id: 'new-color', value: '#fff' }],
          colorSwatchesOrder: ['new-color'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 1 });
    assert.equal(input.value, '');
    assert.deepEqual(colorState, [
      { id: 'existing', value: '#111111' },
      { id: 'live-only', value: '#444444' },
      { id: 'new-color', value: '#fff' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['new-color', 'live-only', 'existing']);
    assert.deepEqual(storageWrites.colorOrderState, ['new-color', 'live-only', 'existing']);
  } finally {
    env.restore();
  }
});

test('importSystemSettings preserves existing live swatch order entries that are missing from the backup after applying imported priority ids', async () => {
  const env = installFakeFilePrimitives();
  try {
    const storageWrites: Record<string, unknown> = {};
    const colorState: Array<Record<string, unknown> | string> = [
      { id: 'existing', value: '#111111' },
      { id: 'solid', value: '#ffffff' },
    ];
    const app = {
      store: createStore({ savedColors: colorState, colorSwatchesOrder: ['existing', 'solid'] }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: Array<Record<string, unknown> | string>) {
          colorState.splice(0, colorState.length, ...next);
          return undefined;
        },
        setColorSwatchesOrder(next: string[]) {
          storageWrites.colorOrderState = next.slice();
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
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
            return undefined;
          },
          getJSON(key: string, fallback: unknown[]) {
            if (key === 'wardrobeSavedColors:order') return ['existing', 'solid'];
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
          savedColors: [{ id: 'new-color', value: '#fff' }],
          colorSwatchesOrder: ['new-color'],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 1 });
    assert.equal(input.value, '');
    assert.deepEqual(colorState, [
      { id: 'existing', value: '#111111' },
      { id: 'solid', value: '#ffffff' },
      { id: 'new-color', value: '#fff' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['new-color', 'existing', 'solid']);
    assert.deepEqual(storageWrites.colorOrderState, ['new-color', 'existing', 'solid']);
  } finally {
    env.restore();
  }
});

test('importSystemSettings normalizes backup order ids to canonical unique strings and drops ids missing from merged saved colors', async () => {
  const env = installFakeFilePrimitives();
  try {
    const storageWrites: Record<string, unknown> = {};
    const colorState: Array<Record<string, unknown>> = [{ id: 'existing', value: '#111111' }];
    const app = {
      store: createStore({ savedColors: colorState }),
      maps: {
        getSavedColors() {
          return colorState;
        },
        setSavedColors(next: Array<Record<string, unknown>>) {
          colorState.splice(0, colorState.length, ...next);
          return undefined;
        },
        setColorSwatchesOrder(next: string[]) {
          storageWrites.colorOrderState = next.slice();
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
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON(key: string, value: unknown) {
            storageWrites[key] = value;
            return undefined;
          },
          getJSON(_key: string, fallback: unknown[]) {
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
          savedColors: [
            { id: 'new-color', value: '#fff' },
            { id: 7, value: '#000' },
          ],
          colorSwatchesOrder: [' new-color ', 'missing', 7, 'existing', 'new-color', 7, '', null],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 2 });
    assert.equal(input.value, '');
    assert.deepEqual(colorState, [
      { id: 'existing', value: '#111111' },
      { id: 'new-color', value: '#fff' },
      { id: '7', value: '#000' },
    ]);
    assert.deepEqual(storageWrites['wardrobeSavedColors:order'], ['new-color', '7', 'existing']);
    assert.deepEqual(storageWrites.colorOrderState, ['new-color', '7', 'existing']);
  } finally {
    env.restore();
  }
});

test('importSystemSettings canonicalizes saved model config snapshots before merge', async () => {
  const env = installFakeFilePrimitives();
  try {
    const mergedModels: unknown[][] = [];
    const app = {
      store: createStore({ savedColors: [] }),
      maps: {
        getSavedColors() {
          return [];
        },
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
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
          mergeImportedModels(list: unknown[]) {
            mergedModels.push(list);
            return { added: list.length, updated: 0 };
          },
          ensureLoaded() {
            return undefined;
          },
        },
        storage: {
          KEYS: { SAVED_MODELS: 'wardrobeSavedModels', SAVED_COLORS: 'wardrobeSavedColors' },
          setJSON() {
            return undefined;
          },
          getJSON(_key: string, fallback: unknown[]) {
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
          savedModels: [
            {
              id: 'm-1',
              name: 'Canonical Demo',
              settings: { doors: 5, structureSelection: '[2,2,1]', wardrobeType: 'hinged' },
              modulesConfiguration: [{ doors: '2' }, { doors: '2' }, { doors: '2', extDrawersCount: '4' }],
              stackSplitLowerModulesConfiguration: [{ extDrawersCount: '3' }],
              cornerConfiguration: { modulesConfiguration: [{ doors: '5' }] },
            },
          ],
        }),
      ],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 0 });
    assert.equal(input.value, '');
    assert.equal((mergedModels[0] as any[])[0].modulesConfiguration[2].doors, 1);
    assert.equal((mergedModels[0] as any[])[0].stackSplitLowerModulesConfiguration[0].extDrawersCount, 3);
    assert.equal((mergedModels[0] as any[])[0].cornerConfiguration.layout, 'shelves');
  } finally {
    env.restore();
  }
});
