import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearAsyncOperationStaleDiagnostics,
  createAsyncOperationHandle,
  observeAsyncOperation,
  readAsyncOperationStaleDiagnostics,
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
      requestedAt: handle.requestedAt,
      acceptedAt: handle.acceptedAt,
      hasOk: 'ok' in handle,
      sameBusinessInstance: reused.operationId === handle.operationId,
      sameTerminalPromise: reused.settled === handle.settled,
      reusedMarker: reused.reused,
    },
    {
      accepted: true,
      reused: false,
      requestedAt: 123,
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

test('async operation watchdog reports stale pending work without changing settlement', async () => {
  clearAsyncOperationStaleDiagnostics();
  let resolveTerminal: (value: { ok: true }) => void = () => undefined;
  const settled = new Promise<{ ok: true }>(resolve => {
    resolveTerminal = resolve;
  });
  const handle = createAsyncOperationHandle('watched-operation', settled, 150, 100);
  let scheduled: (() => void) | null = null;
  const cancelled: unknown[] = [];
  const observerErrors: string[] = [];

  const observation = observeAsyncOperation({
    observerId: 'test-watchdog',
    handle,
    onSettled: () => undefined,
    onRejected: () => undefined,
    onObserverError: error => observerErrors.push(String(error)),
    watchdog: {
      staleAfterMs: 25,
      now: () => 175,
      schedule(callback) {
        scheduled = callback;
        return 'watchdog-token';
      },
      cancel(token) {
        cancelled.push(token);
      },
      onStale() {
        throw new Error('diagnostic sink failed');
      },
    },
  });

  assert.equal(typeof scheduled, 'function');
  (scheduled as () => void)();
  (scheduled as () => void)();
  assert.deepEqual(readAsyncOperationStaleDiagnostics(), [
    {
      observerId: 'test-watchdog',
      operationId: handle.operationId,
      requestedAt: 100,
      acceptedAt: 150,
      detectedAt: 175,
      ageMs: 75,
    },
  ]);
  assert.equal(observerErrors.length, 1);
  assert.match(observerErrors[0] || '', /diagnostic sink failed/);

  resolveTerminal({ ok: true });
  assert.deepEqual(await observation.settled, { ok: true });
  assert.deepEqual(cancelled, ['watchdog-token']);
});

test('async operation watchdog retains a bounded diagnostic history', async () => {
  clearAsyncOperationStaleDiagnostics();
  const observations: Array<Promise<{ ok: true }>> = [];

  for (let index = 0; index < 140; index += 1) {
    let fireWatchdog: (() => void) | null = null;
    const handle = createAsyncOperationHandle(
      `bounded-watchdog-${index}`,
      Promise.resolve({ ok: true } as const),
      200 + index,
      100 + index
    );
    const observation = observeAsyncOperation({
      observerId: 'bounded-watchdog',
      handle,
      onSettled: () => undefined,
      onRejected: () => undefined,
      watchdog: {
        staleAfterMs: 1,
        now: () => 300 + index,
        schedule(callback) {
          fireWatchdog = callback;
          return index;
        },
        cancel() {},
        onStale() {},
      },
    });
    (fireWatchdog as unknown as () => void)();
    observations.push(observation.settled);
  }

  await Promise.all(observations);
  const diagnostics = readAsyncOperationStaleDiagnostics();
  assert.equal(diagnostics.length, 128);
  assert.match(diagnostics[0]?.operationId || '', /^bounded-watchdog-12-/);
  assert.match(diagnostics.at(-1)?.operationId || '', /^bounded-watchdog-139-/);
});
