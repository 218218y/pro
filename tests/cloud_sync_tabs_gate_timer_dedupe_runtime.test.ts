import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncTabsGateOps } from '../esm/native/services/cloud_sync_tabs_gate.ts';

type TimerRec = { id: number; ms: number; cb: () => void; active: boolean };

function createBrowserApp() {
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
    location: { search: '', pathname: '/index_pro.html' },
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
        return { config: { siteVariant: 'main' }, ui: {} };
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
  } as any;
}

test('cloud sync tabs gate reuses snapshot/expiry timers and suppresses duplicate snapshot fanout for unchanged state', () => {
  const realNow = Date.now;
  let nowMs = 1_000;
  Date.now = () => nowMs;

  const timers = new Map<number, TimerRec>();
  let nextTimerId = 0;
  let setCount = 0;
  let clearCount = 0;

  try {
    const ops = createCloudSyncTabsGateOps({
      App: createBrowserApp(),
      cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
      storage: {},
      getGateBaseRoom: () => 'private-room',
      restUrl: 'https://example.test',
      clientId: 'client-1',
      getRow: async () => null,
      upsertRow: async () => ({ ok: true, row: null }) as any,
      setTimeoutFn: ((cb: () => void, ms: number) => {
        const id = ++nextTimerId;
        setCount += 1;
        timers.set(id, { id, ms: Number(ms) || 0, cb, active: true });
        return id;
      }) as any,
      clearTimeoutFn: ((id: number) => {
        const rec = timers.get(Number(id));
        if (!rec || !rec.active) return;
        clearCount += 1;
        rec.active = false;
      }) as any,
      emitRealtimeHint: () => undefined,
    });

    const snapshots: Array<{ open: boolean; until: number; minutesLeft: number }> = [];
    const unsubscribe = ops.subscribeSnapshot(snapshot => {
      snapshots.push({ ...snapshot });
    });

    ops.patchSite2TabsGateUi(true, 121_000, 'manual');
    assert.deepEqual(snapshots.at(-1), { open: true, until: 121_000, minutesLeft: 2 });
    assert.equal(setCount, 2, 'opening should create one expiry timer and one snapshot minute timer');
    assert.equal(clearCount, 0);

    nowMs = 1_500;
    ops.patchSite2TabsGateUi(true, 121_000, 'manual');
    assert.equal(snapshots.length, 2, 'unchanged state should not fan out a duplicate snapshot');
    assert.equal(setCount, 2, 'unchanged state should reuse existing timers');
    assert.equal(clearCount, 0, 'unchanged state should not churn timeout handles');

    nowMs = 2_000;
    ops.patchSite2TabsGateUi(true, 181_000, 'manual');
    assert.deepEqual(snapshots.at(-1), { open: true, until: 181_000, minutesLeft: 3 });
    assert.equal(
      setCount,
      3,
      'changed until should only rearm the timer whose absolute due time actually moved'
    );
    assert.equal(
      clearCount,
      1,
      'changed until should preserve the shared minute-boundary snapshot timer when it already matches'
    );

    unsubscribe();
  } finally {
    Date.now = realNow;
  }
});
