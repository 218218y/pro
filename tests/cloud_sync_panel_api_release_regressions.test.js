import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const distModuleUrl = pathToFileURL(
  path.join(repoRoot, 'dist/esm/native/services/cloud_sync_panel_api.js')
).href;

const { createCloudSyncPanelApi } = await import(distModuleUrl);

test('cloud sync panel api shares upstream subscriptions and clones published snapshots per listener', () => {
  let floatingEnabled = true;
  let floatingSourceSubscribeCalls = 0;
  let floatingSourceDisposeCalls = 0;
  let floatingSourceListener = null;

  let tabsGateSourceSubscribeCalls = 0;
  let tabsGateSourceDisposeCalls = 0;
  let tabsGateSourceListener = null;
  let tabsGateSnapshot = { open: false, until: 0, minutesLeft: 0 };

  const api = createCloudSyncPanelApi({
    App: {},
    cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://example.test/' },
    clientId: 'client-1',
    diagEnabledRef: { value: false },
    tabsGateOpenRef: { value: false },
    tabsGateUntilRef: { value: 0 },
    isTabsGateController: true,
    site2TabsTtlMs: 60_000,
    now: () => 1000,
    getSite2TabsGateSnapshot: () => ({ ...tabsGateSnapshot }),
    subscribeSite2TabsGateSnapshot: fn => {
      tabsGateSourceSubscribeCalls += 1;
      tabsGateSourceListener = fn;
      return () => {
        tabsGateSourceDisposeCalls += 1;
        if (tabsGateSourceListener === fn) tabsGateSourceListener = null;
      };
    },
    getCurrentRoom: () => 'public',
    getPrivateRoom: () => '',
    setPrivateRoom: () => {},
    randomRoomId: () => 'generated-room',
    setRoomInUrl: () => {},
    cloneRuntimeStatus: next => ({ ...next }),
    runtimeStatus: { diagEnabled: false },
    updateDiagEnabled: () => {},
    publishStatus: () => {},
    diag: () => {},
    getDiagStorageMaybe: () => null,
    getClipboardMaybe: () => null,
    getPromptSinkMaybe: () => null,
    reportNonFatal: () => {},
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    setFloatingSketchSyncEnabledState: enabled => {
      floatingEnabled = !!enabled;
      return true;
    },
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: fn => {
      floatingSourceSubscribeCalls += 1;
      floatingSourceListener = fn;
      return () => {
        floatingSourceDisposeCalls += 1;
        if (floatingSourceListener === fn) floatingSourceListener = null;
      };
    },
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 0 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 0 }),
    writeSite2TabsGateLocal: () => {},
    patchSite2TabsGateUi: () => {},
    pushTabsGateNow: async () => ({ ok: true }),
    pullTabsGateOnce: async () => {},
  });

  const panelSnapshotsA = [];
  const panelSnapshotsB = [];
  const disposePanelA = api.subscribePanelSnapshot(snapshot => {
    panelSnapshotsA.push({ ...snapshot });
    snapshot.room = 'mutated-by-a';
  });
  const disposePanelB = api.subscribePanelSnapshot(snapshot => {
    panelSnapshotsB.push({ ...snapshot });
  });

  assert.equal(floatingSourceSubscribeCalls, 1);
  floatingEnabled = false;
  floatingSourceListener(false);
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

  const gateSnapshotsA = [];
  const gateSnapshotsB = [];
  const disposeGateA = api.subscribeSite2TabsGateSnapshot(snapshot => {
    gateSnapshotsA.push({ ...snapshot });
    snapshot.minutesLeft = 999;
  });
  const disposeGateB = api.subscribeSite2TabsGateSnapshot(snapshot => {
    gateSnapshotsB.push({ ...snapshot });
  });

  assert.equal(tabsGateSourceSubscribeCalls, 1);
  tabsGateSnapshot = { open: true, until: 61_000, minutesLeft: 1 };
  tabsGateSourceListener({ ...tabsGateSnapshot });
  assert.deepEqual(gateSnapshotsA.at(-1), { open: true, until: 61_000, minutesLeft: 1 });
  assert.deepEqual(gateSnapshotsB.at(-1), { open: true, until: 61_000, minutesLeft: 1 });

  disposePanelA();
  assert.equal(floatingSourceDisposeCalls, 0);
  disposePanelB();
  assert.equal(floatingSourceDisposeCalls, 1);

  disposeGateA();
  assert.equal(tabsGateSourceDisposeCalls, 0);
  disposeGateB();
  assert.equal(tabsGateSourceDisposeCalls, 1);
});
