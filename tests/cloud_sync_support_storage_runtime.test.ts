import test from 'node:test';
import assert from 'node:assert/strict';

import {
  storageWithMarker,
  rememberWrappedStorageFns,
  restoreWrappedStorageFns,
  readLocal,
  applyRemote,
} from '../esm/native/services/cloud_sync_support_storage.ts';

test('cloud_sync support storage: remember/restore wrapped storage functions preserves original methods and clears marker', () => {
  const storage = {
    setString() {
      return true;
    },
    setJSON() {
      return true;
    },
    remove() {
      return true;
    },
  };

  const originalSetString = storage.setString;
  const originalSetJSON = storage.setJSON;
  const originalRemove = storage.remove;

  const remembered = rememberWrappedStorageFns(storage);
  assert.equal(remembered.setString, originalSetString);
  assert.equal(remembered.setJSON, originalSetJSON);
  assert.equal(remembered.remove, originalRemove);

  storage.setString = () => false;
  storage.setJSON = () => false;
  storage.remove = () => false;

  restoreWrappedStorageFns(storage);

  assert.equal(storage.setString, originalSetString);
  assert.equal(storage.setJSON, originalSetJSON);
  assert.equal(storage.remove, originalRemove);
  assert.equal('__wp_cloudSync_origStorageFns' in storageWithMarker(storage), false);
});

test('cloud_sync support storage: readLocal normalizes string-backed collections canonically', () => {
  const stringStore = new Map<string, string>([
    ['models', JSON.stringify([{ id: 'm1', name: 'Model 1' }])],
    ['colors', JSON.stringify([{ id: 'c1', value: '#fff', label: 'White' }])],
    ['colorOrder', JSON.stringify(['c2', 'c1'])],
    ['presetOrder', JSON.stringify(['p1'])],
    ['hiddenPresets', JSON.stringify(['hidden-1'])],
  ]);

  const storage = {
    getString(key: unknown) {
      return stringStore.get(String(key)) ?? '';
    },
  };

  const local = readLocal(storage, 'models', 'colors', 'colorOrder', 'presetOrder', 'hiddenPresets');

  assert.deepEqual(local.m, [{ id: 'm1', name: 'Model 1' }]);
  assert.deepEqual(local.c, [{ id: 'c1', value: '#fff', label: 'White' }]);
  assert.deepEqual(local.o, ['c2', 'c1']);
  assert.deepEqual(local.p, ['p1']);
  assert.deepEqual(local.h, ['hidden-1']);
});

test('cloud_sync support storage: applyRemote writes normalized payload into storage and always clears suppress flag', () => {
  const writes = new Map<string, string>();
  const storage = {
    setString(key: unknown, value: unknown) {
      writes.set(String(key), String(value));
      return true;
    },
  };
  const suppress = { v: false };

  applyRemote(
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
    },
    suppress
  );

  assert.equal(suppress.v, false);
  assert.equal(writes.get('models'), JSON.stringify([{ id: 'm1', name: 'Model 1' }]));
  assert.equal(writes.get('colors'), JSON.stringify([{ id: 'c1', value: '#fff' }]));
  assert.equal(writes.get('colorOrder'), JSON.stringify(['c1']));
  assert.equal(writes.get('presetOrder'), JSON.stringify(['p1']));
  assert.equal(writes.get('hiddenPresets'), JSON.stringify(['hidden-1']));
});

test('cloud_sync support storage: readLocal reports parse failures through app-scoped diagnostics when available', () => {
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
    getString() {
      throw new Error('storage read failed');
    },
  };

  const local = readLocal(storage, 'models', 'colors', 'colorOrder', 'presetOrder', 'hiddenPresets', {
    App,
  });

  assert.deepEqual(local, { m: [], c: [], o: [], p: [], h: [] });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx?.where, 'services/cloud_sync');
  assert.equal(reports[0].ctx?.op, 'readLocal.storageParse');
  assert.equal(reports[0].ctx?.nonFatal, true);
});

test('cloud_sync support storage: applyRemote reports failed storage writes and clears suppression', () => {
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
  const suppress = { v: false };
  const storage = {
    setString() {
      return false;
    },
  };

  applyRemote(
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
    },
    suppress
  );

  assert.equal(suppress.v, false);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx?.where, 'services/cloud_sync');
  assert.equal(reports[0].ctx?.op, 'applyRemote.writeStorage');
  assert.equal(reports[0].ctx?.nonFatal, true);
  assert.match(String((reports[0].error as Error).message), /storage write failed/i);
});
