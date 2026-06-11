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
    dump(): Record<string, unknown> {
      const out: Record<string, unknown> = {};
      for (const [key, raw] of store.entries()) {
        try {
          out[key] = JSON.parse(raw);
        } catch {
          out[key] = raw;
        }
      }
      return out;
    },
  };
}

function createHarness(opts?: { localSeed?: Record<string, unknown>; rows?: Array<any> }) {
  const storage = createMemoryStorage(
    opts?.localSeed || {
      savedModels: [{ id: 'model-1', name: 'Model 1' }],
      savedColors: [{ id: 'color-1', type: 'solid', value: '#111111' }],
      colorOrder: ['color-1'],
      presetOrder: ['preset-1'],
      hiddenPresets: [],
    }
  );

  const getRowCalls: Array<{ room: string }> = [];
  const upsertCalls: Array<{ room: string; payload: Record<string, unknown> }> = [];
  const hintCalls: Array<{ scope: string; rowName?: string }> = [];
  const timers: Array<{ handler: () => void; active: boolean; ms: number }> = [];
  const diagCalls: Array<[string, unknown]> = [];
  const rows = [...(opts?.rows || [])];

  const ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
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
    getRow: async (_restUrl, _anonKey, room) => {
      getRowCalls.push({ room });
      return rows.length ? (rows.shift() ?? null) : null;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return { ok: true } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    diag: (event, payload) => {
      diagCalls.push([String(event), payload]);
    },
    suppressRef: { v: false },
    getSendRealtimeHint: () => (scope: string, rowName?: string) => {
      hintCalls.push({ scope, rowName });
    },
  });

  return { ops, storage, getRowCalls, upsertCalls, hintCalls, timers, diagCalls };
}

function runNextActiveTimer(harness: ReturnType<typeof createHarness>): void {
  const timer = harness.timers.find(entry => entry.active);
  assert.ok(timer, 'expected an active timer');
  timer!.active = false;
  timer!.handler();
}

function runActiveTimerWhere(
  harness: ReturnType<typeof createHarness>,
  predicate: (timer: { handler: () => void; active: boolean; ms: number }) => boolean,
  message = 'expected an active timer matching the requested predicate'
): void {
  const timer = harness.timers.find(entry => entry.active && predicate(entry));
  assert.ok(timer, message);
  timer!.active = false;
  timer!.handler();
}

function runAllActiveTimers(harness: ReturnType<typeof createHarness>): number {
  let ran = 0;
  while (harness.timers.some(entry => entry.active)) {
    runNextActiveTimer(harness);
    ran++;
  }
  return ran;
}

test('cloud sync main row seeds a missing row from local collections on the initial pull', async () => {
  const harness = createHarness({ rows: [null, { updated_at: '2026-04-02T20:00:00.000Z' }] });

  await harness.ops.pullOnce(true);

  assert.equal(harness.upsertCalls.length, 1);
  assert.deepEqual(harness.upsertCalls[0]?.payload.savedModels, [{ id: 'model-1', name: 'Model 1' }]);
  assert.deepEqual(harness.upsertCalls[0]?.payload.savedColors, [
    { id: 'color-1', type: 'solid', value: '#111111' },
  ]);
  assert.deepEqual(harness.hintCalls, [{ scope: 'main', rowName: 'room-a' }]);
  assert.equal(harness.getRowCalls.length, 2);
});

test('cloud sync main row initial seed reuses returned representation when the upsert already returns the row', async () => {
  const harness = createHarness({ rows: [null] });
  harness.getRowCalls.length = 0;
  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return null;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return { ok: true, row: { room, updated_at: '2026-04-02T20:00:00.000Z', payload } } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    getSendRealtimeHint: () => (scope: string, rowName?: string) => {
      harness.hintCalls.push({ scope, rowName });
    },
  });

  await harness.ops.pullOnce(true);

  assert.equal(harness.upsertCalls.length, 1);
  assert.equal(
    harness.getRowCalls.length,
    1,
    'initial seed should not force an extra read after a represented upsert'
  );
  assert.deepEqual(harness.hintCalls, [{ scope: 'main', rowName: 'room-a' }]);
});

