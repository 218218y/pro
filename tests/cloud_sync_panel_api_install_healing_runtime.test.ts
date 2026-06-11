import test from 'node:test';
import assert from 'node:assert/strict';

import { installCloudSyncPanelApi } from '../esm/native/services/cloud_sync_owner_support.ts';
import { clearCloudSyncPublishedState } from '../esm/native/services/cloud_sync_install_support.ts';
import { installCloudSyncPanelApiSurface } from '../esm/native/services/cloud_sync_panel_api_install.ts';
import { getCloudSyncServiceMaybe } from '../esm/native/runtime/cloud_sync_access.ts';

type AnyRecord = Record<string, unknown>;

type InstallHarness = {
  state: {
    currentRoom: string;
    privateRoom: string;
    floatingEnabled: boolean;
    tabsGateSnapshot: { open: boolean; until: number; minutesLeft: number };
  };
  floatingSubscribers: Set<(enabled: boolean) => void>;
  tabsGateSubscribers: Set<(snapshot: AnyRecord) => void>;
};

function createInstallDeps(App: any, room: string): InstallHarness & { deps: AnyRecord } {
  const state = {
    currentRoom: room,
    privateRoom: `${room}:private`,
    floatingEnabled: true,
    tabsGateSnapshot: { open: false, until: 0, minutesLeft: 0 },
  };
  const floatingSubscribers = new Set<(enabled: boolean) => void>();
  const tabsGateSubscribers = new Set<(snapshot: AnyRecord) => void>();
  const tabsGateOpenRef = { value: state.tabsGateSnapshot.open };
  const tabsGateUntilRef = { value: state.tabsGateSnapshot.until };

  const deps: AnyRecord = {
    App,
    cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://example.test/' },
    clientId: `client:${room}`,
    diagEnabledRef: { value: false },
    tabsGateOpenRef,
    tabsGateUntilRef,
    getSite2TabsGateSnapshot: () => ({ ...state.tabsGateSnapshot }),
    subscribeSite2TabsGateSnapshot: (fn: (snapshot: AnyRecord) => void) => {
      tabsGateSubscribers.add(fn);
      return () => {
        tabsGateSubscribers.delete(fn);
      };
    },
    isTabsGateController: true,
    site2TabsTtlMs: 60000,
    now: () => 1000,
    getCurrentRoom: () => state.currentRoom,
    getPrivateRoom: () => state.privateRoom,
    setPrivateRoom: (value: string) => {
      state.privateRoom = value;
    },
    randomRoomId: () => `${room}:generated`,
    setRoomInUrl: () => undefined,
    cloneRuntimeStatus: (next: AnyRecord) => ({ ...next }),
    runtimeStatus: { diagEnabled: false, room, online: true },
    updateDiagEnabled: () => undefined,
    publishStatus: () => undefined,
    diag: () => undefined,
    getDiagStorageMaybe: () => null,
    getClipboardMaybe: () => null,
    getPromptSinkMaybe: () => null,
    reportNonFatal: () => undefined,
    toast: () => undefined,
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => state.floatingEnabled,
    setFloatingSketchSyncEnabledState: (enabled: boolean) => {
      const next = !!enabled;
      const changed = state.floatingEnabled !== next;
      state.floatingEnabled = next;
      return changed;
    },
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: (fn: (enabled: boolean) => void) => {
      floatingSubscribers.add(fn);
      return () => {
        floatingSubscribers.delete(fn);
      };
    },
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 1 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 2 }),
    writeSite2TabsGateLocal: (open: boolean, until: number) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
      state.tabsGateSnapshot = {
        open: !!open,
        until: Number(until) || 0,
        minutesLeft: open && until > 1000 ? Math.ceil((Number(until) - 1000) / 60000) : 0,
      };
      for (const subscriber of tabsGateSubscribers) subscriber({ ...state.tabsGateSnapshot });
    },
    patchSite2TabsGateUi: (open: boolean, until: number) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
      state.tabsGateSnapshot = {
        open: !!open,
        until: Number(until) || 0,
        minutesLeft: open && until > 1000 ? Math.ceil((Number(until) - 1000) / 60000) : 0,
      };
      for (const subscriber of tabsGateSubscribers) subscriber({ ...state.tabsGateSnapshot });
    },
    pushTabsGateNow: async () => ({ ok: true }),
    pullTabsGateOnce: async () => undefined,
  };

  return { deps, state, floatingSubscribers, tabsGateSubscribers };
}

