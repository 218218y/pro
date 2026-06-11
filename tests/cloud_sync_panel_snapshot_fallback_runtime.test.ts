import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelSnapshotController } from '../esm/native/services/cloud_sync_panel_api_snapshots.ts';

test('cloud sync panel snapshot controller falls back to timer-driven tabs-gate minute updates when no source subscription exists', () => {
  let now = 1_000;
  let nextId = 1;
  const timers = new Map<number, { cb: () => void; ms: number; active: boolean }>();
  const cleared: number[] = [];
  const reported: string[] = [];
  const tabsGateOpenRef = { value: true };
  const tabsGateUntilRef = { value: 121_000 };

  const controller = createCloudSyncPanelSnapshotController({
    App: {} as any,
    cfg: { publicRoom: 'public' } as any,
    tabsGateOpenRef,
    tabsGateUntilRef,
    getSite2TabsGateSnapshot: () => {
      throw new Error('no upstream snapshot');
    },
    now: () => now,
    getCurrentRoom: () => 'public',
    getFloatingSketchSyncEnabled: () => false,
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    reportNonFatal: (_app, op) => {
      reported.push(String(op || ''));
    },
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
  const dispose = controller.subscribeSite2TabsGateSnapshot(snapshot => {
    snapshots.push({ ...snapshot });
  });

  assert.equal(reported.includes('services/cloud_sync.panelApi.tabsGateSnapshot'), true);
  const firstTimer = [...timers.entries()].find(([, timer]) => timer.active);
  assert.ok(firstTimer, 'expected fallback timer to be scheduled');
  assert.equal(firstTimer?.[1].ms, 60_050);

  now = 61_010;
  if (firstTimer) firstTimer[1].active = false;
  firstTimer?.[1].cb();

  assert.deepEqual(snapshots, [{ open: true, until: 121_000, minutesLeft: 1 }]);

  dispose();
  assert.equal(cleared.length >= 1, true);
  assert.equal(
    [...timers.values()].some(timer => timer.active),
    false
  );
});
