import test from 'node:test';
import assert from 'node:assert/strict';

import { exportSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { createDownloadContext, createStore } from './settings_backup_export_runtime_helpers.ts';

test('exportSystemSettings reports download-unavailable when browser download primitives are missing', async () => {
  const app = {
    store: createStore({ savedColors: [] }),
    services: {
      models: {
        exportUserModels() {
          return [{ id: 'm1', name: 'Model 1' }];
        },
      },
      storage: {
        getJSON(_key: string, fallback: unknown[]) {
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, {
    ok: false,
    kind: 'export',
    reason: 'download-unavailable',
    message: 'browser blob download unavailable',
  });
});

test('exportSystemSettings preserves actionable browser download failure messages', async () => {
  const { doc } = createDownloadContext();
  const brokenWin = {
    ...(doc.defaultView as unknown as Record<string, unknown>),
    URL: {
      createObjectURL() {
        throw new Error('download exploded');
      },
      revokeObjectURL() {
        return undefined;
      },
    },
  } as unknown as Window;
  const brokenDoc = { ...doc, defaultView: brokenWin } as Document;
  (brokenWin as unknown as { document: Document }).document = brokenDoc;

  const app = {
    deps: { browser: { document: brokenDoc, window: brokenWin } },
    store: createStore({ savedColors: [] }),
    services: {
      models: {
        exportUserModels() {
          return [{ id: 'm1', name: 'Model 1' }];
        },
      },
      storage: {
        getJSON(_key: string, fallback: unknown[]) {
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: false, kind: 'export', reason: 'error', message: 'download exploded' });
});

test('exportSystemSettings preserves upstream backup-build failures with actionable messages', async () => {
  const app = {
    store: createStore({ savedColors: [] }),
    services: {
      models: {
        exportUserModels() {
          throw new Error('export models exploded');
        },
      },
      storage: {
        getJSON(_key: string, fallback: unknown[]) {
          return fallback;
        },
      },
    },
  };

  const result = await exportSystemSettings(app as never);
  assert.deepEqual(result, { ok: false, kind: 'export', reason: 'error', message: 'export models exploded' });
});
