import test from 'node:test';
import assert from 'node:assert/strict';

import { exportSystemSettings, importSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { createDownloadContext, createStore } from './settings_backup_export_runtime_helpers.ts';
import { createImportApp, installFakeFilePrimitives } from './settings_backup_import_runtime_helpers.ts';

test('exportSystemSettings reuses one inflight export per app and allows a later fresh export', async () => {
  const { doc, downloads } = createDownloadContext();
  let exportCalls = 0;
  const app = {
    deps: { browser: { document: doc, window: doc.defaultView } },
    store: createStore({ savedColors: [] }),
    services: {
      models: {
        exportUserModels() {
          exportCalls += 1;
          return [{ id: 'm1', name: 'Model 1' }];
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

  const first = exportSystemSettings(app as never);
  const second = exportSystemSettings(app as never);
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(firstResult, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 0 });
  assert.deepEqual(secondResult, firstResult);
  assert.equal(exportCalls, 1);
  assert.equal(downloads.length, 1);

  const third = await exportSystemSettings(app as never);
  assert.deepEqual(third, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 0 });
  assert.equal(exportCalls, 2);
  assert.equal(downloads.length, 2);
});

test('importSystemSettings reuses one inflight import per app, clears duplicate inputs, and allows a later fresh import', async () => {
  const { FakeFile, restore } = installFakeFilePrimitives();
  let confirmCalls = 0;
  let mergeCalls = 0;
  let confirmResolve: (() => void) | null = null;
  try {
    const { app } = createImportApp();
    app.services.uiFeedback.confirm = (_title: string, _message: string, onYes: () => void) => {
      confirmCalls += 1;
      if (confirmCalls === 1) confirmResolve = onYes;
      else onYes();
    };
    app.services.models.mergeImportedModels = (list: unknown[]) => {
      mergeCalls += 1;
      return { added: list.length, updated: 0 };
    };
    const payload = {
      type: 'system_backup',
      timestamp: Date.now(),
      savedModels: [{ id: 'm1', name: 'Imported Model' }],
      savedColors: [],
      presetOrder: [],
      hiddenPresets: [],
      colorSwatchesOrder: [],
    };
    const file = new FakeFile([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    const firstInput = { value: 'backup.json', files: [file] };
    const secondInput = { value: 'backup-dup.json', files: [file] };

    const first = importSystemSettings(app as never, { currentTarget: firstInput });
    const second = importSystemSettings(app as never, { currentTarget: secondInput });
    await Promise.resolve();
    assert.equal(confirmCalls, 1);
    assert.equal(secondInput.value, '');
    confirmResolve?.();
    const [result, duplicateResult] = await Promise.all([first, second]);
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 0 });
    assert.deepEqual(duplicateResult, result);
    assert.equal(firstInput.value, '');
    assert.equal(mergeCalls, 1);

    const thirdInput = { value: 'backup-again.json', files: [file] };
    const third = await importSystemSettings(app as never, { currentTarget: thirdInput });
    assert.deepEqual(third, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 0 });
    assert.equal(confirmCalls, 2);
    assert.equal(mergeCalls, 2);
    assert.equal(thirdInput.value, '');
  } finally {
    restore();
  }
});

test('settings backup family blocks conflicting export/import flights while reusing duplicate same-kind work', async () => {
  const { FakeFile, restore } = installFakeFilePrimitives();
  const { doc, downloads } = createDownloadContext();
  let exportCalls = 0;
  let confirmCalls = 0;
  let confirmResolve: (() => void) | null = null;
  try {
    const app = {
      deps: { browser: { document: doc, window: doc.defaultView } },
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
          confirm(_title: string, _message: string, onYes: () => void) {
            confirmCalls += 1;
            confirmResolve = onYes;
          },
        },
        models: {
          exportUserModels() {
            exportCalls += 1;
            return [{ id: 'm1', name: 'Model 1' }];
          },
          mergeImportedModels(list: unknown[]) {
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

    const payload = {
      type: 'system_backup',
      timestamp: Date.now(),
      savedModels: [{ id: 'm1', name: 'Imported Model' }],
      savedColors: [],
      presetOrder: [],
      hiddenPresets: [],
      colorSwatchesOrder: [],
    };
    const file = new FakeFile([JSON.stringify(payload)], 'backup.json', { type: 'application/json' });
    const input = { value: 'backup.json', files: [file] };

    const importPending = importSystemSettings(app as never, { currentTarget: input });
    await Promise.resolve();
    assert.equal(confirmCalls, 1);

    const exportBusy = await exportSystemSettings(app as never);
    assert.deepEqual(exportBusy, { ok: false, kind: 'export', reason: 'busy' });
    assert.equal(exportCalls, 0);
    assert.equal(downloads.length, 0);

    const duplicateInput = { value: 'dup.json', files: [file] };
    const duplicateImport = importSystemSettings(app as never, { currentTarget: duplicateInput });
    assert.equal(duplicateInput.value, '');
    confirmResolve?.();
    const [firstImportResult, duplicateImportResult] = await Promise.all([importPending, duplicateImport]);
    assert.deepEqual(firstImportResult, { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 0 });
    assert.deepEqual(duplicateImportResult, firstImportResult);

    const exportPending = exportSystemSettings(app as never);
    const busyImportInput = { value: 'late.json', files: [file] };
    const importBusy = await importSystemSettings(app as never, { currentTarget: busyImportInput });
    assert.deepEqual(importBusy, { ok: false, kind: 'import', reason: 'busy' });
    assert.equal(busyImportInput.value, '');
    const exportResult = await exportPending;
    assert.deepEqual(exportResult, { ok: true, kind: 'export', modelsCount: 1, colorsCount: 0 });
    assert.equal(exportCalls, 1);
    assert.equal(downloads.length, 1);
  } finally {
    restore();
  }
});
