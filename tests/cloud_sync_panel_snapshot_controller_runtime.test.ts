import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelSnapshotController } from '../esm/native/services/cloud_sync_panel_api_snapshots.ts';

test('cloud sync panel snapshot controller isolates panel listener failures and reports source-dispose errors', () => {
  const reported: string[] = [];
  let floatingEnabled = true;
  let sourceListener: null | (() => void) = null;
  let disposeCalls = 0;

  const controller = createCloudSyncPanelSnapshotController({
    App: {} as any,
    cfg: { publicRoom: 'public' } as any,
    tabsGateOpenRef: { value: false },
    tabsGateUntilRef: { value: 0 },
    getSite2TabsGateSnapshot: () => ({ open: false, until: 0, minutesLeft: 0 }) as any,
    now: () => 1_000,
    getCurrentRoom: () => 'public',
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    subscribeFloatingSketchSyncEnabledState: fn => {
      sourceListener = () => fn(false);
      return () => {
        disposeCalls += 1;
        throw new Error('panel source dispose exploded');
      };
    },
    reportNonFatal: (_app, op) => {
      reported.push(String(op || ''));
    },
  } as any);

  const healthySnapshots: Array<{ room: string; floatingSync: boolean }> = [];
  const disposeThrowing = controller.subscribePanelSnapshot(() => {
    throw new Error('listener exploded');
  });
  const disposeHealthy = controller.subscribePanelSnapshot(snapshot => {
    healthySnapshots.push({ room: snapshot.room, floatingSync: !!snapshot.floatingSync });
  });

  floatingEnabled = false;
  sourceListener?.();

  assert.deepEqual(healthySnapshots, [{ room: 'public', floatingSync: false }]);
  assert.ok(reported.includes('services/cloud_sync.panelApi.panelSnapshotListener'));

  disposeThrowing();
  disposeHealthy();

  assert.equal(disposeCalls, 1);
  assert.ok(reported.includes('services/cloud_sync.panelApi.panelSnapshotSourceDispose'));
});

test('cloud sync panel snapshot controller isolates tabs-gate listener failures and reports source-dispose errors', () => {
  const reported: string[] = [];
  let sourceListener: null | (() => void) = null;
  let disposeCalls = 0;
  let snapshot = { open: false, until: 0, minutesLeft: 0 };

  const controller = createCloudSyncPanelSnapshotController({
    App: {} as any,
    cfg: { publicRoom: 'public' } as any,
    tabsGateOpenRef: { value: false },
    tabsGateUntilRef: { value: 0 },
    getSite2TabsGateSnapshot: () => ({ ...snapshot }) as any,
    subscribeSite2TabsGateSnapshot: fn => {
      sourceListener = () => fn({ ...snapshot } as any);
      return () => {
        disposeCalls += 1;
        throw new Error('tabs source dispose exploded');
      };
    },
    now: () => 1_000,
    getCurrentRoom: () => 'public',
    getFloatingSketchSyncEnabled: () => false,
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    reportNonFatal: (_app, op) => {
      reported.push(String(op || ''));
    },
  } as any);

  const healthySnapshots: Array<{ open: boolean; until: number; minutesLeft: number }> = [];
  const disposeThrowing = controller.subscribeSite2TabsGateSnapshot(() => {
    throw new Error('tabs listener exploded');
  });
  const disposeHealthy = controller.subscribeSite2TabsGateSnapshot(next => {
    healthySnapshots.push({ ...next });
  });

  snapshot = { open: true, until: 61_000, minutesLeft: 1 };
  sourceListener?.();

  assert.deepEqual(healthySnapshots, [{ open: true, until: 61_000, minutesLeft: 1 }]);
  assert.ok(reported.includes('services/cloud_sync.panelApi.tabsGateSnapshotListener'));

  disposeThrowing();
  disposeHealthy();

  assert.equal(disposeCalls, 1);
  assert.ok(reported.includes('services/cloud_sync.panelApi.tabsGateSnapshotSourceDispose'));
});
