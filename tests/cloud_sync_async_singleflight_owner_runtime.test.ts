import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginCloudSyncOwnedAsyncFamilyFlight,
  runCloudSyncOwnedAsyncFamilySingleFlight,
} from '../esm/native/services/cloud_sync_async_singleflight.ts';

test('owned cloud-sync family flight registers immediately for synchronous re-entry reuse', async () => {
  const owner = {};
  const flights = new WeakMap<object, { key: 'same'; promise: Promise<string> }>();
  let runs = 0;
  let nested: Promise<string> | null = null;

  const outer = beginCloudSyncOwnedAsyncFamilyFlight({
    owner,
    flights,
    key: 'same' as const,
    run: async () => {
      runs += 1;
      const reentered = beginCloudSyncOwnedAsyncFamilyFlight({
        owner,
        flights,
        key: 'same' as const,
        run: async () => {
          runs += 1;
          return 'nested';
        },
      });
      assert.equal(reentered.status, 'reused');
      nested = reentered.promise;
      return 'outer';
    },
  });

  assert.equal(outer.status, 'started');
  assert.equal(runs, 1);
  assert.equal(await outer.promise, 'outer');
  assert.equal(await nested, 'outer');
});

test('owned cloud-sync family flight returns busy for synchronous conflicting re-entry', async () => {
  const owner = {};
  const flights = new WeakMap<
    object,
    { key: 'open' | 'close'; promise: Promise<{ ok: boolean; reason?: string }> }
  >();
  let runs = 0;
  let conflictStatus: string | null = null;

  const outer = beginCloudSyncOwnedAsyncFamilyFlight({
    owner,
    flights,
    key: 'open' as const,
    run: async () => {
      runs += 1;
      const conflict = beginCloudSyncOwnedAsyncFamilyFlight({
        owner,
        flights,
        key: 'close' as const,
        run: async () => ({ ok: true }),
      });
      conflictStatus = conflict.status;
      return { ok: true };
    },
  });

  assert.equal(outer.status, 'started');
  assert.equal(conflictStatus, 'busy');
  assert.equal(runs, 1);
  assert.deepEqual(await outer.promise, { ok: true });
});

test('runCloudSyncOwnedAsyncFamilySingleFlight returns the active promise for conflicting keys without rerunning work', async () => {
  const owner = {};
  const flights = new WeakMap<object, { key: 'open' | 'close'; promise: Promise<string> }>();
  let releaseFirst: (() => void) | null = null;
  const firstGate = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  let runs = 0;

  const first = runCloudSyncOwnedAsyncFamilySingleFlight({
    owner,
    flights,
    key: 'open' as const,
    run: async () => {
      runs += 1;
      await firstGate;
      return 'open-done';
    },
  });
  const conflicting = runCloudSyncOwnedAsyncFamilySingleFlight({
    owner,
    flights,
    key: 'close' as const,
    run: async () => {
      runs += 1;
      return 'close-should-not-run';
    },
  });

  assert.equal(runs, 1);
  assert.equal(conflicting, first);
  releaseFirst?.();
  assert.equal(await conflicting, 'open-done');
  assert.equal(runs, 1);
});
