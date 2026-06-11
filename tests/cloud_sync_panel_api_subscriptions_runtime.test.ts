import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelApiTestRig } from './cloud_sync_panel_api_runtime_helpers.ts';

test('cloud sync panel api fans out panel and tabs-gate source subscriptions once and clones snapshots per listener', () => {
  let floatingSourceSubscribeCalls = 0;
  let floatingSourceDisposeCalls = 0;
  let floatingSourceListener: null | ((enabled: boolean) => void) = null;
  let floatingEnabled = true;

  let tabsGateSourceSubscribeCalls = 0;
  let tabsGateSourceDisposeCalls = 0;
  let tabsGateSourceListener: null | ((snapshot: Record<string, unknown>) => void) = null;
  let tabsGateSnapshot = { open: false, until: 0, minutesLeft: 0 };

  const { api } = createCloudSyncPanelApiTestRig({
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    getSite2TabsGateSnapshot: () => ({ ...tabsGateSnapshot }),
    subscribeSite2TabsGateSnapshot: (fn: (snapshot: Record<string, unknown>) => void) => {
      tabsGateSourceSubscribeCalls += 1;
      tabsGateSourceListener = fn as any;
      return () => {
        tabsGateSourceDisposeCalls += 1;
        if (tabsGateSourceListener === fn) tabsGateSourceListener = null;
      };
    },
    subscribeFloatingSketchSyncEnabledState: (fn: (enabled: boolean) => void) => {
      floatingSourceSubscribeCalls += 1;
      floatingSourceListener = fn;
      return () => {
        floatingSourceDisposeCalls += 1;
        if (floatingSourceListener === fn) floatingSourceListener = null;
      };
    },
  });

  const panelSnapshotsA: Record<string, unknown>[] = [];
  const panelSnapshotsB: Record<string, unknown>[] = [];
  const disposePanelA = api.subscribePanelSnapshot?.(snapshot => {
    const copy = { ...snapshot };
    panelSnapshotsA.push(copy);
    (snapshot as Record<string, unknown>).room = 'mutated-by-a';
  });
  const disposePanelB = api.subscribePanelSnapshot?.(snapshot => {
    panelSnapshotsB.push({ ...snapshot });
  });

  assert.equal(floatingSourceSubscribeCalls, 1);
  floatingEnabled = false;
  floatingSourceListener?.(false);
  assert.deepEqual(panelSnapshotsA.at(-1), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
    floatingSync: false,
  });
  assert.deepEqual(panelSnapshotsB.at(-1), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
    floatingSync: false,
  });

  const gateSnapshotsA: Record<string, unknown>[] = [];
  const gateSnapshotsB: Record<string, unknown>[] = [];
  const disposeGateA = api.subscribeSite2TabsGateSnapshot?.(snapshot => {
    const copy = { ...snapshot };
    gateSnapshotsA.push(copy);
    (snapshot as Record<string, unknown>).minutesLeft = 999;
  });
  const disposeGateB = api.subscribeSite2TabsGateSnapshot?.(snapshot => {
    gateSnapshotsB.push({ ...snapshot });
  });

  assert.equal(tabsGateSourceSubscribeCalls, 1);
  tabsGateSnapshot = { open: true, until: 61_000, minutesLeft: 1 };
  tabsGateSourceListener?.({ ...tabsGateSnapshot });
  assert.deepEqual(gateSnapshotsA.at(-1), { open: true, until: 61_000, minutesLeft: 1 });
  assert.deepEqual(gateSnapshotsB.at(-1), { open: true, until: 61_000, minutesLeft: 1 });

  if (typeof disposePanelA === 'function') disposePanelA();
  assert.equal(floatingSourceDisposeCalls, 0);
  if (typeof disposePanelB === 'function') disposePanelB();
  assert.equal(floatingSourceDisposeCalls, 1);

  if (typeof disposeGateA === 'function') disposeGateA();
  assert.equal(tabsGateSourceDisposeCalls, 0);
  if (typeof disposeGateB === 'function') disposeGateB();
  assert.equal(tabsGateSourceDisposeCalls, 1);
});