test('cloud sync main row push publishes changed collections once and skips identical repeats', async () => {
  const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:10:00.000Z', payload: {} }] });

  await harness.ops.pushNow();
  await harness.ops.pushNow();

  assert.equal(harness.upsertCalls.length, 1);
  assert.deepEqual(harness.hintCalls, [{ scope: 'main', rowName: 'room-a' }]);
});

test('cloud sync main row push reuses returned representation instead of forcing a follow-up row fetch', async () => {
  const harness = createHarness();
  harness.getRowCalls.length = 0;
  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return { updated_at: '2026-04-02T20:10:00.000Z', payload: {} } as any;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return { ok: true, row: { room, updated_at: '2026-04-02T20:10:00.000Z', payload } } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    getSendRealtimeHint: () => (scope: string, rowName?: string) => {
      harness.hintCalls.push({ scope, rowName });
    },
  });

  await harness.ops.pushNow();

  assert.equal(harness.upsertCalls.length, 1);
  assert.equal(harness.getRowCalls.length, 0, 'push should trust the returned representation when available');
  assert.deepEqual(harness.hintCalls, [{ scope: 'main', rowName: 'room-a' }]);
});

test('cloud sync main row reuses the same pending push promise for duplicate direct pushes', async () => {
  const pendingRows = [{ updated_at: '2026-04-02T20:11:00.000Z', payload: {} }];
  const slowHarness = createHarness({ rows: pendingRows });
  let localResolve: ((value: { ok: true }) => void) | null = null;
  slowHarness.upsertCalls.length = 0;
  // override via cast to avoid rebuilding the full harness helpers
  (slowHarness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: slowHarness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      slowHarness.getRowCalls.push({ room });
      return pendingRows.length ? (pendingRows.shift() ?? null) : null;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      slowHarness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return await new Promise(resolve => {
        localResolve = resolve as typeof localResolve;
      });
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      slowHarness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    getSendRealtimeHint: () => (scope: string, rowName?: string) => {
      slowHarness.hintCalls.push({ scope, rowName });
    },
  });

  const pushA = slowHarness.ops.pushNow();
  const pushB = slowHarness.ops.pushNow();
  await Promise.resolve();
  assert.equal(pushA, pushB);
  assert.equal(slowHarness.upsertCalls.length, 1);

  localResolve?.({ ok: true });
  await pushA;
  assert.equal(slowHarness.getRowCalls.length, 1);
});

test('cloud sync main row pull applies newer remote payloads into local storage', async () => {
  const harness = createHarness({
    rows: [
      {
        updated_at: '2026-04-02T20:00:00.000Z',
        payload: {
          savedModels: [{ id: 'remote-1', name: 'Remote 1' }],
          savedColors: [{ id: 'remote-color', type: 'solid', value: '#abcdef' }],
          colorSwatchesOrder: ['remote-color'],
          presetOrder: ['preset-remote'],
          hiddenPresets: ['hidden-remote'],
        },
      },
      {
        updated_at: '2026-04-02T20:05:00.000Z',
        payload: {
          savedModels: [{ id: 'remote-2', name: 'Remote 2' }],
          savedColors: [{ id: 'remote-color-2', type: 'solid', value: '#123456' }],
          colorSwatchesOrder: ['remote-color-2'],
          presetOrder: ['preset-2'],
          hiddenPresets: [],
        },
      },
    ],
  });

  await harness.ops.pullOnce(false);
  await harness.ops.pullOnce(false);

  const dump = harness.storage.dump();
  assert.deepEqual(dump.savedModels, [{ id: 'remote-2', name: 'Remote 2' }]);
  assert.deepEqual(dump.savedColors, [{ id: 'remote-color-2', type: 'solid', value: '#123456' }]);
  assert.deepEqual(dump.colorOrder, ['remote-color-2']);
  assert.deepEqual(dump.presetOrder, ['preset-2']);
  assert.deepEqual(dump.hiddenPresets, []);
});

