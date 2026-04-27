import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelSnapshotController } from '../esm/native/services/cloud_sync_panel_api_snapshots.ts';

test('cloud sync panel snapshot controller suppresses duplicate panel publishes from source and command paths', () => {
  let floatingEnabled = true;
  let sourceListener: null | (() => void) = null;
  let readCount = 0;

  const controller = createCloudSyncPanelSnapshotController({
    App: {} as any,
    cfg: { publicRoom: 'public' } as any,
    tabsGateOpenRef: { value: false },
    tabsGateUntilRef: { value: 0 },
    getSite2TabsGateSnapshot: () => ({ open: false, until: 0, minutesLeft: 0 }) as any,
    now: () => 1_000,
    getCurrentRoom: () => {
      readCount += 1;
      return 'public';
    },
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    subscribeFloatingSketchSyncEnabledState: fn => {
      sourceListener = () => fn(floatingEnabled);
      return () => {};
    },
    reportNonFatal: () => undefined,
  } as any);

  const snapshots: Array<{ room: string; floatingSync: boolean }> = [];
  const dispose = controller.subscribePanelSnapshot(snapshot => {
    snapshots.push({ room: snapshot.room, floatingSync: !!snapshot.floatingSync });
  });

  controller.publishPanelSnapshot();
  sourceListener?.();
  assert.deepEqual(snapshots, []);

  floatingEnabled = false;
  sourceListener?.();
  assert.deepEqual(snapshots, [{ room: 'public', floatingSync: false }]);

  controller.publishPanelSnapshot();
  assert.deepEqual(snapshots, [{ room: 'public', floatingSync: false }]);
  assert.equal(
    readCount >= 4,
    true,
    'publishes should still refresh reads even when listener fanout is suppressed'
  );

  dispose();
});

test('cloud sync panel snapshot controller suppresses duplicate tabs-gate publishes and avoids fallback timer churn for unchanged snapshots', () => {
  let now = 1_000;
  let nextId = 1;
  const timers = new Map<number, { cb: () => void; ms: number; active: boolean }>();
  const cleared: number[] = [];
  let snapshot = { open: true, until: 121_000, minutesLeft: 2 };

  const controller = createCloudSyncPanelSnapshotController({
    App: {} as any,
    cfg: { publicRoom: 'public' } as any,
    tabsGateOpenRef: { value: true },
    tabsGateUntilRef: { value: 121_000 },
    getSite2TabsGateSnapshot: () => ({ ...snapshot }) as any,
    now: () => now,
    getCurrentRoom: () => 'public',
    getFloatingSketchSyncEnabled: () => false,
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    reportNonFatal: () => undefined,
    setTimeoutFn: (cb, ms) => {
      const id = nextId++;
      timers.set(id, { cb, ms: Number(ms) || 0, active: true });
      return id as any;
    },
    clearTimeoutFn: id => {
      const key = Number(id);
      const timer = timers.get(key);
      if (timer) timer.active = false;
      cleared.push(key);
    },
  } as any);

  const snapshots: Array<{ open: boolean; until: number; minutesLeft: number }> = [];
  const dispose = controller.subscribeSite2TabsGateSnapshot(next => {
    snapshots.push({ ...next });
  });

  assert.equal([...timers.values()].filter(timer => timer.active).length, 1);
  controller.publishSite2TabsGateSnapshot();
  assert.deepEqual(snapshots, []);
  assert.equal([...timers.values()].filter(timer => timer.active).length, 1);
  assert.deepEqual(cleared, [], 'same snapshot should not clear and recreate fallback timer');

  now = 61_010;
  snapshot = { open: true, until: 121_000, minutesLeft: 1 };
  const activeTimer = [...timers.values()].find(timer => timer.active);
  activeTimer?.cb();
  assert.deepEqual(snapshots, [{ open: true, until: 121_000, minutesLeft: 1 }]);

  controller.publishSite2TabsGateSnapshot();
  assert.deepEqual(snapshots, [{ open: true, until: 121_000, minutesLeft: 1 }]);

  snapshot = { open: false, until: 0, minutesLeft: 0 };
  controller.publishSite2TabsGateSnapshot();
  assert.deepEqual(snapshots.at(-1), { open: false, until: 0, minutesLeft: 0 });

  dispose();
});

test('cloud sync panel snapshot controller does not create fallback timer until a tabs-gate subscriber exists', () => {
  let nextId = 1;
  const timers = new Map<number, { ms: number; active: boolean }>();

  const controller = createCloudSyncPanelSnapshotController({
    App: {} as any,
    cfg: { publicRoom: 'public' } as any,
    tabsGateOpenRef: { value: true },
    tabsGateUntilRef: { value: 121_000 },
    getSite2TabsGateSnapshot: () => ({ open: true, until: 121_000, minutesLeft: 2 }) as any,
    now: () => 1_000,
    getCurrentRoom: () => 'public',
    getFloatingSketchSyncEnabled: () => false,
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    reportNonFatal: () => undefined,
    setTimeoutFn: (_cb, ms) => {
      const id = nextId++;
      timers.set(id, { ms: Number(ms) || 0, active: true });
      return id as any;
    },
    clearTimeoutFn: id => {
      const timer = timers.get(Number(id));
      if (timer) timer.active = false;
    },
  } as any);

  controller.publishSite2TabsGateSnapshot();
  assert.equal(
    [...timers.values()].some(timer => timer.active),
    false
  );

  const dispose = controller.subscribeSite2TabsGateSnapshot(() => undefined);
  assert.equal(
    [...timers.values()].some(timer => timer.active),
    true
  );
  dispose();
  assert.equal(
    [...timers.values()].some(timer => timer.active),
    false
  );
});
