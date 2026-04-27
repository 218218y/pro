import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSite2TabsGateTarget,
  runSite2TabsGateCommand,
  toggleSite2TabsGateCommand,
} from '../esm/native/services/cloud_sync_tabs_gate_command.ts';

test('cloud sync tabs gate command skips redundant refreshes but extends stale opens', async () => {
  const nowMs = 1_000_000;
  assert.deepEqual(resolveSite2TabsGateTarget(true, nowMs, true, nowMs + 10 * 60_000, 90 * 60_000), {
    changed: false,
    open: true,
    until: nowMs + 10 * 60_000,
  });
  assert.deepEqual(resolveSite2TabsGateTarget(true, nowMs, true, nowMs + 60_000, 90 * 60_000), {
    changed: true,
    open: true,
    until: nowMs + 90 * 60_000,
  });
});

test('cloud sync tabs gate command rolls back on push failure and reports final state', async () => {
  const patches: Array<{ kind: string; open: boolean; until: number }> = [];
  const gateOpenRef = { value: false };
  const gateUntilRef = { value: 0 };

  const result = await runSite2TabsGateCommand(
    {
      App: {} as any,
      clientId: 'client-1',
      isTabsGateController: true,
      site2TabsTtlMs: 60_000,
      tabsGateOpenRef: gateOpenRef,
      tabsGateUntilRef: gateUntilRef,
      now: () => 1_000,
      writeSite2TabsGateLocal: (open, until) => {
        patches.push({ kind: 'local', open, until });
        gateOpenRef.value = !!open;
        gateUntilRef.value = Number(until) || 0;
      },
      patchSite2TabsGateUi: (open, until) => {
        patches.push({ kind: 'ui', open, until });
        gateOpenRef.value = !!open;
        gateUntilRef.value = Number(until) || 0;
      },
      pushTabsGateNow: async () => ({ ok: false, reason: 'write' }),
      pullTabsGateOnce: async () => {
        gateOpenRef.value = false;
        gateUntilRef.value = 0;
      },
      reportNonFatal: () => {},
    },
    true
  );

  assert.deepEqual(result, {
    ok: false,
    changed: true,
    reason: 'write',
    rolledBack: true,
    open: false,
    until: 0,
  });
  assert.equal(patches.length, 2);
});

test('cloud sync tabs gate toggle command flips the current ref state', async () => {
  const gateOpenRef = { value: true };
  const gateUntilRef = { value: 10_000 };
  const result = await toggleSite2TabsGateCommand({
    App: {} as any,
    clientId: 'client-1',
    isTabsGateController: true,
    site2TabsTtlMs: 60_000,
    tabsGateOpenRef: gateOpenRef,
    tabsGateUntilRef: gateUntilRef,
    now: () => 5_000,
    writeSite2TabsGateLocal: (open, until) => {
      gateOpenRef.value = open;
      gateUntilRef.value = until;
    },
    patchSite2TabsGateUi: (open, until) => {
      gateOpenRef.value = open;
      gateUntilRef.value = until;
    },
    pushTabsGateNow: async () => ({ ok: true }),
    pullTabsGateOnce: async () => {},
    reportNonFatal: () => {},
  });

  assert.deepEqual(result, { ok: true, changed: true, open: false, until: 0 });
});

test('cloud sync tabs gate command preserves push failure message', async () => {
  const gateOpenRef = { value: false };
  const gateUntilRef = { value: 0 };

  const result = await runSite2TabsGateCommand(
    {
      App: {} as any,
      clientId: 'client-1',
      isTabsGateController: true,
      site2TabsTtlMs: 60_000,
      tabsGateOpenRef: gateOpenRef,
      tabsGateUntilRef: gateUntilRef,
      now: () => 1_000,
      writeSite2TabsGateLocal: (open, until) => {
        gateOpenRef.value = !!open;
        gateUntilRef.value = Number(until) || 0;
      },
      patchSite2TabsGateUi: (open, until) => {
        gateOpenRef.value = !!open;
        gateUntilRef.value = Number(until) || 0;
      },
      pushTabsGateNow: async () => ({ ok: false, reason: 'error', message: 'gate exploded' }),
      pullTabsGateOnce: async () => {
        gateOpenRef.value = false;
        gateUntilRef.value = 0;
      },
      reportNonFatal: () => {},
    },
    true
  );

  assert.deepEqual(result, {
    ok: false,
    changed: true,
    reason: 'error',
    message: 'gate exploded',
    rolledBack: true,
    open: false,
    until: 0,
  });
});

test('cloud sync tabs gate command single-flights duplicate targets and returns busy for conflicting targets', async () => {
  const gateOpenRef = { value: false };
  const gateUntilRef = { value: 0 };
  let pushCalls = 0;
  let writeCalls = 0;
  let patchCalls = 0;
  let resolvePush: ((value: { ok: true }) => void) | null = null;

  const deps = {
    App: {} as any,
    clientId: 'client-1',
    isTabsGateController: true,
    site2TabsTtlMs: 60_000,
    tabsGateOpenRef: gateOpenRef,
    tabsGateUntilRef: gateUntilRef,
    now: () => 1_000,
    writeSite2TabsGateLocal: (open: boolean, until: number) => {
      writeCalls += 1;
      gateOpenRef.value = !!open;
      gateUntilRef.value = Number(until) || 0;
    },
    patchSite2TabsGateUi: (open: boolean, until: number) => {
      patchCalls += 1;
      gateOpenRef.value = !!open;
      gateUntilRef.value = Number(until) || 0;
    },
    pushTabsGateNow: (open: boolean, until: number) => {
      pushCalls += 1;
      assert.equal(open, true);
      assert.equal(until, 61_000);
      return new Promise(resolve => {
        resolvePush = resolve as typeof resolvePush;
      });
    },
    pullTabsGateOnce: async () => {
      throw new Error('rollback should not run for busy conflicts');
    },
    reportNonFatal: () => {},
  };

  const openA = runSite2TabsGateCommand(deps, true);
  const openB = runSite2TabsGateCommand(deps, true);
  const close = runSite2TabsGateCommand(deps, false);

  await Promise.resolve();
  assert.equal(openA, openB);
  assert.equal(pushCalls, 1);
  assert.equal(writeCalls, 1);
  assert.equal(patchCalls, 1);
  assert.deepEqual(await close, { ok: false, reason: 'busy' });
  assert.equal(writeCalls, 1);
  assert.equal(patchCalls, 1);
  assert.equal(gateOpenRef.value, true);
  assert.equal(gateUntilRef.value, 61_000);

  resolvePush?.({ ok: true });
  assert.deepEqual(await openA, { ok: true, changed: true, open: true, until: 61_000 });
});
