import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelApi } from '../esm/native/services/cloud_sync_panel_api.ts';

test('cloud sync panel api republishes panel snapshot even when floating pin command throws', async () => {
  const panelSnapshots: Array<{ room: string; floatingSync: boolean }> = [];
  const reported: string[] = [];
  let floatingEnabled = false;

  const api = createCloudSyncPanelApi({
    App: {} as any,
    cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://example.test/' },
    clientId: 'client-1',
    diagEnabledRef: { value: false },
    tabsGateOpenRef: { value: false },
    tabsGateUntilRef: { value: 0 },
    isTabsGateController: true,
    site2TabsTtlMs: 60_000,
    now: () => 1_000,
    getSite2TabsGateSnapshot: () => ({ open: false, until: 0, minutesLeft: 0 }) as any,
    subscribeSite2TabsGateSnapshot: () => () => {},
    getCurrentRoom: () => 'public',
    getPrivateRoom: () => '',
    setPrivateRoom: () => {},
    randomRoomId: () => 'private-room',
    setRoomInUrl: () => {},
    cloneRuntimeStatus: status => ({ ...status }) as any,
    runtimeStatus: { diagEnabled: false } as any,
    updateDiagEnabled: () => {},
    publishStatus: () => {},
    diag: () => {},
    getDiagStorageMaybe: () => null,
    getClipboardMaybe: () => null,
    getPromptSinkMaybe: () => null,
    reportNonFatal: (_app, op) => {
      reported.push(String(op || ''));
    },
    toast: () => undefined,
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    setFloatingSketchSyncEnabledState: () => {
      throw new Error('pin exploded');
    },
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 0 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 0 }),
    writeSite2TabsGateLocal: () => {},
    patchSite2TabsGateUi: () => {},
    pushTabsGateNow: async () => ({ ok: true }),
    pullTabsGateOnce: async () => {},
  });

  const dispose = api.subscribePanelSnapshot?.(snapshot => {
    panelSnapshots.push({ room: snapshot.room, floatingSync: !!snapshot.floatingSync });
  });

  const result = await api.setFloatingSketchSyncEnabled?.(true);
  dispose?.();

  assert.deepEqual(result, {
    ok: false,
    reason: 'error',
    message: 'pin exploded',
  });
  assert.deepEqual(panelSnapshots, [{ room: 'public', floatingSync: false }]);
  assert.ok(reported.includes('services/cloud_sync.panelApi.setFloatingSketchSyncEnabled'));
});

test('cloud sync panel api republishes tabs-gate snapshot with local optimistic state when command throws', async () => {
  const tabsGateSnapshots: Array<{ open: boolean; until: number; minutesLeft: number }> = [];
  const reported: string[] = [];
  const tabsGateOpenRef = { value: false };
  const tabsGateUntilRef = { value: 0 };

  const api = createCloudSyncPanelApi({
    App: {} as any,
    cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://example.test/' },
    clientId: 'client-1',
    diagEnabledRef: { value: false },
    tabsGateOpenRef,
    tabsGateUntilRef,
    isTabsGateController: true,
    site2TabsTtlMs: 60_000,
    now: () => 1_000,
    getSite2TabsGateSnapshot: () =>
      ({
        open: !!tabsGateOpenRef.value,
        until: Number(tabsGateUntilRef.value) || 0,
        minutesLeft: tabsGateOpenRef.value ? 1 : 0,
      }) as any,
    subscribeSite2TabsGateSnapshot: () => () => {},
    getCurrentRoom: () => 'public',
    getPrivateRoom: () => '',
    setPrivateRoom: () => {},
    randomRoomId: () => 'private-room',
    setRoomInUrl: () => {},
    cloneRuntimeStatus: status => ({ ...status }) as any,
    runtimeStatus: { diagEnabled: false } as any,
    updateDiagEnabled: () => {},
    publishStatus: () => {},
    diag: () => {},
    getDiagStorageMaybe: () => null,
    getClipboardMaybe: () => null,
    getPromptSinkMaybe: () => null,
    reportNonFatal: (_app, op) => {
      reported.push(String(op || ''));
    },
    toast: () => undefined,
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => false,
    setFloatingSketchSyncEnabledState: () => true,
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 0 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 0 }),
    writeSite2TabsGateLocal: (open, until) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
    },
    patchSite2TabsGateUi: (open, until) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
    },
    pushTabsGateNow: async () => {
      throw new Error('gate exploded');
    },
    pullTabsGateOnce: async () => {},
  });

  const dispose = api.subscribeSite2TabsGateSnapshot?.(snapshot => {
    tabsGateSnapshots.push({ ...snapshot });
  });

  const result = await api.setSite2TabsGateOpen?.(true);
  dispose?.();

  assert.deepEqual(result, {
    ok: false,
    reason: 'error',
    message: 'gate exploded',
  });
  assert.deepEqual(tabsGateSnapshots, [{ open: true, until: 61_000, minutesLeft: 1 }]);
  assert.ok(reported.includes('services/cloud_sync.panelApi.setSite2TabsGateOpen'));
});
