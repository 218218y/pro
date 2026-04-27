import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelApi } from '../esm/native/services/cloud_sync_panel_api.ts';

test('cloud sync panel api uses injected browser seams for prompt fallback and gate timing', async () => {
  const seen = new Map<string, string>();
  const pushes: Array<{ open: boolean; until: number }> = [];
  const tabsGateOpenRef = { value: false };
  const tabsGateUntilRef = { value: 0 };
  let floatingEnabled = false;
  const runtimeStatus = {
    room: 'public',
    clientId: 'client-2',
    instanceId: 'inst-2',
    realtime: { enabled: true, mode: 'broadcast' as const, state: 'ok', channel: 'chan' },
    polling: { active: true, intervalMs: 5000, reason: 'poll' },
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  };

  const api = createCloudSyncPanelApi({
    App: {} as any,
    cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://example.test/' },
    clientId: 'client-2',
    diagEnabledRef: { value: false },
    tabsGateOpenRef,
    tabsGateUntilRef,
    isTabsGateController: true,
    site2TabsTtlMs: 60_000,
    now: () => 42_000,
    getCurrentRoom: () => 'private-x',
    getPrivateRoom: () => '',
    setPrivateRoom: () => {},
    randomRoomId: () => 'private-x',
    setRoomInUrl: () => {},
    cloneRuntimeStatus: status => ({
      ...status,
      realtime: { ...status.realtime },
      polling: { ...status.polling },
    }),
    runtimeStatus,
    updateDiagEnabled: () => {},
    publishStatus: () => {},
    diag: () => {},
    getDiagStorageMaybe: () => null,
    getClipboardMaybe: () => null,
    getPromptSinkMaybe: () => ({
      prompt: (_msg?: string, value?: string | null) => {
        seen.set('prompt', String(value || ''));
        return value || '';
      },
    }),
    reportNonFatal: () => {},
    toast: () => undefined,
    syncSketchNow: async () => ({ ok: true }),
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    setFloatingSketchSyncEnabledState: (enabled: boolean) => {
      const next = !!enabled;
      const changed = floatingEnabled !== next;
      floatingEnabled = next;
      return changed;
    },
    pushFloatingSketchSyncPinnedNow: async () => ({ ok: true }),
    subscribeFloatingSketchSyncEnabledState: () => () => {},
    deleteTemporaryModelsInCloud: async () => ({ ok: true, removed: 0 }),
    deleteTemporaryColorsInCloud: async () => ({ ok: true, removed: 0 }),
    writeSite2TabsGateLocal: (open, until) => {
      tabsGateOpenRef.value = open;
      tabsGateUntilRef.value = until;
    },
    patchSite2TabsGateUi: (open, until) => {
      tabsGateOpenRef.value = open;
      tabsGateUntilRef.value = until;
    },
    pushTabsGateNow: async (open, until) => {
      pushes.push({ open, until });
      return { ok: true };
    },
    pullTabsGateOnce: async () => {},
  });

  const goPublic = api.goPublic?.();
  assert.deepEqual(goPublic, {
    ok: true,
    changed: true,
    mode: 'public',
    room: 'public',
    shareLink: 'https://example.test/',
  });

  const copied = await api.copyShareLink?.();
  assert.deepEqual(copied, { ok: true, prompted: true, link: 'https://example.test/?room=private-x' });
  assert.equal(seen.get('prompt'), 'https://example.test/?room=private-x');

  assert.deepEqual(await api.setSite2TabsGateOpen?.(true), {
    ok: true,
    changed: true,
    open: true,
    until: 102000,
  });
  assert.equal(tabsGateOpenRef.value, true);
  assert.equal(tabsGateUntilRef.value, 102000);
  assert.deepEqual(pushes, [{ open: true, until: 102000 }]);

  assert.deepEqual(await api.setFloatingSketchSyncEnabled?.(true), {
    ok: true,
    changed: true,
    enabled: true,
  });
});
