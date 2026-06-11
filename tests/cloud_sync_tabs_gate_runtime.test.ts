import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncTabsGateOps } from '../esm/native/services/cloud_sync_tabs_gate.ts';

type AnyRecord = Record<string, unknown>;

type StorageMapLike = {
  getString(key: unknown): string | null;
  setString(key: unknown, value: unknown): boolean;
};

function createStorage(seed?: Record<string, string>): StorageMapLike {
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

function createBrowserApp(siteVariant: 'main' | 'site2'): AnyRecord {
  const doc = {
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  const win = {
    document: doc,
    navigator: { userAgent: 'unit-test' },
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
        // ignore
      },
    },
  };
}

test('cloud sync tabs gate closes stale site2 UI on initial pull miss', async () => {
  const app = createBrowserApp('site2');
  const storage = createStorage({
    wp_site2_tabs_gate_open: '0',
    wp_site2_tabs_gate_until: '0',
  });

  const ops = createCloudSyncTabsGateOps({
    App: app as any,
    cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
    storage,
    getGateBaseRoom: () => 'private-room',
    restUrl: 'https://example.test',
    clientId: 'client-1',
    getRow: async () => null,
    upsertRow: async () => ({ ok: true, row: null }),
    setTimeoutFn: (() => 0) as any,
    clearTimeoutFn: (() => undefined) as any,
    emitRealtimeHint: () => undefined,
  });

  ops.patchSite2TabsGateUi(true, Date.now() + 60_000, 'stale');
  assert.equal(ops.tabsGateOpenRef.value, true);

  await ops.pullTabsGateOnce(true);

  assert.equal(ops.tabsGateOpenRef.value, false);
  assert.equal(ops.tabsGateUntilRef.value, 0);
  assert.equal(storage.getString('wp_site2_tabs_gate_open'), '0');
  assert.equal(storage.getString('wp_site2_tabs_gate_until'), '0');
});

test('cloud sync tabs gate uses the current gate base room for push and pull', async () => {
  const app = createBrowserApp('main');
  const storage = createStorage();
  const rooms: string[] = [];
  let gateBaseRoom = 'room-a';

  const ops = createCloudSyncTabsGateOps({
    App: app as any,
    cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
    storage,
    getGateBaseRoom: () => gateBaseRoom,
    restUrl: 'https://example.test',
    clientId: 'client-1',
    getRow: async (_rest, _anon, room) => {
      rooms.push(room);
      return null;
    },
    upsertRow: async (_rest, _anon, room) => {
      rooms.push(room);
      return { ok: true, row: { updated_at: '2026-03-16T00:00:00Z', payload: {} } as any };
    },
    setTimeoutFn: (() => 0) as any,
    clearTimeoutFn: (() => undefined) as any,
    emitRealtimeHint: () => undefined,
  });

  const pushed = await ops.pushTabsGateNow(true, 0);
  assert.equal(pushed.ok, true);
  assert.equal(rooms[0], 'room-a::tabsGate');

  gateBaseRoom = 'room-b';
  await ops.pullTabsGateOnce(false);
  assert.equal(rooms.at(-1), 'room-b::tabsGate');
});

test('cloud sync tabs gate defaults to the public room when no room URL is selected', async () => {
  const app = createBrowserApp('main');
  const storage = createStorage();
  const rooms: string[] = [];

  const ops = createCloudSyncTabsGateOps({
    App: app as any,
    cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public', privateRoom: 'private-room' },
    storage,
    restUrl: 'https://example.test',
    clientId: 'client-1',
    getRow: async (_rest, _anon, room) => {
      rooms.push(room);
      return null;
    },
    upsertRow: async (_rest, _anon, room) => {
      rooms.push(room);
      return { ok: true, row: { updated_at: '2026-03-16T00:00:00Z', payload: {} } as any };
    },
    setTimeoutFn: (() => 0) as any,
    clearTimeoutFn: (() => undefined) as any,
    emitRealtimeHint: () => undefined,
  });

  assert.equal((await ops.pushTabsGateNow(true, 0)).ok, true);
  assert.equal(rooms[0], 'public::tabsGate');
});

