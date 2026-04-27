import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncMainRowOps } from '../esm/native/services/cloud_sync_main_row.ts';
import { createCloudSyncSketchOps } from '../esm/native/services/cloud_sync_sketch_ops.ts';
import { createCloudSyncTabsGateOps } from '../esm/native/services/cloud_sync_tabs_gate.ts';

function createRuntimeStatus() {
  return {
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
  } as any;
}

function createMainRowStorage() {
  const store = new Map<string, string>([
    ['savedModels', JSON.stringify([{ id: 'model-1', name: 'Model 1' }])],
    ['savedColors', JSON.stringify([{ id: 'color-1', type: 'solid', value: '#111111' }])],
    ['colorOrder', JSON.stringify(['color-1'])],
    ['presetOrder', JSON.stringify(['preset-1'])],
    ['hiddenPresets', JSON.stringify([])],
  ]);
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

function createBrowserApp(siteVariant: 'main' | 'site2' = 'main') {
  const doc = {
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
    visibilityState: 'visible',
  };
  const win = {
    document: doc,
    navigator: { userAgent: 'unit-test', onLine: true },
    location: { search: '', pathname: siteVariant === 'site2' ? '/index_site2.html' : '/index_pro.html' },
  };
  return {
    deps: {
      browser: {
        window: win,
        document: doc,
        location: win.location,
        navigator: win.navigator,
      },
    },
    store: {
      getState() {
        return { config: { siteVariant }, ui: {} };
      },
    },
    storeApi: {
      getState() {
        return { ui: {} };
      },
      setState() {
        return undefined;
      },
    },
    services: {
      models: {
        ensureLoaded() {
          return undefined;
        },
      },
      projectIO: {
        exportCurrentProject() {
          return {
            projectData: { settings: { width: 40 } },
            jsonStr: JSON.stringify({ settings: { width: 40 } }),
          };
        },
        loadProjectData() {
          return { ok: true, restoreGen: 1 };
        },
      },
      uiFeedback: {
        toast() {
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
}

function createTabsStorage(seed?: Record<string, string>) {
  const raw = new Map<string, string>(Object.entries(seed || {}));
  return {
    getString(key: unknown): string | null {
      const k = String(key || '');
      return raw.has(k) ? String(raw.get(k)) : null;
    },
    setString(key: unknown, value: unknown): boolean {
      raw.set(String(key || ''), String(value || ''));
      return true;
    },
  };
}

test('cloud sync main row fallback settlement read stays inside push activity instead of stamping a synthetic pull', async () => {
  const runtimeStatus = createRuntimeStatus();
  const publishEvents: Array<{ lastPullAt: number; lastPushAt: number }> = [];
  let nowMs = 100;
  const realNow = Date.now;
  Date.now = () => (nowMs += 10);

  try {
    const ops = createCloudSyncMainRowOps({
      App: createBrowserApp('main'),
      cfg: { anonKey: 'anon' } as any,
      restUrl: 'https://example.test/rest',
      room: 'room-a',
      storage: createMainRowStorage() as any,
      keyModels: 'savedModels',
      keyColors: 'savedColors',
      keyColorOrder: 'colorOrder',
      keyPresetOrder: 'presetOrder',
      keyHiddenPresets: 'hiddenPresets',
      getRow: async () => ({ updated_at: '2026-04-13T10:00:00.000Z', payload: {} }) as any,
      upsertRow: async () => ({ ok: true, row: null }) as any,
      setTimeoutFn: handler => ({ handler }) as any,
      clearTimeoutFn: () => undefined,
      runtimeStatus,
      publishStatus: () => {
        publishEvents.push({ lastPullAt: runtimeStatus.lastPullAt, lastPushAt: runtimeStatus.lastPushAt });
      },
      suppressRef: { v: false },
      getSendRealtimeHint: () => null,
    });

    await ops.pushNow();

    assert.equal(runtimeStatus.lastPushAt > 0, true);
    assert.equal(runtimeStatus.lastPullAt, 0);
    assert.deepEqual(publishEvents, [{ lastPullAt: 0, lastPushAt: runtimeStatus.lastPushAt }]);
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync tabs gate tracks control-row push and pull activity through runtime status', async () => {
  const runtimeStatus = createRuntimeStatus();
  let publishCount = 0;
  let nowMs = 200;
  const realNow = Date.now;
  Date.now = () => (nowMs += 10);

  try {
    const ops = createCloudSyncTabsGateOps({
      App: createBrowserApp('main'),
      cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
      storage: createTabsStorage(),
      getGateBaseRoom: () => 'private-room',
      restUrl: 'https://example.test',
      clientId: 'client-1',
      getRow: async () => ({ updated_at: '2026-04-13T10:01:00.000Z', payload: {} }) as any,
      upsertRow: async () => ({ ok: true, row: null }) as any,
      setTimeoutFn: (() => 0) as any,
      clearTimeoutFn: (() => undefined) as any,
      emitRealtimeHint: () => undefined,
      runtimeStatus,
      publishStatus: () => {
        publishCount += 1;
      },
    });

    await ops.pushTabsGateNow(true, 0);
    const afterPushSettle = runtimeStatus.lastPullAt;
    await ops.pullTabsGateOnce(false);

    assert.equal(runtimeStatus.lastPushAt > 0, true);
    assert.equal(afterPushSettle, 0);
    assert.equal(runtimeStatus.lastPullAt > runtimeStatus.lastPushAt, true);
    assert.equal(publishCount, 2);
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync sketch preflight read marks pull activity before the push path settles', async () => {
  const runtimeStatus = createRuntimeStatus();
  const publishSnapshots: Array<{ lastPullAt: number; lastPushAt: number }> = [];
  let nowMs = 260;
  const realNow = Date.now;
  Date.now = () => (nowMs += 10);

  try {
    const ops = createCloudSyncSketchOps({
      App: createBrowserApp('main'),
      cfg: {
        anonKey: 'anon',
        roomParam: 'room',
        publicRoom: 'public',
        privateRoom: 'private-room',
        site2SketchInitialAutoLoad: true,
        site2SketchInitialMaxAgeHours: 12,
      },
      storage: createTabsStorage(),
      getGateBaseRoom: () => 'room-a',
      restUrl: 'https://example.test',
      clientId: 'client-1',
      currentRoom: () => 'room-a',
      getRow: async () => null as any,
      upsertRow: async () =>
        ({ ok: true, row: { updated_at: '2026-04-13T10:02:30.000Z', payload: {} } }) as any,
      emitRealtimeHint: () => undefined,
      runtimeStatus,
      publishStatus: () => {
        publishSnapshots.push({ lastPullAt: runtimeStatus.lastPullAt, lastPushAt: runtimeStatus.lastPushAt });
      },
      diag: () => undefined,
    });

    await ops.syncSketchNow();

    assert.equal(runtimeStatus.lastPullAt > 0, true);
    assert.equal(runtimeStatus.lastPushAt > runtimeStatus.lastPullAt, true);
    assert.deepEqual(publishSnapshots, [
      { lastPullAt: runtimeStatus.lastPullAt, lastPushAt: 0 },
      { lastPullAt: runtimeStatus.lastPullAt, lastPushAt: runtimeStatus.lastPushAt },
    ]);
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync sketch and floating-sync paths share canonical runtime status activity stamps', async () => {
  const runtimeStatus = createRuntimeStatus();
  const publishSnapshots: Array<{ lastPullAt: number; lastPushAt: number }> = [];
  let nowMs = 300;
  const realNow = Date.now;
  Date.now = () => (nowMs += 10);

  try {
    const ops = createCloudSyncSketchOps({
      App: createBrowserApp('main'),
      cfg: {
        anonKey: 'anon',
        roomParam: 'room',
        publicRoom: 'public',
        privateRoom: 'private-room',
        site2SketchInitialAutoLoad: true,
        site2SketchInitialMaxAgeHours: 12,
      },
      storage: createTabsStorage(),
      getGateBaseRoom: () => 'room-a',
      restUrl: 'https://example.test',
      clientId: 'client-1',
      currentRoom: () => 'room-a',
      getRow: async (_rest, _anon, room) => {
        if (String(room).includes('syncPin'))
          return { updated_at: '2026-04-13T10:03:00.000Z', payload: {} } as any;
        return {
          updated_at: '2026-04-13T10:02:00.000Z',
          payload: {
            sketchRev: 1,
            sketchHash: 'remote-hash',
            sketchBy: 'remote',
            sketch: { settings: { width: 50 } },
          },
        } as any;
      },
      upsertRow: async (_rest, _anon, room) => {
        if (String(room).includes('syncPin')) return { ok: true, row: null } as any;
        return { ok: true, row: { updated_at: '2026-04-13T10:02:30.000Z', payload: {} } } as any;
      },
      emitRealtimeHint: () => undefined,
      runtimeStatus,
      publishStatus: () => {
        publishSnapshots.push({ lastPullAt: runtimeStatus.lastPullAt, lastPushAt: runtimeStatus.lastPushAt });
      },
      diag: () => undefined,
    });

    await ops.syncSketchNow();
    const afterSketchPush = runtimeStatus.lastPushAt;
    await ops.pullSketchOnce(false);
    const afterSketchPull = runtimeStatus.lastPullAt;
    await ops.pushFloatingSketchSyncPinnedNow(true);

    assert.equal(afterSketchPush > 0, true);
    assert.equal(afterSketchPull > afterSketchPush, true);
    assert.equal(runtimeStatus.lastPullAt, afterSketchPull);
    assert.equal(runtimeStatus.lastPushAt > afterSketchPull, true);
    assert.equal(publishSnapshots.length >= 4, true);
  } finally {
    Date.now = realNow;
  }
});