test('cloud sync panel api install healing keeps canonical public surface stable and rebinds live subscriptions on reinstall', () => {
  const App = { services: Object.create(null) } as any;
  const first = createInstallDeps(App, 'room-a');
  installCloudSyncPanelApi(first.deps as any);

  const api = getCloudSyncServiceMaybe(App);
  assert.ok(api);

  const getCurrentRoomRef = api?.getCurrentRoom;
  const getPanelSnapshotRef = api?.getPanelSnapshot;
  const subscribePanelSnapshotRef = api?.subscribePanelSnapshot;
  const subscribeFloatingRef = api?.subscribeFloatingSketchSyncEnabled;
  const subscribeTabsGateRef = api?.subscribeSite2TabsGateSnapshot;

  const panelRooms: string[] = [];
  const floatingValues: boolean[] = [];
  const gateValues: Array<{ open: boolean; until: number }> = [];

  const disposePanel = api?.subscribePanelSnapshot?.(snapshot => {
    panelRooms.push(snapshot.room);
  });
  const disposeFloating = api?.subscribeFloatingSketchSyncEnabled?.(enabled => {
    floatingValues.push(!!enabled);
  });
  const disposeTabsGate = api?.subscribeSite2TabsGateSnapshot?.(snapshot => {
    gateValues.push({ open: !!snapshot.open, until: Number(snapshot.until) || 0 });
  });

  first.state.floatingEnabled = false;
  for (const subscriber of first.floatingSubscribers) subscriber(false);
  first.state.tabsGateSnapshot = { open: true, until: 61000, minutesLeft: 1 };
  for (const subscriber of first.tabsGateSubscribers) subscriber({ ...first.state.tabsGateSnapshot });

  assert.deepEqual(panelRooms, ['room-a']);
  assert.deepEqual(floatingValues, [false]);
  assert.deepEqual(gateValues, [{ open: true, until: 61000 }]);

  delete (api as any).getCurrentRoom;
  delete (api as any).getPanelSnapshot;
  delete (api as any).subscribePanelSnapshot;

  const second = createInstallDeps(App, 'room-b');
  second.state.floatingEnabled = false;
  second.state.tabsGateSnapshot = { open: true, until: 61000, minutesLeft: 1 };
  installCloudSyncPanelApi(second.deps as any);

  const healedApi = getCloudSyncServiceMaybe(App);
  assert.equal(healedApi, api, 'canonical public surface should be reused in place');
  assert.equal(healedApi?.getCurrentRoom, getCurrentRoomRef);
  assert.equal(healedApi?.getPanelSnapshot, getPanelSnapshotRef);
  assert.equal(healedApi?.subscribePanelSnapshot, subscribePanelSnapshotRef);
  assert.equal(healedApi?.subscribeFloatingSketchSyncEnabled, subscribeFloatingRef);
  assert.equal(healedApi?.subscribeSite2TabsGateSnapshot, subscribeTabsGateRef);
  assert.equal(healedApi?.getCurrentRoom?.(), 'room-b');

  first.state.floatingEnabled = true;
  for (const subscriber of first.floatingSubscribers) subscriber(true);
  first.state.tabsGateSnapshot = { open: false, until: 0, minutesLeft: 0 };
  for (const subscriber of first.tabsGateSubscribers) subscriber({ ...first.state.tabsGateSnapshot });

  assert.deepEqual(
    panelRooms,
    ['room-a'],
    'old impl events should no longer reach listeners after reinstall'
  );
  assert.deepEqual(floatingValues, [false], 'old floating sync source should be detached after reinstall');
  assert.deepEqual(gateValues, [{ open: true, until: 61000 }], 'old tabs-gate source should be detached');

  second.state.floatingEnabled = true;
  for (const subscriber of second.floatingSubscribers) subscriber(true);
  second.state.tabsGateSnapshot = { open: false, until: 0, minutesLeft: 0 };
  for (const subscriber of second.tabsGateSubscribers) subscriber({ ...second.state.tabsGateSnapshot });

  assert.deepEqual(panelRooms, ['room-a', 'room-b']);
  assert.deepEqual(floatingValues, [false, true]);
  assert.deepEqual(gateValues, [
    { open: true, until: 61000 },
    { open: false, until: 0 },
  ]);

  disposePanel?.();
  disposeFloating?.();
  disposeTabsGate?.();
  assert.equal(second.floatingSubscribers.size, 0);
  assert.equal(second.tabsGateSubscribers.size, 0);
});