test('cloud sync tabs gate public-room push is visible to site2 public-room pull', async () => {
  const rows = new Map<string, { updated_at: string; payload: AnyRecord }>();

  const createOps = (siteVariant: 'main' | 'site2') =>
    createCloudSyncTabsGateOps({
      App: createBrowserApp(siteVariant) as any,
      cfg: {
        anonKey: 'anon',
        roomParam: 'room',
        publicRoom: 'public',
        privateRoom: `${siteVariant}-private`,
      },
      storage: createStorage(),
      restUrl: 'https://example.test',
      clientId: `${siteVariant}-client`,
      getRow: async (_rest, _anon, room) => (rows.get(room) || null) as any,
      upsertRow: async (_rest, _anon, room, payload) => {
        const row = {
          updated_at: new Date().toISOString(),
          payload: { ...(payload as AnyRecord) },
        };
        rows.set(room, row);
        return { ok: true, row: row as any };
      },
      setTimeoutFn: (() => 0) as any,
      clearTimeoutFn: (() => undefined) as any,
      emitRealtimeHint: () => undefined,
    });

  const mainOps = createOps('main');
  const site2Ops = createOps('site2');

  assert.equal((await mainOps.pushTabsGateNow(true, 0)).ok, true);
  assert.equal(rows.has('public::tabsGate'), true);

  await site2Ops.pullTabsGateOnce(true);
  assert.equal(site2Ops.tabsGateOpenRef.value, true);
  assert.equal(site2Ops.tabsGateUntilRef.value > Date.now(), true);
});

test('cloud sync tabs gate site2 ignores local open fallback when cloud row is missing', async () => {
  const app = createBrowserApp('site2');
  const storage = createStorage({
    wp_site2_tabs_gate_open: '1',
    wp_site2_tabs_gate_until: String(Date.now() + 60_000),
  });

  const ops = createCloudSyncTabsGateOps({
    App: app as any,
    cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
    storage,
    getGateBaseRoom: () => 'private-room',
    restUrl: 'https://example.test',
    clientId: 'client-1',
    getRow: async () => null,
    upsertRow: async () => ({ ok: true, row: null }),
    setTimeoutFn: (() => 0) as any,
    clearTimeoutFn: (() => undefined) as any,
    emitRealtimeHint: () => undefined,
  });

  ops.patchSite2TabsGateUi(true, Date.now() + 60_000, 'stale');
  assert.equal(ops.tabsGateOpenRef.value, true);

  await ops.pullTabsGateOnce(true);

  assert.equal(ops.tabsGateOpenRef.value, false);
  assert.equal(ops.tabsGateUntilRef.value, 0);
  assert.equal(storage.getString('wp_site2_tabs_gate_open'), '1');
});