test('cloud sync main row coalesces repeated pending pull timers and cancels stale delayed pull on direct pull', async () => {
  const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:00:00.000Z', payload: {} }] });

  harness.ops.schedulePullSoon();
  harness.ops.schedulePullSoon();

  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    1,
    'repeated schedulePullSoon calls should keep one pending timer'
  );

  await harness.ops.pullOnce(false);
  assert.equal(harness.getRowCalls.length, 1, 'direct pull should execute immediately');

  const staleTimer = harness.timers[0];
  assert.ok(staleTimer && staleTimer.active === false, 'direct pull should cancel the older delayed pull');
  assert.equal(
    runAllActiveTimers(harness),
    0,
    'no active delayed pull timers should remain after direct pull'
  );

  assert.equal(harness.getRowCalls.length, 1, 'cancelled delayed pull must not execute after direct pull');
});

test('cloud sync main row coalesces repeated pending push timers and cancels stale delayed push on direct push', async () => {
  const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:10:00.000Z', payload: {} }] });

  harness.ops.schedulePush();
  harness.ops.schedulePush();

  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    1,
    'repeated schedulePush calls should keep one pending timer'
  );

  await harness.ops.pushNow();
  assert.equal(harness.upsertCalls.length, 1, 'direct push should execute immediately');

  const staleTimer = harness.timers[0];
  assert.ok(staleTimer && staleTimer.active === false, 'direct push should cancel the older delayed push');
  assert.equal(
    runAllActiveTimers(harness),
    0,
    'direct push should not leave a follow-up pull timer when the write already settled canonically'
  );

  assert.equal(harness.upsertCalls.length, 1, 'cancelled delayed push must not execute after direct push');
});

test('cloud sync main row push applies settled remote payload locally without forcing a follow-up pull', async () => {
  const harness = createHarness();
  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return null;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return {
        ok: true,
        row: {
          room,
          updated_at: '2026-04-02T20:10:00.000Z',
          payload: {
            ...payload,
            hiddenPresets: ['server-hidden'],
          },
        },
      } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    getSendRealtimeHint: () => (scope: string, rowName?: string) => {
      harness.hintCalls.push({ scope, rowName });
    },
  });

  await harness.ops.pushNow();

  assert.equal(harness.getRowCalls.length, 0, 'settled write should not force a follow-up row fetch');
  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    0,
    'settled write should not queue a pull timer'
  );
  const dump = harness.storage.dump();
  assert.deepEqual(dump.hiddenPresets, ['server-hidden']);
});

test('cloud sync main row collapses pull retries during a push into one post-push follow-up pull', async () => {
  const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:10:00.000Z', payload: {} }] });
  let resolvePush: ((value: { ok: true }) => void) | null = null;

  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return { updated_at: '2026-04-02T20:10:00.000Z', payload: {} } as any;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return await new Promise(resolve => {
        resolvePush = resolve as typeof resolvePush;
      });
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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

  const push = harness.ops.pushNow();
  await Promise.resolve();
  assert.equal(harness.ops.isPushInFlight(), true);

  harness.ops.schedulePullSoon();
  harness.ops.schedulePullSoon();

  assert.equal(harness.getRowCalls.length, 0, 'pull should not run while a push is still in flight');
  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    0,
    'push-blocked pull retries should not keep waking retry timers while the write is still in flight'
  );

  resolvePush?.({ ok: true });
  await push;

  assert.equal(
    harness.getRowCalls.length,
    1,
    'push completion should only perform its canonical row fetch until the queued post-push pull runs'
  );
  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    1,
    'one canonical post-push pull timer should be queued after the write clears'
  );

  runNextActiveTimer(harness);

  assert.equal(
    harness.getRowCalls.length,
    2,
    'push follow-up row fetch plus one queued post-push pull should run after the in-flight push clears'
  );
  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    0,
    'post-push follow-up should collapse to one timer instead of a retry loop'
  );
});

