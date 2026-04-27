import test from 'node:test';
import assert from 'node:assert/strict';

import {
  runFloatingSketchSyncPinCommand,
  toggleFloatingSketchSyncPinCommand,
} from '../esm/native/services/cloud_sync_sync_pin_command.ts';

test('floating sketch sync pin command becomes a no-op when state is unchanged', async () => {
  let enabled = true;
  let pushes = 0;
  const result = await runFloatingSketchSyncPinCommand(
    {
      App: {} as any,
      getFloatingSketchSyncEnabled: () => enabled,
      setFloatingSketchSyncEnabledState: next => {
        enabled = !!next;
        return true;
      },
      pushFloatingSketchSyncPinnedNow: async () => {
        pushes += 1;
        return { ok: true };
      },
      reportNonFatal: () => {},
    },
    true
  );

  assert.deepEqual(result, { ok: true, changed: false, enabled: true });
  assert.equal(pushes, 0);
});

test('floating sketch sync pin command rolls back local state on push failure', async () => {
  let enabled = false;
  const states: boolean[] = [];
  const result = await runFloatingSketchSyncPinCommand(
    {
      App: {} as any,
      getFloatingSketchSyncEnabled: () => enabled,
      setFloatingSketchSyncEnabledState: next => {
        enabled = !!next;
        states.push(enabled);
        return true;
      },
      pushFloatingSketchSyncPinnedNow: async () => ({ ok: false, reason: 'busy' }),
      reportNonFatal: () => {},
    },
    true
  );

  assert.deepEqual(result, { ok: false, changed: true, enabled: false, reason: 'busy', rolledBack: true });
  assert.deepEqual(states, [true, false]);
  assert.equal(enabled, false);
});

test('floating sketch sync pin toggle command flips the current state', async () => {
  let enabled = false;
  const result = await toggleFloatingSketchSyncPinCommand({
    App: {} as any,
    getFloatingSketchSyncEnabled: () => enabled,
    setFloatingSketchSyncEnabledState: next => {
      enabled = !!next;
      return true;
    },
    pushFloatingSketchSyncPinnedNow: async next => ({ ok: !!next }),
    reportNonFatal: () => {},
  });

  assert.deepEqual(result, { ok: true, changed: true, enabled: true });
  assert.equal(enabled, true);
});

test('floating sketch sync pin command preserves push failure message', async () => {
  let enabled = false;
  const result = await runFloatingSketchSyncPinCommand(
    {
      App: {} as any,
      getFloatingSketchSyncEnabled: () => enabled,
      setFloatingSketchSyncEnabledState: next => {
        enabled = !!next;
        return true;
      },
      pushFloatingSketchSyncPinnedNow: async () => ({ ok: false, reason: 'error', message: 'pin exploded' }),
      reportNonFatal: () => {},
    },
    true
  );

  assert.deepEqual(result, {
    ok: false,
    changed: true,
    enabled: false,
    reason: 'error',
    message: 'pin exploded',
    rolledBack: true,
  });
});

test('floating sketch sync pin command single-flights duplicate targets and returns busy for conflicting targets', async () => {
  let enabled = false;
  let pushCalls = 0;
  let localWrites = 0;
  let resolvePush: ((value: { ok: true }) => void) | null = null;

  const deps = {
    App: {} as any,
    getFloatingSketchSyncEnabled: () => enabled,
    setFloatingSketchSyncEnabledState: (next: boolean) => {
      localWrites += 1;
      enabled = !!next;
      return true;
    },
    pushFloatingSketchSyncPinnedNow: (next: boolean) => {
      pushCalls += 1;
      assert.equal(next, true);
      return new Promise(resolve => {
        resolvePush = resolve as typeof resolvePush;
      });
    },
    reportNonFatal: () => {},
  };

  const enableA = runFloatingSketchSyncPinCommand(deps, true);
  const enableB = runFloatingSketchSyncPinCommand(deps, true);
  const disable = runFloatingSketchSyncPinCommand(deps, false);

  await Promise.resolve();
  assert.equal(enableA, enableB);
  assert.equal(pushCalls, 1);
  assert.equal(localWrites, 1);
  assert.equal(enabled, true);
  assert.deepEqual(await disable, { ok: false, reason: 'busy' });
  assert.equal(localWrites, 1);
  assert.equal(enabled, true);

  resolvePush?.({ ok: true });
  assert.deepEqual(await enableA, { ok: true, changed: true, enabled: true });
});
