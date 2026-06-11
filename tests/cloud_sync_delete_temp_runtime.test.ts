import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncDeleteTempOps } from '../esm/native/services/cloud_sync_delete_temp.ts';
import { createCloudSyncMainWriteSingleFlight } from '../esm/native/services/cloud_sync_main_write_singleflight.ts';

type AnyRecord = Record<string, unknown>;

function createStorageHarness() {
  const raw = new Map<string, string>();
  return {
    raw,
    getString(key: unknown): string | null {
      const value = raw.get(String(key));
      return typeof value === 'string' ? value : null;
    },
    setString(key: unknown, value: unknown): boolean {
      raw.set(String(key), String(value));
      return true;
    },
    getJSON<T>(key: unknown, fallback: T): T {
      const value = raw.get(String(key));
      if (typeof value !== 'string') return fallback;
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    },
    setJSON(key: unknown, value: unknown): boolean {
      raw.set(String(key), JSON.stringify(value));
      return true;
    },
  };
}

function createAppHarness() {
  const colorsWrites: unknown[] = [];
  const orderWrites: unknown[] = [];
  let ensureLoadedCalls = 0;
  const App = {
    services: {
      models: {
        ensureLoaded() {
          ensureLoadedCalls += 1;
          return [];
        },
      },
      uiFeedback: {
        toast() {},
        showToast() {},
      },
    },
    maps: {
      setSavedColors(colors: unknown) {
        colorsWrites.push(colors);
      },
      setColorSwatchesOrder(order: unknown) {
        orderWrites.push(order);
      },
    },
  } as AnyRecord;

  return {
    App,
    getEnsureLoadedCalls: () => ensureLoadedCalls,
    colorsWrites,
    orderWrites,
  };
}

test('cloud sync delete temp removes unlocked colors, sanitizes payload, updates local state, and sends realtime hint', async () => {
  const storage = createStorageHarness();
  const appHarness = createAppHarness();
  const hints: Array<[string, string | undefined]> = [];
  const writeKeys: string[] = [];
  let lastSeenUpdatedAt = '';
  let lastHash = '';
  let clearPendingPushCalls = 0;
  let getRowCalls = 0;
  let upsertPayload: AnyRecord | null = null;

  const ops = createCloudSyncDeleteTempOps({
    App: appHarness.App as any,
    cfg: { anonKey: 'anon-key' } as any,
    restUrl: 'https://example.test/rest',
    storage: storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorSwatchesOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    currentRoom: () => 'room-1',
    getRow: async () => {
      getRowCalls += 1;
      if (getRowCalls === 1) {
        return {
          room: 'room-1',
          updated_at: 'ts-1',
          payload: {
            savedModels: [
              { id: 'model-1', name: 'Model 1' },
              { id: 7, name: 'bad' },
            ],
            savedColors: [{ id: 'keep', locked: true }, { id: 'drop', value: '#fff' }, 'junk'],
            colorSwatchesOrder: ['keep', 5, null, { bad: true }],
            presetOrder: ['preset-a', 2, { bad: true }],
            hiddenPresets: ['hidden-a', false, 9],
          },
        } as any;
      }
      return {
        room: 'room-1',
        updated_at: 'ts-2',
        payload: upsertPayload,
      } as any;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      assert.equal(room, 'room-1');
      upsertPayload = payload as AnyRecord;
      return { ok: true, row: { room, updated_at: 'ts-upsert', payload } } as any;
    },
    getSendRealtimeHint: () => (scope: string, rowName?: string) => hints.push([scope, rowName]),
    runMainWriteFlight: (key, run, onBusy) => {
      writeKeys.push(String(key));
      return Promise.resolve().then(run);
    },
    clearPendingPush: () => {
      clearPendingPushCalls += 1;
    },
    setLastSeenUpdatedAt: value => {
      lastSeenUpdatedAt = value;
    },
    setLastHash: value => {
      lastHash = value;
    },
    suppress: { v: false },
    reportNonFatal: () => {
      throw new Error('reportNonFatal should not run in success path');
    },
  });

  const result = await ops.deleteTemporaryColorsInCloud();

  assert.deepEqual(result, { ok: true, removed: 1 });
  assert.deepEqual(hints, [['main', 'room-1']]);
  assert.deepEqual(writeKeys, ['delete:colors']);
  assert.equal(clearPendingPushCalls, 1);
  assert.equal(lastSeenUpdatedAt, 'ts-upsert');
  assert.equal(typeof lastHash, 'string');
  assert.notEqual(lastHash, '');
  assert.deepEqual(upsertPayload, {
    savedModels: [{ id: 'model-1', name: 'Model 1' }],
    savedColors: [{ id: 'keep', locked: true }],
    colorSwatchesOrder: ['keep', 5, null],
    presetOrder: ['preset-a', 2],
    hiddenPresets: ['hidden-a', 9],
  });
  assert.deepEqual(JSON.parse(storage.getString('savedColors') || 'null'), [{ id: 'keep', locked: true }]);
  assert.deepEqual(JSON.parse(storage.getString('savedModels') || 'null'), [
    { id: 'model-1', name: 'Model 1' },
  ]);
  assert.deepEqual(appHarness.colorsWrites.at(-1), [{ id: 'keep', locked: true }]);
  assert.deepEqual(appHarness.orderWrites.at(-1), ['keep', '5']);
  assert.equal(appHarness.getEnsureLoadedCalls(), 1);
  assert.equal(
    getRowCalls,
    1,
    'delete-temp should reuse returned representation instead of forcing a second refresh'
  );
});

