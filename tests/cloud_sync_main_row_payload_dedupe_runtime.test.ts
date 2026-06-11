import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncMainRowOps } from '../esm/native/services/cloud_sync_main_row.ts';

function createMemoryStorage(seed?: Record<string, unknown>) {
  const store = new Map<string, string>();
  Object.entries(seed || {}).forEach(([key, value]) => {
    store.set(key, JSON.stringify(value));
  });
  return {
    getJSON<T>(key: unknown, fallback: T): T {
      const raw = store.get(String(key));
      return raw ? (JSON.parse(raw) as T) : fallback;
    },
    setJSON(key: unknown, value: unknown): boolean {
      store.set(String(key), JSON.stringify(value));
      return true;
    },
    getString(key: unknown): string | null {
      return store.get(String(key)) ?? null;
    },
    setString(key: unknown, value: unknown): boolean {
      store.set(String(key), String(value));
      return true;
    },
  };
}

function createHarness(rows: Array<any>, seed?: Record<string, unknown>) {
  const storage = createMemoryStorage(
    seed || {
      savedModels: [{ id: 'model-1', name: 'Model 1' }],
      savedColors: [{ id: 'color-1', type: 'solid', value: '#111111' }],
      colorOrder: ['color-1'],
      presetOrder: ['preset-1'],
      hiddenPresets: [],
    }
  );

  const ensureLoadedCalls: number[] = [];
  const setSavedColorsCalls: Array<unknown[]> = [];
  const setColorOrderCalls: Array<unknown[]> = [];
  const getRowQueue = [...rows];

  const ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            ensureLoadedCalls.push(1);
          },
        },
      },
      maps: {
        setSavedColors(_next: unknown, colors: unknown[]) {
          setSavedColorsCalls.push(colors);
        },
        setColorSwatchesOrder(_next: unknown, order: unknown[]) {
          setColorOrderCalls.push(order);
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async () => (getRowQueue.length ? (getRowQueue.shift() ?? null) : null),
    upsertRow: async () => ({ ok: true }) as any,
    setTimeoutFn: handler => handler as any,
    clearTimeoutFn: () => undefined,
    runtimeStatus: {
      realtime: { state: 'idle', enabled: true, mode: 'broadcast', channel: '' },
      polling: { active: false, intervalMs: 5000, reason: '' },
      room: 'room-a',
      clientId: 'client-a',
      instanceId: 'instance-a',
      lastPullAt: 0,
      lastPushAt: 0,
      lastRealtimeEventAt: 0,
      lastError: '',
      diagEnabled: false,
    } as any,
    publishStatus: () => undefined,
    suppressRef: { v: false },
    getSendRealtimeHint: () => null,
  });

  return { ops, ensureLoadedCalls, setSavedColorsCalls, setColorOrderCalls };
}

test('cloud sync main row skips remote apply churn when newer rows carry the same payload', async () => {
  const payload = {
    savedModels: [{ id: 'model-1', name: 'Model 1' }],
    savedColors: [{ id: 'color-1', type: 'solid', value: '#111111' }],
    colorSwatchesOrder: ['color-1'],
    presetOrder: ['preset-1'],
    hiddenPresets: [],
  };

  const harness = createHarness([
    { updated_at: '2026-04-03T10:00:00.000Z', payload },
    { updated_at: '2026-04-03T10:05:00.000Z', payload },
  ]);

  await harness.ops.pullOnce(false);
  await harness.ops.pullOnce(false);

  assert.equal(harness.ensureLoadedCalls.length, 0);
  assert.equal(harness.setSavedColorsCalls.length, 0);
  assert.equal(harness.setColorOrderCalls.length, 0);
});

test('cloud sync main row still applies remote payloads when the effective collections actually change', async () => {
  const harness = createHarness([
    {
      updated_at: '2026-04-03T10:00:00.000Z',
      payload: {
        savedModels: [{ id: 'remote-1', name: 'Remote 1' }],
        savedColors: [{ id: 'remote-color', type: 'solid', value: '#abcdef' }],
        colorSwatchesOrder: ['remote-color'],
        presetOrder: ['preset-remote'],
        hiddenPresets: [],
      },
    },
  ]);

  await harness.ops.pullOnce(false);

  assert.equal(harness.ensureLoadedCalls.length, 1);
  assert.equal(harness.setSavedColorsCalls.length, 1);
  assert.equal(harness.setColorOrderCalls.length, 1);
});

test('cloud sync main row treats missing color-order payloads as a no-op when the effective applied state is unchanged', async () => {
  const harness = createHarness([
    {
      updated_at: '2026-04-03T10:00:00.000Z',
      payload: {
        savedModels: [{ id: 'model-1', name: 'Model 1' }],
        savedColors: [{ id: 'color-1', type: 'solid', value: '#111111' }],
        presetOrder: ['preset-1'],
        hiddenPresets: [],
      },
    },
  ]);

  await harness.ops.pullOnce(false);

  assert.equal(harness.ensureLoadedCalls.length, 0);
  assert.equal(harness.setSavedColorsCalls.length, 0);
  assert.equal(harness.setColorOrderCalls.length, 0);
});