test('cloud sync panel api install heals legacy installed markers that only preserved stale public callables', () => {
  const floatingSubscribers = new Set<(enabled: boolean) => void>();
  const legacyApi = {
    __wpCloudSyncPanelApiInstalled: true,
    getCurrentRoom: () => 'legacy-room',
    subscribeFloatingSketchSyncEnabled: (fn: (enabled: boolean) => void) => {
      floatingSubscribers.add(fn);
      return () => {
        floatingSubscribers.delete(fn);
      };
    },
  } as any;

  const nextFloatingSubscribers = new Set<(enabled: boolean) => void>();
  const healed = installCloudSyncPanelApiSurface(legacyApi, {
    getCurrentRoom: () => 'room-b',
    subscribeFloatingSketchSyncEnabled: (fn: (enabled: boolean) => void) => {
      nextFloatingSubscribers.add(fn);
      return () => {
        nextFloatingSubscribers.delete(fn);
      };
    },
    getPanelSnapshot: () => ({ room: 'room-b', isPublic: false, status: 'online', floatingSync: true }),
  } as any);

  assert.equal(healed, legacyApi);
  assert.equal(healed.getCurrentRoom?.(), 'room-b');
  assert.equal(typeof (healed as any).__wpCloudSyncGetCurrentRoom, 'function');
  assert.equal(
    healed.getCurrentRoom,
    (healed as any).__wpCloudSyncGetCurrentRoom,
    'healed install should recreate the canonical hidden callable instead of adopting the legacy public ref'
  );

  const values: boolean[] = [];
  const dispose = healed.subscribeFloatingSketchSyncEnabled?.(enabled => {
    values.push(!!enabled);
  });

  assert.equal(floatingSubscribers.size, 0, 'legacy subscription surface should be discarded during healing');
  assert.equal(nextFloatingSubscribers.size, 1, 'healed surface should subscribe against the current impl');

  for (const subscriber of nextFloatingSubscribers) subscriber(true);
  assert.deepEqual(values, [true]);

  dispose?.();
  assert.equal(nextFloatingSubscribers.size, 0);
});

test('cloud sync panel api install ignores stale publication epochs', () => {
  const App = { services: { cloudSync: { __publicationEpoch: 1 } } } as any;
  const first = createInstallDeps(App, 'room-a');
  first.deps.publicationEpoch = 1;
  installCloudSyncPanelApi(first.deps as any);

  const api = getCloudSyncServiceMaybe(App);
  assert.ok(api);
  assert.equal(api?.getCurrentRoom?.(), 'room-a');

  (App.services.cloudSync as AnyRecord).__publicationEpoch = 2;
  const stale = createInstallDeps(App, 'stale-room');
  stale.deps.publicationEpoch = 1;
  installCloudSyncPanelApi(stale.deps as any);

  const currentApi = getCloudSyncServiceMaybe(App);
  assert.equal(currentApi, api);
  assert.equal(currentApi?.getCurrentRoom?.(), 'room-a');
});

test('cloud sync panel api direct cleanup invalidation blocks stale panel republish from the old epoch', () => {
  const App = { services: { cloudSync: { __publicationEpoch: 1 } } } as any;
  const first = createInstallDeps(App, 'room-a');
  first.deps.publicationEpoch = 1;
  installCloudSyncPanelApi(first.deps as any);

  assert.ok(getCloudSyncServiceMaybe(App));

  clearCloudSyncPublishedState(App as any, {
    invalidatePublicationEpoch: true,
    publicationEpoch: 1,
  });

  assert.equal(getCloudSyncServiceMaybe(App), null);

  const stale = createInstallDeps(App, 'stale-room');
  stale.deps.publicationEpoch = 1;
  installCloudSyncPanelApi(stale.deps as any);

  assert.equal(getCloudSyncServiceMaybe(App), null);
  assert.equal((App.services.cloudSync as AnyRecord).__publicationEpoch, 2);
});

