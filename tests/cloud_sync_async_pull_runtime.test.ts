import test from 'node:test';
import assert from 'node:assert/strict';

import { toCloudSyncAsyncPull } from '../esm/native/services/cloud_sync_async_pull.ts';

test('cloud sync async pull adapter normalizes synchronous pull commands into awaitable operations', async () => {
  const calls: string[] = [];
  const pull = toCloudSyncAsyncPull(force => {
    calls.push(`sync:${String(force)}`);
  });

  await pull(true);

  assert.deepEqual(calls, ['sync:true']);
});

test('cloud sync async pull adapter preserves asynchronous pull commands and sequencing', async () => {
  const calls: string[] = [];
  const pull = toCloudSyncAsyncPull(async force => {
    calls.push(`start:${String(force)}`);
    await Promise.resolve();
    calls.push(`end:${String(force)}`);
  });

  await pull(false);

  assert.deepEqual(calls, ['start:false', 'end:false']);
});
