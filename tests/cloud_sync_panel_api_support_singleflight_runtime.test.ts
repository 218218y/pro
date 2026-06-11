import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCloudSyncAsyncFamilySingleFlightRunner,
  createCloudSyncAsyncSingleFlightRunner,
} from '../esm/native/services/cloud_sync_panel_api_support.ts';

test('cloud sync async single-flight runner blocks re-entrant duplicate starts before registration settles', async () => {
  const runSingleFlight = createCloudSyncAsyncSingleFlightRunner();
  let runCalls = 0;
  let nested: Promise<string> | null = null;

  const outer = runSingleFlight('same-key', async () => {
    runCalls += 1;
    nested = runSingleFlight('same-key', async () => {
      runCalls += 1;
      return 'nested';
    });
    return 'outer';
  });

  await Promise.resolve();
  assert.equal(nested, outer);
  assert.equal(runCalls, 1);
  assert.equal(await outer, 'outer');
  assert.equal(await nested, 'outer');
});

test('cloud sync async family runner blocks re-entrant conflicting targets before the first run settles', async () => {
  const runFamilyFlight = createCloudSyncAsyncFamilySingleFlightRunner<
    { ok: boolean; reason?: string },
    'open' | 'close'
  >(() => ({ ok: false, reason: 'busy' }));

  let runCalls = 0;
  let conflicting: Promise<{ ok: boolean; reason?: string }> | null = null;

  const outer = runFamilyFlight('open', async () => {
    runCalls += 1;
    conflicting = runFamilyFlight('close', async () => {
      runCalls += 1;
      return { ok: true };
    });
    return { ok: true };
  });

  await Promise.resolve();
  assert.equal(runCalls, 1);
  assert.notEqual(conflicting, outer);
  assert.deepEqual(await conflicting, { ok: false, reason: 'busy' });
  assert.deepEqual(await outer, { ok: true });
});