test('cloud sync main row keeps the earliest queued post-push pull delay across mixed blocked requests', async () => {
  const harness = createHarness();
  let resolvePush: ((value: { ok: true }) => void) | null = null;

  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return { updated_at: '2026-04-02T20:10:00.000Z', payload: {} } as any;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return await new Promise(resolve => {
        resolvePush = resolve as typeof resolvePush;
      });
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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

  const push = harness.ops.pushNow();
  await Promise.resolve();
  assert.equal(harness.ops.isPushInFlight(), true);

  harness.ops.schedulePullSoon();
  harness.ops.schedulePullSoon({ immediate: true });

  assert.equal(harness.timers.filter(timer => timer.active).length, 0);

  resolvePush?.({ ok: true });
  await push;

  const activeTimers = harness.timers.filter(timer => timer.active);
  assert.equal(activeTimers.length, 1, 'push-blocked follow-up work should still collapse to one timer');
  assert.deepEqual(
    activeTimers.map(timer => timer.ms),
    [0],
    'mixed blocked requests should preserve the earliest requested post-push pull delay'
  );
});

test('cloud sync main row notifies push-settled listeners only after the push flight has cleared', async () => {
  const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:10:00.000Z', payload: {} }] });
  let resolvePush: ((value: { ok: true }) => void) | null = null;
  const listenerPushStates: boolean[] = [];
  const listenerActiveTimerCounts: number[] = [];

  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return { updated_at: '2026-04-02T20:10:00.000Z', payload: {} } as any;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return await new Promise(resolve => {
        resolvePush = resolve as typeof resolvePush;
      });
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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

  harness.ops.subscribePushSettled(() => {
    listenerPushStates.push(harness.ops.isPushInFlight());
    listenerActiveTimerCounts.push(harness.timers.filter(timer => timer.active).length);
  });

  const push = harness.ops.pushNow();
  await Promise.resolve();
  assert.equal(harness.ops.isPushInFlight(), true);

  harness.ops.schedulePullSoon();
  harness.ops.schedulePullSoon();
  assert.equal(harness.timers.filter(timer => timer.active).length, 0);

  resolvePush?.({ ok: true });
  await push;

  assert.deepEqual(listenerPushStates, [false]);
  assert.deepEqual(listenerActiveTimerCounts, [1]);
});

test('cloud sync main row keeps the earliest queued post-pull delay across mixed blocked requests', async () => {
  const harness = createHarness();
  let resolveRow: ((value: { updated_at: string; payload: Record<string, unknown> }) => void) | null = null;

  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return await new Promise(resolve => {
        resolveRow = resolve as typeof resolveRow;
      });
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return { ok: true } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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

  const firstPull = harness.ops.pullOnce(false);
  await Promise.resolve();

  harness.ops.schedulePullSoon();
  harness.ops.schedulePullSoon({ immediate: true });

  assert.equal(
    harness.getRowCalls.length,
    1,
    'the in-flight pull should stay singleflight while mixed follow-ups queue'
  );
  assert.equal(harness.timers.filter(timer => timer.active).length, 0);

  resolveRow?.({ updated_at: '2026-04-02T20:10:00.000Z', payload: {} });
  await firstPull;

  const activeTimers = harness.timers.filter(timer => timer.active);
  assert.equal(activeTimers.length, 1, 'pull-blocked follow-up work should still collapse to one timer');
  assert.deepEqual(
    activeTimers.map(timer => timer.ms),
    [0],
    'mixed blocked requests should preserve the earliest requested post-pull delay'
  );
});

