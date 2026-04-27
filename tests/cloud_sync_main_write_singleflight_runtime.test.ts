import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncMainWriteSingleFlight } from '../esm/native/services/cloud_sync_main_write_singleflight.ts';

test('cloud sync main-write single-flight reuses duplicate same-key work and blocks conflicting keys', async () => {
  const owner = {} as const;
  const flights = createCloudSyncMainWriteSingleFlight(owner);
  let release: (() => void) | null = null;
  let runs = 0;

  const first = flights.run(
    'push',
    async () => {
      runs += 1;
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return 'ok';
    },
    () => 'busy'
  );
  const second = flights.run(
    'push',
    async () => 'wrong',
    () => 'busy'
  );
  const conflict = await flights.run(
    'delete:models',
    async () => 'wrong',
    () => 'busy'
  );
  await Promise.resolve();

  assert.equal(first, second);
  assert.equal(conflict, 'busy');
  assert.equal(runs, 1);
  assert.equal(flights.isActive(), true);

  release?.();
  assert.equal(await first, 'ok');
  assert.equal(flights.isActive(), false);
});

test('cloud sync main-write single-flight shares app-scoped ownership across instances for the same owner', async () => {
  const owner = {} as const;
  const first = createCloudSyncMainWriteSingleFlight(owner);
  const second = createCloudSyncMainWriteSingleFlight(owner);
  let release: (() => void) | null = null;
  let runs = 0;

  const primary = first.run(
    'push',
    async () => {
      runs += 1;
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return 'ok';
    },
    () => 'busy'
  );
  const duplicate = second.run(
    'push',
    async () => 'wrong',
    () => 'busy'
  );
  const conflict = await second.run(
    'delete:models',
    async () => 'wrong',
    () => 'busy'
  );
  await Promise.resolve();

  assert.equal(primary, duplicate);
  assert.equal(conflict, 'busy');
  assert.equal(runs, 1);
  assert.equal(first.isActive(), true);
  assert.equal(second.isActive(), true);

  release?.();
  assert.equal(await primary, 'ok');
  assert.equal(first.isActive(), false);
  assert.equal(second.isActive(), false);
});
