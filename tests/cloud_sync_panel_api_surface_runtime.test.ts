import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelApi } from '../esm/native/services/cloud_sync_panel_api.ts';
import { createCloudSyncPanelApiTestRig } from './cloud_sync_panel_api_runtime_helpers.ts';
import { cloneRuntimeStatus } from '../esm/native/services/cloud_sync_support_shared.ts';

test('cloud sync panel api exposes stable room/share/tabs-gate runtime surface and publishes panel snapshots', async () => {
  const rig = createCloudSyncPanelApiTestRig();
  const { api, pushed, patched, storage, status, state, refs, sinks } = rig;

  assert.equal(api.getCurrentRoom?.(), 'public');
  assert.equal(api.getPublicRoom?.(), 'public');
  assert.equal(api.getRoomParam?.(), 'room');
  assert.equal(api.getShareLink?.(), 'https://example.test/');
  assert.deepEqual(api.getPanelSnapshot?.(), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
    floatingSync: true,
  });

  const snapshots: Record<string, unknown>[] = [];
  const tabsGateSnapshots: Record<string, unknown>[] = [];
  const unsubscribe = api.subscribePanelSnapshot?.(snapshot => {
    snapshots.push({ ...snapshot });
  });
  const unsubscribeTabsGate = api.subscribeSite2TabsGateSnapshot?.(snapshot => {
    tabsGateSnapshots.push({ ...snapshot });
  });

  sinks.emitFloating(false);
  assert.deepEqual(snapshots.at(-1), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
    floatingSync: false,
  });

  const statusClone = api.getSyncRuntimeStatus?.();
  assert.equal(statusClone?.diagEnabled, true);
  assert.equal(status.diagEnabled, true);

  assert.deepEqual(api.getSite2TabsGateSnapshot?.(), { open: false, until: 0, minutesLeft: 0 });

  assert.deepEqual(await api.setSite2TabsGateOpen?.(true), {
    ok: true,
    changed: true,
    open: true,
    until: 61000,
  });
  assert.equal(api.getSite2TabsGateOpen?.(), true);
  assert.equal(refs.tabsGateOpenRef.value, true);
  assert.deepEqual(api.getSite2TabsGateSnapshot?.(), { open: true, until: 61000, minutesLeft: 1 });
  assert.deepEqual(tabsGateSnapshots.at(-1), { open: true, until: 61000, minutesLeft: 1 });
  assert.equal(patched.length >= 2, true);
  assert.equal(pushed.length, 1);

  assert.deepEqual(await api.setFloatingSketchSyncEnabled?.(false), {
    ok: true,
    changed: false,
    enabled: false,
  });
  assert.deepEqual(await api.toggleFloatingSketchSyncEnabled?.(), { ok: true, changed: true, enabled: true });
  assert.equal(state.floatingEnabled, true);
  assert.deepEqual(api.getPanelSnapshot?.(), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
    floatingSync: true,
  });

  assert.deepEqual(await api.toggleSite2TabsGateOpen?.(), { ok: true, changed: true, open: false, until: 0 });
  assert.equal(pushed.length, 2);
  assert.deepEqual(tabsGateSnapshots.at(-1), { open: false, until: 0, minutesLeft: 0 });

  const goPrivate = api.goPrivate?.();
  state.currentRoom = String(goPrivate?.room || state.currentRoom);
  assert.deepEqual(goPrivate, {
    ok: true,
    changed: true,
    mode: 'private',
    room: 'generated-room',
    shareLink: 'https://example.test/?room=generated-room',
  });
  assert.deepEqual(snapshots.at(-1), {
    room: 'generated-room',
    isPublic: false,
    status: 'מצב: חדר פרטי (generated-room)',
    floatingSync: true,
  });

  const copied = await api.copyShareLink?.();
  assert.deepEqual(copied, { ok: true, copied: true, link: 'https://example.test/?room=generated-room' });
  assert.equal(storage.get('clipboard'), 'https://example.test/?room=generated-room');

  if (typeof unsubscribe === 'function') unsubscribe();
  if (typeof unsubscribeTabsGate === 'function') unsubscribeTabsGate();
});