test('cloud sync main row shares app-scoped push ownership across main-row instances for the same App', async () => {
  const sharedApp = {
    services: {
      models: {
        ensureLoaded() {
          return undefined;
        },
      },
    },
    maps: {
      setSavedColors() {
        return undefined;
      },
      setColorSwatchesOrder() {
        return undefined;
      },
    },
  } as any;
  const storageA = createMemoryStorage({
    savedModels: [{ id: 'model-1', name: 'Model 1' }],
    savedColors: [{ id: 'color-1', type: 'solid', value: '#111111' }],
    colorOrder: ['color-1'],
    presetOrder: ['preset-1'],
    hiddenPresets: [],
  });
  const storageB = createMemoryStorage({
    savedModels: [{ id: 'model-1', name: 'Model 1' }],
    savedColors: [{ id: 'color-1', type: 'solid', value: '#111111' }],
    colorOrder: ['color-1'],
    presetOrder: ['preset-1'],
    hiddenPresets: [],
  });
  let resolvePush: (() => void) | null = null;
  const upsertCalls: Array<string> = [];
  const rows = [{ updated_at: '2026-04-02T20:12:00.000Z', payload: {} } as any];

  const createOps = (storage: any) =>
    createCloudSyncMainRowOps({
      App: sharedApp,
      cfg: { anonKey: 'anon' } as any,
      restUrl: 'https://example.test/rest',
      room: 'room-a',
      storage,
      keyModels: 'savedModels',
      keyColors: 'savedColors',
      keyColorOrder: 'colorOrder',
      keyPresetOrder: 'presetOrder',
      keyHiddenPresets: 'hiddenPresets',
      getRow: async () => rows.shift() ?? null,
      upsertRow: async (_restUrl, _anonKey, room) => {
        upsertCalls.push(room);
        await new Promise<void>(resolve => {
          resolvePush = resolve;
        });
        return { ok: true } as any;
      },
      setTimeoutFn: handler => ({ handler, active: true }) as any,
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

  const first = createOps(storageA as any);
  const second = createOps(storageB as any);

  const pushA = first.pushNow();
  const pushB = second.pushNow();
  await Promise.resolve();

  assert.equal(pushA, pushB);
  assert.equal(upsertCalls.length, 1);
  assert.equal(first.isPushInFlight(), true);
  assert.equal(second.isPushInFlight(), true);

  resolvePush?.();
  await pushA;
  assert.equal(first.isPushInFlight(), false);
  assert.equal(second.isPushInFlight(), false);
});

test('cloud sync main row rearms a delayed pull when a newer immediate request needs an earlier run', () => {
  const realNow = Date.now;
  let nowMs = 1_000;
  Date.now = () => nowMs;

  try {
    const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:00:00.000Z', payload: {} }] });

    harness.ops.schedulePullSoon();
    assert.deepEqual(
      harness.timers.filter(timer => timer.active).map(timer => timer.ms),
      [350],
      'default main-row pull scheduling should keep the canonical delayed pull'
    );

    nowMs = 1_010;
    harness.ops.schedulePullSoon({ immediate: true });

    assert.deepEqual(
      harness.timers.filter(timer => timer.active).map(timer => timer.ms),
      [0],
      'an urgent main-row pull should replace the stale delayed timer with one immediate timer'
    );
    assert.equal(
      harness.timers.filter(timer => timer.active).length,
      1,
      'main-row pull scheduling should still keep only one active timer after the rearm'
    );
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync main row collapses pull requests that arrive while a pull is already in flight into one post-flight follow-up', async () => {
  const harness = createHarness();
  let resolveRow: ((value: { updated_at: string; payload: Record<string, unknown> }) => void) | null = null;

  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return await new Promise(resolve => {
        resolveRow = resolve as typeof resolveRow;
      });
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return { ok: true } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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

  const firstPull = harness.ops.pullOnce(false);
  await Promise.resolve();

  harness.ops.schedulePullSoon({ immediate: true });
  harness.ops.schedulePullSoon({ immediate: true });

  assert.equal(
    harness.getRowCalls.length,
    1,
    'the in-flight pull should stay singleflight while new requests queue'
  );
  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    0,
    'follow-up requests arriving during a pull should stay parked instead of spinning retry timers'
  );

  resolveRow?.({ updated_at: '2026-04-02T20:10:00.000Z', payload: {} });
  await firstPull;

  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    1,
    'once the in-flight pull settles, one canonical follow-up timer should be queued'
  );
  assert.deepEqual(
    harness.timers.filter(timer => timer.active).map(timer => timer.ms),
    [0],
    'the queued post-flight pull should keep the earliest requested delay'
  );

  runNextActiveTimer(harness);
  await Promise.resolve();

  assert.equal(
    harness.getRowCalls.length,
    2,
    'exactly one follow-up pull should run after the first flight settles'
  );
  assert.equal(harness.timers.filter(timer => timer.active).length, 0);
});

test('cloud sync main row preserves one follow-up push request raised while a push is already in flight', async () => {
  const rows = [{ updated_at: '2026-04-02T20:11:00.000Z', payload: {} }];
  const harness = createHarness({ rows });
  let resolveFirst: ((value: { ok: true }) => void) | null = null;
  harness.upsertCalls.length = 0;
  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return rows.length ? (rows.shift() ?? null) : null;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      if (harness.upsertCalls.length === 1) {
        return await new Promise(resolve => {
          resolveFirst = value =>
            resolve({
              ...value,
              row: {
                room,
                updated_at: '2026-04-02T20:11:30.000Z',
                payload: payload as Record<string, unknown>,
              },
            } as any);
        });
      }
      return {
        ok: true,
        row: {
          room,
          updated_at: '2026-04-02T20:12:00.000Z',
          payload: payload as Record<string, unknown>,
        },
      } as any;
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    getSendRealtimeHint: () => (scope: string, rowName?: string) => {
      harness.hintCalls.push({ scope, rowName });
    },
  });

  const pushA = harness.ops.pushNow();
  harness.storage.setJSON('savedModels', [{ id: 'model-2', name: 'Model 2' }]);
  harness.ops.schedulePush();
  assert.equal(
    harness.timers.filter(timer => timer.active).length,
    0,
    'follow-up request should park behind the active write instead of arming a throwaway timer'
  );

  resolveFirst?.({ ok: true });
  await pushA;
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(
    harness.upsertCalls.length,
    2,
    'a parked follow-up push should replay after the active write settles'
  );
  assert.deepEqual(harness.upsertCalls[1]?.payload.savedModels, [{ id: 'model-2', name: 'Model 2' }]);
});

