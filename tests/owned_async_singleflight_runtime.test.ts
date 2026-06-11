import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beginOwnedAsyncFamilyFlight,
  createKeyedAsyncSingleFlightRunner,
} from '../esm/native/runtime/owned_async_singleflight.ts';

test('beginOwnedAsyncFamilyFlight reuses same-key owner flights and reports busy conflicts', async () => {
  const owner = {};
  const flights = new WeakMap<object, { key: 'alpha' | 'beta'; promise: Promise<string> }>();
  let releaseFirst: (() => void) | null = null;
  const gate = new Promise<void>(resolve => {
    releaseFirst = resolve;
  });
  let calls = 0;

  const first = beginOwnedAsyncFamilyFlight({
    owner,
    flights,
    key: 'alpha' as const,
    run: async () => {
      calls += 1;
      await gate;
      return 'first';
    },
  });
  const reused = beginOwnedAsyncFamilyFlight({
    owner,
    flights,
    key: 'alpha' as const,
    run: async () => 'should-not-run',
  });
  const busy = beginOwnedAsyncFamilyFlight({
    owner,
    flights,
    key: 'beta' as const,
    run: async () => 'busy-should-not-run',
  });

  assert.equal(first.status, 'started');
  assert.equal(reused.status, 'reused');
  assert.equal(busy.status, 'busy');
  assert.equal(calls, 1);
  if (first.status !== 'started' || reused.status !== 'reused' || busy.status !== 'busy') return;
  assert.equal(reused.promise, first.promise);
  assert.equal(busy.activeKey, 'alpha');

  releaseFirst?.();
  assert.equal(await first.promise, 'first');
});

test('beginOwnedAsyncFamilyFlight without owner falls back to standalone run semantics', async () => {
  let calls = 0;
  const flights = new WeakMap<object, { key: 'only'; promise: Promise<string> }>();
  const started = beginOwnedAsyncFamilyFlight({
    owner: null,
    flights,
    key: 'only' as const,
    run: async () => {
      calls += 1;
      return 'ok';
    },
  });

  assert.equal(started.status, 'started');
  assert.equal(calls, 1);
  if (started.status !== 'started') return;
  assert.equal(await started.promise, 'ok');
  assert.equal(calls, 1);
});

test('createKeyedAsyncSingleFlightRunner reuses same-key work and isolates other keys', async () => {
  const runFlight = createKeyedAsyncSingleFlightRunner();
  let releaseAlpha: (() => void) | null = null;
  const alphaGate = new Promise<void>(resolve => {
    releaseAlpha = resolve;
  });
  let alphaCalls = 0;
  let betaCalls = 0;

  const alpha1 = runFlight('alpha', async () => {
    alphaCalls += 1;
    await alphaGate;
    return 'alpha';
  });
  const alpha2 = runFlight('alpha', async () => {
    alphaCalls += 1;
    return 'alpha-duplicate';
  });
  const beta = runFlight('beta', async () => {
    betaCalls += 1;
    return 'beta';
  });

  assert.equal(alpha1, alpha2);
  assert.equal(alphaCalls, 1);
  assert.equal(betaCalls, 1);
  assert.equal(await beta, 'beta');
  releaseAlpha?.();
  assert.equal(await alpha1, 'alpha');
});
