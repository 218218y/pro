import test from 'node:test';
import assert from 'node:assert/strict';

import { applyRemote } from '../esm/native/services/cloud_sync_support_storage.ts';
import { createCloudCollectionsRepository } from '../esm/native/services/cloud_sync_collections_repository.ts';

test('cloud_sync support storage: applyRemote writes normalized payload without holding global suppression', async () => {
  const writes = new Map<string, string>();
  const storage = {
    setString(key: unknown, value: unknown) {
      writes.set(String(key), String(value));
      return true;
    },
  };
  let observerCalls = 0;
  const repository = createCloudCollectionsRepository({
    storage,
    keys: {
      models: 'models',
      colors: 'colors',
      colorOrder: 'colorOrder',
      presetOrder: 'presetOrder',
      hiddenPresets: 'hiddenPresets',
    },
  });
  repository.subscribe(() => {
    observerCalls += 1;
  });

  const applied = await applyRemote(
    {} as never,
    storage,
    'models',
    'colors',
    'colorOrder',
    'presetOrder',
    'hiddenPresets',
    {
      savedModels: [{ id: 'm1', name: 'Model 1' }],
      savedColors: [{ id: 'c1', value: '#fff' }],
      colorSwatchesOrder: ['c1'],
      presetOrder: ['p1'],
      hiddenPresets: ['hidden-1'],
    }
  );

  assert.deepEqual(applied, { ok: true, uiRefreshWarning: true });
  assert.equal(observerCalls, 1);
  assert.deepEqual(JSON.parse(writes.get('models:cloudCollections:v1') || '{}'), {
    schemaVersion: 1,
    revision: 1,
    savedModels: [{ id: 'm1', name: 'Model 1' }],
    savedColors: [{ id: 'c1', value: '#fff' }],
    colorOrder: ['c1'],
    presetOrder: ['p1'],
    hiddenPresets: ['hidden-1'],
  });
  assert.equal(writes.get('models'), JSON.stringify([{ id: 'm1', name: 'Model 1' }]));
  assert.equal(writes.get('colors'), JSON.stringify([{ id: 'c1', value: '#fff' }]));
  assert.equal(writes.get('colorOrder'), JSON.stringify(['c1']));
  assert.equal(writes.get('presetOrder'), JSON.stringify(['p1']));
  assert.equal(writes.get('hiddenPresets'), JSON.stringify(['hidden-1']));
});

test('cloud_sync support storage: applyRemote reports failed storage writes', async () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App = {
    services: {
      platform: {
        reportError(error: unknown, ctx: any) {
          reports.push({ error, ctx });
        },
      },
    },
  } as any;
  const storage = {
    setString() {
      return false;
    },
  };

  const applied = await applyRemote(
    App,
    storage,
    'models',
    'colors',
    'colorOrder',
    'presetOrder',
    'hiddenPresets',
    {
      savedModels: [{ id: 'm1', name: 'Model 1' }],
      savedColors: [],
      colorSwatchesOrder: [],
      presetOrder: [],
      hiddenPresets: [],
    }
  );

  assert.deepEqual(applied, { ok: false, uiRefreshWarning: false, reason: 'commit' });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx?.where, 'services/cloud_sync');
  assert.equal(reports[0].ctx?.op, 'applyRemote.commitCollections');
  assert.equal(reports[0].ctx?.nonFatal, true);
  assert.match(String((reports[0].error as Error).message), /atomic commit failed/i);
});