test('cloud sync panel api deactivation tombstones held refs and detaches live subscriptions during published-state cleanup', () => {
  const App = { services: Object.create(null) } as any;
  const first = createInstallDeps(App, 'room-a');
  installCloudSyncPanelApi(first.deps as any);

  const api = getCloudSyncServiceMaybe(App);
  assert.ok(api);

  const floatingValues: boolean[] = [];
  const gateValues: Array<{ open: boolean; until: number }> = [];

  const disposeFloating = api?.subscribeFloatingSketchSyncEnabled?.(enabled => {
    floatingValues.push(!!enabled);
  });
  const disposeTabsGate = api?.subscribeSite2TabsGateSnapshot?.(snapshot => {
    gateValues.push({ open: !!snapshot.open, until: Number(snapshot.until) || 0 });
  });

  assert.equal(first.floatingSubscribers.size, 1);
  assert.equal(first.tabsGateSubscribers.size, 1);
  assert.equal(api?.getCurrentRoom?.(), 'room-a');

  clearCloudSyncPublishedState(App as any);

  assert.equal(getCloudSyncServiceMaybe(App), null);
  assert.equal(first.floatingSubscribers.size, 0, 'cleanup should detach floating source subscriptions');
  assert.equal(first.tabsGateSubscribers.size, 0, 'cleanup should detach tabs-gate source subscriptions');
  assert.equal(api?.getCurrentRoom?.(), '', 'held refs should degrade to unavailable after cleanup');
  assert.deepEqual(api?.getPanelSnapshot?.(), {
    room: '',
    isPublic: null,
    status: 'offline',
    floatingSync: false,
  });
  assert.deepEqual(api?.getSyncRuntimeStatus?.(), {
    room: '',
    clientId: '',
    instanceId: '',
    realtime: {
      enabled: false,
      mode: 'broadcast',
      state: 'unavailable',
      channel: '',
    },
    polling: {
      active: false,
      intervalMs: 0,
      reason: 'unavailable',
    },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: 'unavailable',
    diagEnabled: false,
  });

  first.state.floatingEnabled = false;
  for (const subscriber of first.floatingSubscribers) subscriber(false);
  first.state.tabsGateSnapshot = { open: true, until: 61000, minutesLeft: 1 };
  for (const subscriber of first.tabsGateSubscribers) subscriber({ ...first.state.tabsGateSnapshot });

  assert.deepEqual(floatingValues, [], 'detached held refs should no longer receive source updates');
  assert.deepEqual(gateValues, [], 'detached held refs should no longer receive tabs-gate updates');

  disposeFloating?.();
  disposeTabsGate?.();
});