test('cloud sync panel api runtime status clone strips drifted realtime/polling extras', async () => {
  const rig = createCloudSyncPanelApiTestRig({ cloneRuntimeStatus });
  const { api, status } = rig;

  status.realtime = {
    enabled: true,
    mode: 'broadcast',
    state: 'subscribed',
    channel: 'wp:public',
    driftedExtra: 'leak',
  } as any;
  status.polling = { active: false, intervalMs: 5000, reason: '', debugOnly: 123 } as any;

  const clone = api.getSyncRuntimeStatus?.() as any;
  assert.equal(clone?.realtime?.driftedExtra, undefined);
  assert.equal(clone?.polling?.debugOnly, undefined);
  assert.deepEqual(clone?.realtime, {
    enabled: !!status.realtime.enabled,
    mode: 'broadcast',
    state: String(status.realtime.state || ''),
    channel: String(status.realtime.channel || ''),
  });
  assert.deepEqual(clone?.polling, {
    active: !!status.polling.active,
    intervalMs: Number(status.polling.intervalMs) || 0,
    reason: String(status.polling.reason || ''),
  });
});

test('cloud sync panel api runtime-status getter republishes only when diagnostics state actually changes', () => {
  const runtimeStatus = { diagEnabled: false, room: 'public', online: true } as any;
  let publishCount = 0;
  let nextDiagEnabled = false;

  const rig = createCloudSyncPanelApiTestRig({
    runtimeStatus,
    publishStatus: () => {
      publishCount += 1;
    },
    updateDiagEnabled: () => {
      runtimeStatus.diagEnabled = nextDiagEnabled;
    },
  });

  assert.equal(rig.api.getSyncRuntimeStatus?.()?.diagEnabled, false);
  assert.equal(publishCount, 0, 'a stable diagnostics flag should not republish on read');

  nextDiagEnabled = true;
  assert.equal(rig.api.getSyncRuntimeStatus?.()?.diagEnabled, true);
  assert.equal(publishCount, 1, 'a real diagnostics change should republish once');

  assert.equal(rig.api.getSyncRuntimeStatus?.()?.diagEnabled, true);
  assert.equal(publishCount, 1, 're-reading the same diagnostics state should stay quiet');
});

test('cloud sync panel api diagnostics setter stays no-op when the stored diagnostics value is unchanged', async () => {
  let storedDiagValue = '0';
  let publishCount = 0;
  const diagEvents: string[] = [];
  const runtimeStatus = { diagEnabled: false, room: 'public', online: true } as any;

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
    randomRoomId: () => 'generated-room',
    setRoomInUrl: () => {},
    cloneRuntimeStatus: status => ({ ...status }) as any,
    runtimeStatus,
    updateDiagEnabled: () => {
      runtimeStatus.diagEnabled = storedDiagValue === '1';
    },
    publishStatus: () => {
      publishCount += 1;
    },
    diag: event => {
      diagEvents.push(String(event || ''));
    },
    getDiagStorageMaybe: () =>
      ({
        setItem: (_key: string, value: string) => {
          storedDiagValue = String(value || '');
        },
      }) as any,
    getClipboardMaybe: () => null,
    getPromptSinkMaybe: () => null,
    reportNonFatal: () => {},
    toast: () => undefined,
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => true,
    setFloatingSketchSyncEnabledState: () => false,
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 0 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 0 }),
    writeSite2TabsGateLocal: () => {},
    patchSite2TabsGateUi: () => {},
    pushTabsGateNow: async () => ({ ok: true }),
    pullTabsGateOnce: async () => {},
  });

  api.setDiagnosticsEnabled?.(false);
  assert.equal(runtimeStatus.diagEnabled, false);
  assert.equal(publishCount, 0, 'same-value diagnostics writes should not republish status');
  assert.deepEqual(diagEvents, []);

  api.setDiagnosticsEnabled?.(true);
  assert.equal(runtimeStatus.diagEnabled, true);
  assert.equal(publishCount, 1, 'a real diagnostics toggle should publish once');
  assert.deepEqual(diagEvents, ['diagnostics']);

  api.setDiagnosticsEnabled?.(true);
  assert.equal(publishCount, 1, 'repeating the same diagnostics toggle should stay quiet');
  assert.deepEqual(diagEvents, ['diagnostics']);
});
