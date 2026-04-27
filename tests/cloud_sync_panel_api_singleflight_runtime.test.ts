import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPanelApiTestRig } from './cloud_sync_panel_api_runtime_helpers.ts';

test('cloud sync panel api single-flights duplicate inflight async commands and returns busy for conflicting family targets', async () => {
  let resolveSync: ((value: { ok: true }) => void) | null = null;
  let resolveDeleteModels: ((value: { ok: true; removed: number }) => void) | null = null;
  let resolveSetFloatingTrue: ((value: { ok: true }) => void) | null = null;
  let resolveSetGateTrue: ((value: { ok: true }) => void) | null = null;

  let syncCalls = 0;
  let deleteModelsCalls = 0;
  let deleteColorsCalls = 0;
  let setFloatingCallsTrue = 0;
  let setFloatingCallsFalse = 0;
  let setGateCallsTrue = 0;
  let setGateCallsFalse = 0;
  let floatingEnabled = false;

  const { api } = createCloudSyncPanelApiTestRig({
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    syncSketchNow: async () => {
      syncCalls += 1;
      return await new Promise(resolve => {
        resolveSync = resolve as typeof resolveSync;
      });
    },
    deleteTemporaryModelsInCloud: async () => {
      deleteModelsCalls += 1;
      return await new Promise(resolve => {
        resolveDeleteModels = resolve as typeof resolveDeleteModels;
      });
    },
    deleteTemporaryColorsInCloud: async () => {
      deleteColorsCalls += 1;
      return { ok: true, removed: 7 } as const;
    },
    setFloatingSketchSyncEnabledState: (enabled: boolean) => {
      const changed = floatingEnabled !== !!enabled;
      floatingEnabled = !!enabled;
      return changed;
    },
    pushFloatingSketchSyncPinnedNow: async (enabled: boolean) => {
      if (enabled) {
        setFloatingCallsTrue += 1;
        return await new Promise(resolve => {
          resolveSetFloatingTrue = resolve as typeof resolveSetFloatingTrue;
        });
      }
      setFloatingCallsFalse += 1;
      return { ok: true } as const;
    },
    pushTabsGateNow: async (open: boolean) => {
      if (open) {
        setGateCallsTrue += 1;
        return await new Promise(resolve => {
          resolveSetGateTrue = resolve as typeof resolveSetGateTrue;
        });
      }
      setGateCallsFalse += 1;
      return { ok: true } as const;
    },
  });

  const syncA = api.syncSketchNow?.();
  const syncB = api.syncSketchNow?.();
  await Promise.resolve();
  assert.equal(syncCalls, 1);
  assert.equal(syncA, syncB);
  resolveSync?.({ ok: true });
  assert.deepEqual(await syncA, { ok: true });

  const deleteA = api.deleteTemporaryModels?.();
  const deleteB = api.deleteTemporaryModels?.();
  const deleteC = api.deleteTemporaryColors?.();
  await Promise.resolve();
  assert.equal(deleteModelsCalls, 1);
  assert.equal(deleteColorsCalls, 0);
  assert.equal(deleteA, deleteB);
  assert.notEqual(deleteA, deleteC);
  assert.deepEqual(await deleteC, { ok: false, removed: 0, reason: 'busy' });
  resolveDeleteModels?.({ ok: true, removed: 3 });
  assert.deepEqual(await deleteA, { ok: true, removed: 3 });

  const setFloatingA = api.setFloatingSketchSyncEnabled?.(true);
  const setFloatingB = api.setFloatingSketchSyncEnabled?.(true);
  const setFloatingC = api.setFloatingSketchSyncEnabled?.(false);
  const setFloatingD = api.toggleFloatingSketchSyncEnabled?.();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(setFloatingCallsTrue, 1);
  assert.equal(setFloatingCallsFalse, 0);
  assert.equal(setFloatingA, setFloatingB);
  assert.notEqual(setFloatingA, setFloatingC);
  assert.notEqual(setFloatingA, setFloatingD);
  assert.deepEqual(await setFloatingC, { ok: false, reason: 'busy' });
  assert.deepEqual(await setFloatingD, { ok: false, reason: 'busy' });
  resolveSetFloatingTrue?.({ ok: true });
  assert.deepEqual(await setFloatingA, { ok: true, changed: true, enabled: true });

  const setGateA = api.setSite2TabsGateOpen?.(true);
  const setGateB = api.setSite2TabsGateOpen?.(true);
  const setGateC = api.setSite2TabsGateOpen?.(false);
  const setGateD = api.toggleSite2TabsGateOpen?.();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(setGateCallsTrue, 1);
  assert.equal(setGateCallsFalse, 0);
  assert.equal(setGateA, setGateB);
  assert.notEqual(setGateA, setGateC);
  assert.notEqual(setGateA, setGateD);
  assert.deepEqual(await setGateC, { ok: false, reason: 'busy' });
  assert.deepEqual(await setGateD, { ok: false, reason: 'busy' });
  resolveSetGateTrue?.({ ok: true });
  assert.deepEqual(await setGateA, { ok: true, changed: true, open: true, until: 61_000 });
});

