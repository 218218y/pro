import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAsyncOperationHandle,
  observeAsyncOperation,
  reuseAsyncOperationHandle,
} from '../esm/native/runtime/async_operation.ts';

test('async operation handles distinguish acceptance from success and mark reused business instances', async () => {
  let resolveTerminal: (value: { ok: true }) => void = () => undefined;
  const settled = new Promise<{ ok: true }>(resolve => {
    resolveTerminal = resolve;
  });
  const handle = createAsyncOperationHandle('test-operation', settled, 123);
  const reused = reuseAsyncOperationHandle(handle);

  assert.deepEqual(
    {
      accepted: handle.accepted,
      reused: handle.reused,
      acceptedAt: handle.acceptedAt,
      hasOk: 'ok' in handle,
      sameBusinessInstance: reused.operationId === handle.operationId,
      sameTerminalPromise: reused.settled === handle.settled,
      reusedMarker: reused.reused,
    },
    {
      accepted: true,
      reused: false,
      acceptedAt: 123,
      hasOk: false,
      sameBusinessInstance: true,
      sameTerminalPromise: true,
      reusedMarker: true,
    }
  );

  resolveTerminal({ ok: true });
  assert.deepEqual(await reused.settled, { ok: true });
});

test('async operation observer reports one lifecycle per observer and preserves the business result', async () => {
  let resolveTerminal: (value: { ok: true }) => void = () => undefined;
  const settled = new Promise<{ ok: true }>(resolve => {
    resolveTerminal = resolve;
  });
  const handle = createAsyncOperationHandle('observed-operation', settled, 456);
  const calls: string[] = [];
  const observer = {
    observerId: 'test-lifecycle',
    onStarted: () => {
      calls.push('started');
      return 'span-1';
    },
    onSettled: (_result: { ok: true }, _handle: typeof handle, span: string | undefined) => {
      calls.push(`settled:${span}`);
    },
    onRejected: () => calls.push('rejected'),
  };

  const first = observeAsyncOperation({ ...observer, handle });
  const duplicate = observeAsyncOperation({ ...observer, handle: reuseAsyncOperationHandle(handle) });
  assert.equal(first.observed, true);
  assert.equal(duplicate.observed, false);
  assert.deepEqual(calls, ['started']);

  resolveTerminal({ ok: true });
  assert.deepEqual(await first.settled, { ok: true });
  await Promise.resolve();
  assert.deepEqual(calls, ['started', 'settled:span-1']);

  const lateDuplicate = observeAsyncOperation({ ...observer, handle: reuseAsyncOperationHandle(handle) });
  assert.equal(lateDuplicate.observed, false);
  assert.deepEqual(await lateDuplicate.settled, { ok: true });
  assert.deepEqual(calls, ['started', 'settled:span-1']);
});