test('cloud sync tabs gate snapshot subscription tracks minute boundaries and expiry without store polling', () => {
  const realNow = Date.now;
  let nowMs = 1_000;
  Date.now = () => nowMs;

  const app = createBrowserApp('main');
  const storage = createStorage();
  const timers: Array<() => void> = [];

  try {
    const ops = createCloudSyncTabsGateOps({
      App: app as any,
      cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
      storage,
      getGateBaseRoom: () => 'private-room',
      restUrl: 'https://example.test',
      clientId: 'client-1',
      getRow: async () => null,
      upsertRow: async () => ({ ok: true, row: null }),
      setTimeoutFn: ((handler: () => void) => {
        timers.push(handler);
        return timers.length;
      }) as any,
      clearTimeoutFn: (() => undefined) as any,
      emitRealtimeHint: () => undefined,
    });

    const snapshots: Array<{ open: boolean; until: number; minutesLeft: number }> = [];
    const unsubscribe = ops.subscribeSnapshot(snapshot => {
      snapshots.push({ ...snapshot });
    });

    ops.patchSite2TabsGateUi(true, 120_000, 'manual');
    assert.deepEqual(ops.getSnapshot(), { open: true, until: 120_000, minutesLeft: 2 });
    assert.deepEqual(snapshots.at(-1), { open: true, until: 120_000, minutesLeft: 2 });
    assert.equal(timers.length > 0, true);

    nowMs = 61_000;
    const minuteTick = timers.at(-1);
    assert.equal(typeof minuteTick, 'function');
    minuteTick?.();
    assert.deepEqual(ops.getSnapshot(), { open: true, until: 120_000, minutesLeft: 1 });
    assert.deepEqual(snapshots.at(-1), { open: true, until: 120_000, minutesLeft: 1 });

    nowMs = 120_100;
    const expiryTick = timers[0];
    assert.equal(typeof expiryTick, 'function');
    expiryTick?.();
    assert.deepEqual(ops.getSnapshot(), { open: false, until: 120_000, minutesLeft: 0 });
    assert.deepEqual(snapshots.at(-1), { open: false, until: 120_000, minutesLeft: 0 });

    unsubscribe();
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync tabs gate direct push reports controller-only canonically on site2', async () => {
  const app = createBrowserApp('site2');
  const storage = createStorage();

  const ops = createCloudSyncTabsGateOps({
    App: app as any,
    cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
    storage,
    getGateBaseRoom: () => 'private-room',
    restUrl: 'https://example.test',
    clientId: 'client-1',
    getRow: async () => null,
    upsertRow: async () => ({ ok: true, row: null }),
    setTimeoutFn: (() => 0) as any,
    clearTimeoutFn: (() => undefined) as any,
    emitRealtimeHint: () => undefined,
  });

  assert.deepEqual(await ops.pushTabsGateNow(true, 0), {
    ok: false,
    reason: 'controller-only',
  });
});

test('cloud sync tabs gate push shares app-scoped ownership across ops instances for the same App', async () => {
  const sharedApp = createBrowserApp('main');
  const storageA = createStorage();
  const storageB = createStorage();
  let resolvePush: ((value: { ok: true; row: { updated_at: string; payload: {} } }) => void) | null = null;
  let pushOpenCalls = 0;
  let pushCloseCalls = 0;

  const createOps = (storage: StorageMapLike) =>
    createCloudSyncTabsGateOps({
      App: sharedApp as any,
      cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
      storage,
      getGateBaseRoom: () => 'private-room',
      restUrl: 'https://example.test',
      clientId: 'client-1',
      getRow: async () => null,
      upsertRow: async (_rest, _anon, room, payload) => {
        assert.equal(room, 'private-room::tabsGate');
        if (payload && (payload as any).tabsGateOpen) {
          pushOpenCalls += 1;
          return await new Promise(resolve => {
            resolvePush = resolve as typeof resolvePush;
          });
        }
        pushCloseCalls += 1;
        return { ok: true, row: { updated_at: '2026-03-16T00:00:00Z', payload: {} } as any } as any;
      },
      setTimeoutFn: (() => 0) as any,
      clearTimeoutFn: (() => undefined) as any,
      emitRealtimeHint: () => undefined,
    });

  const first = createOps(storageA);
  const second = createOps(storageB);

  const openA = first.pushTabsGateNow(true, 0);
  const openB = second.pushTabsGateNow(true, 0);
  const close = second.pushTabsGateNow(false, 0);
  await Promise.resolve();

  assert.equal(openA, openB);
  assert.equal(pushOpenCalls, 1);
  assert.equal(pushCloseCalls, 0);
  assert.deepEqual(await close, { ok: false, reason: 'busy' });

  resolvePush?.({ ok: true, row: { updated_at: '2026-03-16T00:00:00Z', payload: {} } });
  const result = await openA;
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.open, true);
});