test('cloud sync panel api shares app-scoped single-flight ownership across api instances for the same App', async () => {
  const sharedApp = {} as const;
  const tabsGateOpenRef = { value: false };
  const tabsGateUntilRef = { value: 0 };
  let tabsGateSnapshot = { open: false, until: 0, minutesLeft: 0 };
  let floatingEnabled = false;

  let resolveSync: ((value: { ok: true }) => void) | null = null;
  let resolveDeleteModels: ((value: { ok: true; removed: number }) => void) | null = null;
  let resolveSetFloatingTrue: ((value: { ok: true }) => void) | null = null;
  let resolveSetGateTrue: ((value: { ok: true }) => void) | null = null;

  let syncCalls = 0;
  let deleteModelsCalls = 0;
  let deleteColorsCalls = 0;
  let setFloatingCallsTrue = 0;
  let setFloatingCallsFalse = 0;
  let setGateCallsTrue = 0;
  let setGateCallsFalse = 0;

  const sharedOverrides = {
    App: sharedApp,
    tabsGateOpenRef,
    tabsGateUntilRef,
    getSite2TabsGateSnapshot: () => ({ ...tabsGateSnapshot }),
    subscribeSite2TabsGateSnapshot: () => () => {},
    writeSite2TabsGateLocal: (open: boolean, until: number) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
      tabsGateSnapshot = {
        open: !!open,
        until: Number(until) || 0,
        minutesLeft: open && until > 1000 ? Math.ceil((Number(until) - 1000) / 60000) : 0,
      };
    },
    patchSite2TabsGateUi: (open: boolean, until: number) => {
      tabsGateOpenRef.value = !!open;
      tabsGateUntilRef.value = Number(until) || 0;
      tabsGateSnapshot = {
        open: !!open,
        until: Number(until) || 0,
        minutesLeft: open && until > 1000 ? Math.ceil((Number(until) - 1000) / 60000) : 0,
      };
    },
    getFloatingSketchSyncEnabled: () => floatingEnabled,
    setFloatingSketchSyncEnabledState: (enabled: boolean) => {
      const changed = floatingEnabled !== !!enabled;
      floatingEnabled = !!enabled;
      return changed;
    },
    syncSketchNow: async () => {
      syncCalls += 1;
      return await new Promise(resolve => {
        resolveSync = resolve as typeof resolveSync;
      });
    },
    deleteTemporaryModelsInCloud: async () => {
      deleteModelsCalls += 1;
      return await new Promise(resolve => {
        resolveDeleteModels = resolve as typeof resolveDeleteModels;
      });
    },
    deleteTemporaryColorsInCloud: async () => {
      deleteColorsCalls += 1;
      return { ok: true, removed: 5 } as const;
    },
    pushFloatingSketchSyncPinnedNow: async (enabled: boolean) => {
      if (enabled) {
        setFloatingCallsTrue += 1;
        return await new Promise(resolve => {
          resolveSetFloatingTrue = resolve as typeof resolveSetFloatingTrue;
        });
      }
      setFloatingCallsFalse += 1;
      return { ok: true } as const;
    },
    pushTabsGateNow: async (open: boolean) => {
      if (open) {
        setGateCallsTrue += 1;
        return await new Promise(resolve => {
          resolveSetGateTrue = resolve as typeof resolveSetGateTrue;
        });
      }
      setGateCallsFalse += 1;
      return { ok: true } as const;
    },
  };

  const first = createCloudSyncPanelApiTestRig(sharedOverrides);
  const second = createCloudSyncPanelApiTestRig(sharedOverrides);

  const syncA = first.api.syncSketchNow?.();
  const syncB = second.api.syncSketchNow?.();
  await Promise.resolve();
  assert.equal(syncCalls, 1);
  assert.equal(syncA, syncB);
  resolveSync?.({ ok: true });
  assert.deepEqual(await syncA, { ok: true });

  const deleteA = first.api.deleteTemporaryModels?.();
  const deleteB = second.api.deleteTemporaryModels?.();
  const deleteC = second.api.deleteTemporaryColors?.();
  await Promise.resolve();
  assert.equal(deleteModelsCalls, 1);
  assert.equal(deleteColorsCalls, 0);
  assert.equal(deleteA, deleteB);
  assert.notEqual(deleteA, deleteC);
  assert.deepEqual(await deleteC, { ok: false, removed: 0, reason: 'busy' });
  resolveDeleteModels?.({ ok: true, removed: 9 });
  assert.deepEqual(await deleteA, { ok: true, removed: 9 });

  const setFloatingA = first.api.setFloatingSketchSyncEnabled?.(true);
  const setFloatingB = second.api.setFloatingSketchSyncEnabled?.(true);
  const setFloatingC = second.api.setFloatingSketchSyncEnabled?.(false);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(setFloatingCallsTrue, 1);
  assert.equal(setFloatingCallsFalse, 0);
  assert.equal(setFloatingA, setFloatingB);
  assert.notEqual(setFloatingA, setFloatingC);
  assert.deepEqual(await setFloatingC, { ok: false, reason: 'busy' });
  resolveSetFloatingTrue?.({ ok: true });
  assert.deepEqual(await setFloatingA, { ok: true, changed: true, enabled: true });

  const setGateA = first.api.setSite2TabsGateOpen?.(true);
  const setGateB = second.api.setSite2TabsGateOpen?.(true);
  const setGateC = second.api.setSite2TabsGateOpen?.(false);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(setGateCallsTrue, 1);
  assert.equal(setGateCallsFalse, 0);
  assert.equal(setGateA, setGateB);
  assert.notEqual(setGateA, setGateC);
  assert.deepEqual(await setGateC, { ok: false, reason: 'busy' });
  resolveSetGateTrue?.({ ok: true });
  assert.deepEqual(await setGateA, { ok: true, changed: true, open: true, until: 61_000 });
});