test('cloud sync delete temp does not stamp pull activity when the preflight row read fails', async () => {
  const storage = createStorageHarness();
  const appHarness = createAppHarness();
  const runtimeStatus = {
    realtime: { state: 'idle', enabled: true, mode: 'broadcast', channel: '' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    room: 'room-3',
    clientId: 'client-1',
    instanceId: 'instance-1',
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;
  let publishCount = 0;

  const ops = createCloudSyncDeleteTempOps({
    App: appHarness.App as any,
    cfg: { anonKey: 'anon-key' } as any,
    restUrl: 'https://example.test/rest',
    storage: storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorSwatchesOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    currentRoom: () => 'room-3',
    getRow: async () => {
      throw new Error('preflight exploded');
    },
    upsertRow: async () => {
      throw new Error('upsert should not run after failed preflight');
    },
    getSendRealtimeHint: () => () => {
      throw new Error('hint should not run after failed preflight');
    },
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    runMainWriteFlight: (key, run, onBusy) => Promise.resolve().then(run),
    clearPendingPush: () => {},
    setLastSeenUpdatedAt: () => {},
    setLastHash: () => {},
    suppress: { v: false },
    reportNonFatal: () => {},
  });

  const result = await ops.deleteTemporaryModelsInCloud();

  assert.deepEqual(result, {
    ok: false,
    removed: 0,
    reason: 'error',
    message: 'preflight exploded',
  });
  assert.equal(runtimeStatus.lastPullAt, 0);
  assert.equal(runtimeStatus.lastPushAt, 0);
  assert.equal(publishCount, 0);
});

test('cloud sync delete temp preserves thrown message, reports nonfatal, and resets push flag on errors', async () => {
  const storage = createStorageHarness();
  const appHarness = createAppHarness();
  const reported: Array<{ op: string; message: string }> = [];
  const writeKeys: string[] = [];

  const ops = createCloudSyncDeleteTempOps({
    App: appHarness.App as any,
    cfg: { anonKey: 'anon-key' } as any,
    restUrl: 'https://example.test/rest',
    storage: storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorSwatchesOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    currentRoom: () => 'room-2',
    getRow: async () =>
      ({
        room: 'room-2',
        updated_at: 'ts-1',
        payload: {
          savedModels: [
            { id: 'keep', name: 'Keep', locked: true },
            { id: 'drop', name: 'Drop' },
          ],
          savedColors: [],
        },
      }) as any,
    upsertRow: async () => {
      throw new Error('upsert exploded');
    },
    getSendRealtimeHint: () => () => {
      throw new Error('hint should not run after failed upsert');
    },
    runMainWriteFlight: (key, run, onBusy) => {
      writeKeys.push(String(key));
      return Promise.resolve().then(run);
    },
    clearPendingPush: () => {},
    setLastSeenUpdatedAt: () => {},
    setLastHash: () => {},
    suppress: { v: false },
    reportNonFatal: (_app, op, err) => {
      reported.push({ op, message: err instanceof Error ? err.message : String(err) });
    },
  });

  const result = await ops.deleteTemporaryModelsInCloud();

  assert.deepEqual(result, {
    ok: false,
    removed: 0,
    reason: 'error',
    message: 'upsert exploded',
  });
  assert.deepEqual(writeKeys, ['delete:models']);
  assert.deepEqual(reported, [{ op: 'services/cloud_sync.deleteTemp.models', message: 'upsert exploded' }]);
});

test('cloud sync delete temp reuses duplicate same-kind writes and reports busy for conflicting main-write work', async () => {
  const storage = createStorageHarness();
  const appHarness = createAppHarness();
  const mainWrite = createCloudSyncMainWriteSingleFlight(appHarness.App as object);
  let releaseGetRow: (() => void) | null = null;
  let getRowCalls = 0;

  const ops = createCloudSyncDeleteTempOps({
    App: appHarness.App as any,
    cfg: { anonKey: 'anon-key' } as any,
    restUrl: 'https://example.test/rest',
    storage: storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorSwatchesOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    currentRoom: () => 'room-3',
    getRow: async () => {
      getRowCalls += 1;
      if (getRowCalls === 1) {
        await new Promise<void>(resolve => {
          releaseGetRow = resolve;
        });
      }
      return {
        room: 'room-3',
        updated_at: 'ts-1',
        payload: {
          savedModels: [{ id: 'temp-1', name: 'Temp 1' }],
          savedColors: [],
        },
      } as any;
    },
    upsertRow: async () => ({ ok: true }) as any,
    getSendRealtimeHint: () => null,
    runMainWriteFlight: (key, run, onBusy) => mainWrite.run(key, run, onBusy),
    clearPendingPush: () => {},
    setLastSeenUpdatedAt: () => {},
    setLastHash: () => {},
    suppress: { v: false },
    reportNonFatal: () => {
      throw new Error('reportNonFatal should not run in single-flight test');
    },
  });

  const deleteA = ops.deleteTemporaryModelsInCloud();
  const deleteB = ops.deleteTemporaryModelsInCloud();
  const deleteColors = await ops.deleteTemporaryColorsInCloud();
  await Promise.resolve();

  assert.equal(deleteA, deleteB);
  assert.deepEqual(deleteColors, { ok: false, removed: 0, reason: 'busy' });
  assert.equal(getRowCalls, 1);

  releaseGetRow?.();
  await deleteA;
});

test('cloud sync delete-temp tracks preflight pull activity and settled push activity canonically', async () => {
  const storage = createStorageHarness();
  storage.setJSON('savedModels', []);
  storage.setJSON('savedColors', [
    { id: 'temp-1', value: '#111111' },
    { id: 'locked-1', value: '#222222', locked: true },
  ]);
  storage.setJSON('colorOrder', ['temp-1', 'locked-1']);
  storage.setJSON('presetOrder', []);
  storage.setJSON('hiddenPresets', []);

  const runtimeStatus = {
    realtime: { enabled: true, mode: 'broadcast', state: 'subscribed', channel: 'room' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;

  const publishSnapshots: Array<{ lastPullAt: number; lastPushAt: number }> = [];
  const hints: Array<{ scope: string; rowName?: string }> = [];
  let nowMs = 500;
  const realNow = Date.now;
  Date.now = () => (nowMs += 10);

  try {
    const ops = createCloudSyncDeleteTempOps({
      App: createAppHarness().App as any,
      cfg: { anonKey: 'anon' } as any,
      restUrl: 'https://example.invalid',
      storage: storage as any,
      keyModels: 'savedModels',
      keyColors: 'savedColors',
      keyColorOrder: 'colorOrder',
      keyPresetOrder: 'presetOrder',
      keyHiddenPresets: 'hiddenPresets',
      currentRoom: () => 'room-a',
      getRow: async () =>
        ({
          updated_at: '2026-04-13T11:00:00.000Z',
          payload: {
            savedModels: [],
            savedColors: [
              { id: 'temp-1', value: '#111111' },
              { id: 'locked-1', value: '#222222', locked: true },
            ],
            colorSwatchesOrder: ['temp-1', 'locked-1'],
            presetOrder: [],
            hiddenPresets: [],
          },
        }) as any,
      upsertRow: async (_restUrl, _anonKey, room, payload) =>
        ({ ok: true, row: { room, payload, updated_at: '2026-04-13T11:00:30.000Z' } }) as any,
      getSendRealtimeHint: () => (scope: string, rowName?: string) => {
        hints.push({ scope, rowName });
      },
      runtimeStatus,
      publishStatus: () => {
        publishSnapshots.push({ lastPullAt: runtimeStatus.lastPullAt, lastPushAt: runtimeStatus.lastPushAt });
      },
      runMainWriteFlight: (key, run) =>
        createCloudSyncMainWriteSingleFlight({}).run(
          key,
          run,
          () => ({ ok: false, removed: 0, reason: 'busy' }) as any
        ),
      clearPendingPush: () => undefined,
      setLastSeenUpdatedAt: () => undefined,
      setLastHash: () => undefined,
      suppress: { v: false },
      reportNonFatal: () => undefined,
    });

    const result = await ops.deleteTemporaryColorsInCloud();

    assert.deepEqual(result, { ok: true, removed: 1 });
    assert.equal(runtimeStatus.lastPullAt > 0, true);
    assert.equal(runtimeStatus.lastPushAt > runtimeStatus.lastPullAt, true);
    assert.deepEqual(hints, [{ scope: 'main', rowName: 'room-a' }]);
    assert.deepEqual(publishSnapshots, [
      { lastPullAt: runtimeStatus.lastPullAt, lastPushAt: 0 },
      { lastPullAt: runtimeStatus.lastPullAt, lastPushAt: runtimeStatus.lastPushAt },
    ]);
  } finally {
    Date.now = realNow;
  }
});