test('cloud sync main row parks recovery pulls behind a debounced pending push so local changes flush first', async () => {
  const rows = [{ updated_at: '2026-04-02T20:13:00.000Z', payload: {} }];
  const harness = createHarness({ rows });
  let resolvePush:
    | ((value: {
        ok: true;
        row?: { room: string; updated_at: string; payload: Record<string, unknown> };
      }) => void)
    | null = null;
  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return rows.length ? (rows.shift() ?? null) : null;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return await new Promise(resolve => {
        resolvePush = value => {
          resolve({
            ...value,
            row: {
              room,
              updated_at: '2026-04-02T20:13:30.000Z',
              payload: payload as Record<string, unknown>,
            },
          } as any);
        };
      });
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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

  const pushSettled = new Promise<void>(resolve => {
    const unsubscribe = harness.ops.subscribePushSettled(() => {
      unsubscribe();
      resolve();
    });
  });

  harness.storage.setJSON('savedModels', [{ id: 'model-2', name: 'Model 2' }]);
  harness.ops.schedulePush();
  harness.ops.schedulePullSoon({ immediate: true, reason: 'realtime.main' });

  assert.deepEqual(
    harness.timers.filter(timer => timer.active).map(timer => timer.ms),
    [700],
    'recovery pull should stay parked while a debounced local push is still pending'
  );

  runActiveTimerWhere(
    harness,
    timer => timer.ms === 700,
    'expected the debounced push timer to remain the only active main-row timer'
  );
  await Promise.resolve();

  assert.equal(harness.upsertCalls.length, 1);
  assert.deepEqual(harness.upsertCalls[0]?.payload.savedModels, [{ id: 'model-2', name: 'Model 2' }]);
  assert.equal(
    harness.getRowCalls.length,
    0,
    'recovery pull must not fetch remote state before the pending local push has settled'
  );

  resolvePush?.({ ok: true });
  await pushSettled;
  await Promise.resolve();

  assert.deepEqual(
    harness.timers.filter(timer => timer.active).map(timer => timer.ms),
    [0],
    'once the push settles, the parked recovery pull should rearm as the canonical follow-up'
  );

  runActiveTimerWhere(
    harness,
    timer => timer.ms === 0,
    'expected the parked recovery pull to rearm immediately after the push settles'
  );
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.getRowCalls.length, 1);
});

