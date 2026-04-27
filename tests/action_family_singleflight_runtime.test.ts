import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginAppActionFamilyFlight,
  runAppActionFamilySingleFlight,
} from '../esm/native/ui/action_family_singleflight.js';

test('beginAppActionFamilyFlight reuses same-key flights and reports busy for conflicting keys', async () => {
  const flights = new WeakMap<object, { key: string; promise: Promise<string> }>();
  const owner = Object.create(null);
  let releaseFirst: (() => void) | null = null;
  const firstGate = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  let calls = 0;

  const first = beginAppActionFamilyFlight({
    flights,
    owner,
    key: 'alpha',
    run: async () => {
      calls += 1;
      await firstGate;
      return 'first';
    },
  });
  const reused = beginAppActionFamilyFlight({
    flights,
    owner,
    key: 'alpha',
    run: async () => 'reused-should-not-run',
  });
  const busy = beginAppActionFamilyFlight({
    flights,
    owner,
    key: 'beta',
    run: async () => 'busy-should-not-run',
  });

  assert.equal(first.status, 'started');
  assert.equal(reused.status, 'reused');
  assert.equal(busy.status, 'busy');
  assert.equal(calls, 1);
  if (reused.status !== 'reused' || first.status !== 'started' || busy.status !== 'busy') return;
  assert.equal(reused.promise, first.promise);
  assert.equal(busy.activeKey, 'alpha');

  releaseFirst?.();
  assert.equal(await first.promise, 'first');
  const next = beginAppActionFamilyFlight({
    flights,
    owner,
    key: 'beta',
    run: async () => 'second',
  });
  assert.equal(next.status, 'started');
  if (next.status !== 'started') return;
  assert.equal(await next.promise, 'second');
});

test('runAppActionFamilySingleFlight calls onReuse without duplicating work', async () => {
  const flights = new WeakMap<object, { key: string; promise: Promise<string> }>();
  const owner = Object.create(null);
  let releaseFirst: (() => void) | null = null;
  const firstGate = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  let calls = 0;
  let reuseCalls = 0;

  const first = runAppActionFamilySingleFlight({
    flights,
    owner,
    key: 'alpha',
    run: async () => {
      calls += 1;
      await firstGate;
      return 'done';
    },
  });
  const second = runAppActionFamilySingleFlight({
    flights,
    owner,
    key: 'alpha',
    run: async () => 'should-not-run',
    onReuse: () => {
      reuseCalls += 1;
    },
  });

  assert.equal(calls, 1);
  assert.equal(reuseCalls, 1);
  assert.equal(first, second);
  releaseFirst?.();
  assert.equal(await second, 'done');
});

test('runAppActionFamilySingleFlight returns the active promise for conflicting keys when no onBusy handler is provided', async () => {
  const flights = new WeakMap<object, { key: string; promise: Promise<string> }>();
  const owner = Object.create(null);
  let releaseFirst: (() => void) | null = null;
  const firstGate = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  let calls = 0;

  const first = runAppActionFamilySingleFlight({
    flights,
    owner,
    key: 'alpha',
    run: async () => {
      calls += 1;
      await firstGate;
      return 'alpha-done';
    },
  });
  const conflicting = runAppActionFamilySingleFlight({
    flights,
    owner,
    key: 'beta',
    run: async () => {
      calls += 1;
      return 'beta-should-not-run';
    },
  });

  assert.equal(calls, 1);
  assert.equal(conflicting, first);
  releaseFirst?.();
  assert.equal(await conflicting, 'alpha-done');
  assert.equal(calls, 1);
});
