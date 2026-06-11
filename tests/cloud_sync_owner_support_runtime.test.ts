import test from 'node:test';
import assert from 'node:assert/strict';

import { runCloudSyncInitialPulls } from '../esm/native/services/cloud_sync_owner_support.ts';

test('cloud sync owner support skips bootstrap pulls entirely when the install is already stale', async () => {
  const calls: string[] = [];

  await runCloudSyncInitialPulls({
    pullMainOnce: async () => {
      calls.push('main');
    },
    pullSketchOnce: async () => {
      calls.push('sketch');
    },
    pullTabsGateOnce: async () => {
      calls.push('tabs');
    },
    pullFloatingSketchSyncPinnedOnce: async () => {
      calls.push('floating');
    },
    shouldContinue: () => false,
  });

  assert.deepEqual(calls, []);
});

test('cloud sync owner support stops the initial bootstrap fanout after the current phase when the install turns stale', async () => {
  const calls: string[] = [];
  let active = true;

  await runCloudSyncInitialPulls({
    pullMainOnce: async () => {
      calls.push('main');
      active = false;
    },
    pullSketchOnce: async () => {
      calls.push('sketch');
    },
    pullTabsGateOnce: async () => {
      calls.push('tabs');
    },
    pullFloatingSketchSyncPinnedOnce: async () => {
      calls.push('floating');
    },
    shouldContinue: () => active,
  });

  assert.deepEqual(calls, ['main']);
});

test('cloud sync owner support yields between initial pull phases without changing phase order', async () => {
  const calls: string[] = [];

  await runCloudSyncInitialPulls({
    pullMainOnce: async () => {
      calls.push('main');
    },
    pullSketchOnce: async () => {
      calls.push('sketch');
    },
    pullTabsGateOnce: async () => {
      calls.push('tabs');
    },
    pullFloatingSketchSyncPinnedOnce: async () => {
      calls.push('floating');
    },
    yieldBetweenPulls: async () => {
      calls.push('yield');
    },
  });

  assert.deepEqual(calls, ['main', 'yield', 'sketch', 'yield', 'tabs', 'yield', 'floating']);
});

test('cloud sync owner support does not yield once the install turns stale between phases', async () => {
  const calls: string[] = [];
  let active = true;

  await runCloudSyncInitialPulls({
    pullMainOnce: async () => {
      calls.push('main');
      active = false;
    },
    pullSketchOnce: async () => {
      calls.push('sketch');
    },
    pullTabsGateOnce: async () => {
      calls.push('tabs');
    },
    pullFloatingSketchSyncPinnedOnce: async () => {
      calls.push('floating');
    },
    shouldContinue: () => active,
    yieldBetweenPulls: async () => {
      calls.push('yield');
    },
  });

  assert.deepEqual(calls, ['main']);
});