test('cloud sync panel api public surface clones runtime status and snapshot reads and isolates bridged listener mutation', () => {
  const panelSubscribers = new Set<(snapshot: AnyRecord) => void>();
  const tabsGateSubscribers = new Set<(snapshot: AnyRecord) => void>();
  const runtimeStatus = {
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    realtime: {
      enabled: true,
      mode: 'broadcast',
      state: 'subscribed',
      channel: 'wp:room-a',
      driftedExtra: 'drop-me',
    },
    polling: {
      active: true,
      intervalMs: 5000,
      reason: 'fallback',
      driftedPollingExtra: 'drop-me',
    },
    lastPullAt: 1,
    lastPushAt: 2,
    lastRealtimeEventAt: 3,
    lastError: '',
    diagEnabled: true,
    driftedRootExtra: true,
  } as AnyRecord;
  const panelSnapshot = {
    room: 'room-a',
    isPublic: false,
    status: 'online',
    floatingSync: true,
    driftedExtra: 'drop-me',
  } as AnyRecord;
  const tabsGateSnapshot = {
    open: true,
    until: 61000,
    minutesLeft: 1,
    driftedExtra: 'drop-me',
  } as AnyRecord;

  const api = installCloudSyncPanelApiSurface({}, {
    getSyncRuntimeStatus: () => runtimeStatus,
    getPanelSnapshot: () => panelSnapshot,
    subscribePanelSnapshot: (fn: (snapshot: AnyRecord) => void) => {
      panelSubscribers.add(fn);
      return () => {
        panelSubscribers.delete(fn);
      };
    },
    getSite2TabsGateSnapshot: () => tabsGateSnapshot,
    subscribeSite2TabsGateSnapshot: (fn: (snapshot: AnyRecord) => void) => {
      tabsGateSubscribers.add(fn);
      return () => {
        tabsGateSubscribers.delete(fn);
      };
    },
  } as any);

  const firstStatus = api.getSyncRuntimeStatus?.() as AnyRecord;
  firstStatus.room = 'mutated-room';
  (firstStatus.realtime as AnyRecord).state = 'mutated-state';
  (firstStatus.realtime as AnyRecord).driftedExtra = 'keep-me';
  const secondStatus = api.getSyncRuntimeStatus?.() as AnyRecord;
  assert.equal(secondStatus.room, 'room-a');
  assert.equal((secondStatus.realtime as AnyRecord).state, 'subscribed');
  assert.equal('driftedRootExtra' in secondStatus, false);
  assert.equal('driftedExtra' in (secondStatus.realtime as AnyRecord), false);
  assert.equal('driftedPollingExtra' in (secondStatus.polling as AnyRecord), false);
  assert.equal((runtimeStatus.realtime as AnyRecord).state, 'subscribed');

  const firstPanelSnapshot = api.getPanelSnapshot?.() as AnyRecord;
  firstPanelSnapshot.room = 'mutated-room';
  firstPanelSnapshot.floatingSync = false;
  const secondPanelSnapshot = api.getPanelSnapshot?.() as AnyRecord;
  assert.deepEqual(secondPanelSnapshot, {
    room: 'room-a',
    isPublic: false,
    status: 'online',
    floatingSync: true,
  });
  assert.equal(panelSnapshot.room, 'room-a');
  assert.equal(panelSnapshot.floatingSync, true);

  const firstTabsGateSnapshot = api.getSite2TabsGateSnapshot?.() as AnyRecord;
  firstTabsGateSnapshot.open = false;
  firstTabsGateSnapshot.until = 0;
  const secondTabsGateSnapshot = api.getSite2TabsGateSnapshot?.() as AnyRecord;
  assert.deepEqual(secondTabsGateSnapshot, {
    open: true,
    until: 61000,
    minutesLeft: 1,
  });
  assert.equal(tabsGateSnapshot.open, true);
  assert.equal(tabsGateSnapshot.until, 61000);

  let secondPanelListenerSnapshot: AnyRecord | null = null;
  const disposeFirstPanel = api.subscribePanelSnapshot?.((snapshot: AnyRecord) => {
    snapshot.room = 'listener-mutated';
    snapshot.status = 'listener-mutated';
  });
  const disposeSecondPanel = api.subscribePanelSnapshot?.((snapshot: AnyRecord) => {
    secondPanelListenerSnapshot = { ...snapshot };
  });

  for (const subscriber of panelSubscribers) subscriber(panelSnapshot);
  assert.deepEqual(secondPanelListenerSnapshot, {
    room: 'room-a',
    isPublic: false,
    status: 'online',
    floatingSync: true,
  });
  assert.equal(panelSnapshot.room, 'room-a');
  assert.equal(panelSnapshot.status, 'online');

  let secondTabsGateListenerSnapshot: AnyRecord | null = null;
  const disposeFirstTabsGate = api.subscribeSite2TabsGateSnapshot?.((snapshot: AnyRecord) => {
    snapshot.open = false;
    snapshot.until = 0;
  });
  const disposeSecondTabsGate = api.subscribeSite2TabsGateSnapshot?.((snapshot: AnyRecord) => {
    secondTabsGateListenerSnapshot = { ...snapshot };
  });

  for (const subscriber of tabsGateSubscribers) subscriber(tabsGateSnapshot);
  assert.deepEqual(secondTabsGateListenerSnapshot, {
    open: true,
    until: 61000,
    minutesLeft: 1,
  });
  assert.equal(tabsGateSnapshot.open, true);
  assert.equal(tabsGateSnapshot.until, 61000);

  disposeFirstPanel?.();
  disposeSecondPanel?.();
  disposeFirstTabsGate?.();
  disposeSecondTabsGate?.();
});

test('cloud sync panel api mutation refs fall back to typed not-installed results when the impl does not expose mutation methods', async () => {
  const api = installCloudSyncPanelApiSurface({}, {} as any);

  assert.deepEqual(api.goPublic?.(), { ok: false, mode: 'public', reason: 'not-installed' });
  assert.deepEqual(api.goPrivate?.(), { ok: false, mode: 'private', reason: 'not-installed' });
  assert.deepEqual(await api.syncSketchNow?.(), { ok: false, reason: 'not-installed' });
  assert.deepEqual(await api.setFloatingSketchSyncEnabled?.(true), { ok: false, reason: 'not-installed' });
  assert.deepEqual(await api.toggleFloatingSketchSyncEnabled?.(), { ok: false, reason: 'not-installed' });
  assert.deepEqual(await api.deleteTemporaryModels?.(), { ok: false, removed: 0, reason: 'not-installed' });
  assert.deepEqual(await api.deleteTemporaryColors?.(), { ok: false, removed: 0, reason: 'not-installed' });
  assert.deepEqual(await api.setSite2TabsGateOpen?.(true), { ok: false, reason: 'not-installed' });
  assert.deepEqual(await api.toggleSite2TabsGateOpen?.(), { ok: false, reason: 'not-installed' });
  assert.deepEqual(await api.copyShareLink?.(), { ok: false, reason: 'unavailable' });
});