test('cloud sync main row preserves canonical main pull reasons when pull-all and realtime requests coalesce', async () => {
  const harness = createHarness({ rows: [{ updated_at: '2026-04-02T20:15:00.000Z', payload: {} }] });
  const realNow = Date.now;
  let nowMs = 2_000;
  Date.now = () => nowMs;

  try {
    harness.ops.schedulePullSoon({ reason: 'attention.main' });
    nowMs = 2_010;
    harness.ops.schedulePullSoon({ immediate: true, reason: 'realtime.main' });

    assert.deepEqual(
      harness.timers.filter(timer => timer.active).map(timer => timer.ms),
      [0],
      'an urgent realtime main request should replace the stale delayed main pull timer'
    );

    runNextActiveTimer(harness);
    await Promise.resolve();
    await Promise.resolve();

    const payload = harness.diagCalls.find(([event]) => event === 'mainRow.pull:coalesced:run')?.[1] as
      | { count?: number; reason?: string }
      | undefined;
    assert.deepEqual(payload, {
      count: 2,
      reason: 'attention.main|realtime.main',
    });
    assert.equal(harness.getRowCalls.length, 1);
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync main row keeps canonical main pull reasons across a push-blocked follow-up pull', async () => {
  const harness = createHarness();
  let resolvePush: ((value: { ok: true }) => void) | null = null;

  (harness as any).ops = createCloudSyncMainRowOps({
    App: {
      services: {
        models: {
          ensureLoaded() {
            return undefined;
          },
        },
      },
      maps: {
        setSavedColors() {
          return undefined;
        },
        setColorSwatchesOrder() {
          return undefined;
        },
      },
    } as any,
    cfg: { anonKey: 'anon' } as any,
    restUrl: 'https://example.test/rest',
    room: 'room-a',
    storage: harness.storage as any,
    keyModels: 'savedModels',
    keyColors: 'savedColors',
    keyColorOrder: 'colorOrder',
    keyPresetOrder: 'presetOrder',
    keyHiddenPresets: 'hiddenPresets',
    getRow: async (_restUrl, _anonKey, room) => {
      harness.getRowCalls.push({ room });
      return { updated_at: '2026-04-02T20:10:00.000Z', payload: {} } as any;
    },
    upsertRow: async (_restUrl, _anonKey, room, payload) => {
      harness.upsertCalls.push({ room, payload: payload as Record<string, unknown> });
      return await new Promise(resolve => {
        resolvePush = resolve as typeof resolvePush;
      });
    },
    setTimeoutFn: (handler, ms) => {
      const timer = { handler, active: true, ms: Number(ms) || 0 };
      harness.timers.push(timer);
      return timer as any;
    },
    clearTimeoutFn: (id: unknown) => {
      const timer = id as { active?: boolean } | null;
      if (timer && typeof timer === 'object') timer.active = false;
    },
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
    diag: (event, payload) => {
      harness.diagCalls.push([String(event), payload]);
    },
    suppressRef: { v: false },
    getSendRealtimeHint: () => null,
  });

  const push = harness.ops.pushNow();
  await Promise.resolve();

  harness.ops.schedulePullSoon({ reason: 'poll.main' });
  harness.ops.schedulePullSoon({ immediate: true, reason: 'realtime.main' });

  resolvePush?.({ ok: true });
  await push;

  runNextActiveTimer(harness);
  await Promise.resolve();
  await Promise.resolve();

  const payload = harness.diagCalls.find(([event]) => event === 'mainRow.pull:coalesced:run')?.[1] as
    | { count?: number; reason?: string }
    | undefined;
  assert.deepEqual(payload, {
    count: 2,
    reason: 'poll.main|realtime.main',
  });
  assert.equal(
    harness.getRowCalls.length,
    2,
    'push follow-up fetch plus one queued pull should still run canonically'
  );
});
