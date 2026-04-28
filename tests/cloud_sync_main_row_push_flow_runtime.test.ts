import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncMainRowPushFlow } from '../esm/native/services/cloud_sync_main_row_push.ts';

function createTimerHarness() {
  let nextId = 1;
  const timers = new Map<number, { id: number; cb: () => void; active: boolean }>();

  return {
    setTimeoutFn(cb: () => void): number {
      const id = nextId++;
      timers.set(id, { id, cb, active: true });
      return id;
    },
    clearTimeoutFn(id: unknown): void {
      const rec = timers.get(Number(id));
      if (rec) rec.active = false;
    },
    runNext(): boolean {
      const rec = [...timers.values()].find(timer => timer.active);
      if (!rec) return false;
      rec.active = false;
      rec.cb();
      return true;
    },
    activeCount(): number {
      return [...timers.values()].filter(timer => timer.active).length;
    },
  };
}

test('cloud sync main-row push flow drops pending follow-up push when suppression starts during an in-flight push', async () => {
  const suppressRef = { v: false };
  let inFlight = false;
  let pushCalls = 0;
  let resolveCurrentPush: (() => void) | null = null;

  const flow = createCloudSyncMainRowPushFlow({
    App: {},
    setTimeoutFn: handler => {
      handler();
      return 1;
    },
    clearTimeoutFn: () => undefined,
    suppressRef,
    isPushInFlight: () => inFlight,
    runPushRemote: () => {
      pushCalls += 1;
      inFlight = true;
      return new Promise<void>(resolve => {
        resolveCurrentPush = () => {
          inFlight = false;
          resolve();
        };
      });
    },
    flushPendingPullAfterFlights: () => undefined,
  });

  const firstPush = flow.pushNow();
  flow.schedulePush();

  suppressRef.v = true;
  resolveCurrentPush?.();
  await firstPush;

  suppressRef.v = false;
  const secondPush = flow.pushNow();
  resolveCurrentPush?.();
  await secondPush;
  await Promise.resolve();

  assert.equal(pushCalls, 2);
  flow.dispose();
});

test('cloud sync main-row push flow drops debounced push when suppression starts before the timer fires', async () => {
  const timers = createTimerHarness();
  const suppressRef = { v: false };
  let pushCalls = 0;
  const flow = createCloudSyncMainRowPushFlow({
    App: {},
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    suppressRef,
    isPushInFlight: () => false,
    runPushRemote: () => {
      pushCalls += 1;
      return Promise.resolve();
    },
    flushPendingPullAfterFlights: () => undefined,
  });

  flow.schedulePush();
  assert.equal(timers.activeCount(), 1);

  suppressRef.v = true;
  assert.equal(timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(pushCalls, 0, 'suppressed debounce should not push stale main-row state');
  assert.equal(timers.activeCount(), 0);

  suppressRef.v = false;
  flow.schedulePush();
  assert.equal(timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(pushCalls, 1, 'fresh work after suppression should start from a clean timer');
  flow.dispose();
});

test('cloud sync main-row push flow reports synchronous push failures and still notifies settled listeners', async () => {
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const suppressRef = { v: false };
  let shouldThrow = true;
  let pushCalls = 0;
  let settledCount = 0;

  const flow = createCloudSyncMainRowPushFlow({
    App: {
      services: {
        platform: {
          reportError(error: unknown, ctx: any) {
            reported.push({ error, ctx });
          },
        },
      },
    } as any,
    setTimeoutFn: handler => {
      handler();
      return 1;
    },
    clearTimeoutFn: () => undefined,
    suppressRef,
    isPushInFlight: () => false,
    runPushRemote: () => {
      pushCalls += 1;
      if (shouldThrow) throw new Error('sync push failed');
      return Promise.resolve();
    },
    flushPendingPullAfterFlights: () => undefined,
  });

  flow.subscribePushSettled(() => {
    settledCount += 1;
  });

  await assert.rejects(() => flow.pushNow(), /sync push failed/);

  assert.equal(pushCalls, 1);
  assert.equal(settledCount, 1);
  assert.equal(reported.length, 1);
  assert.equal(reported[0]?.ctx?.op, 'cloudSyncMainRow.push');

  shouldThrow = false;
  await flow.pushNow();

  assert.equal(pushCalls, 2);
  assert.equal(settledCount, 2);
  assert.equal(reported.length, 1);
  flow.dispose();
});

test('cloud sync main-row push flow reports async push rejections without leaving detached timer work unhandled', async () => {
  const timers = createTimerHarness();
  const reported: Array<{ error: unknown; ctx: any }> = [];
  const suppressRef = { v: false };
  let pushCalls = 0;
  let settledCount = 0;
  const originalNow = Date.now;
  const now = originalNow() + 9000;

  try {
    Date.now = () => now;
    const flow = createCloudSyncMainRowPushFlow({
      App: {
        services: {
          platform: {
            reportError(error: unknown, ctx: any) {
              reported.push({ error, ctx });
            },
          },
        },
      } as any,
      setTimeoutFn: timers.setTimeoutFn,
      clearTimeoutFn: timers.clearTimeoutFn,
      suppressRef,
      isPushInFlight: () => false,
      runPushRemote: () => {
        pushCalls += 1;
        return Promise.reject(new Error('async push failed'));
      },
      flushPendingPullAfterFlights: () => undefined,
    });

    flow.subscribePushSettled(() => {
      settledCount += 1;
    });

    flow.schedulePush();
    assert.equal(timers.runNext(), true);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(pushCalls, 1);
    assert.equal(settledCount, 1);
    assert.equal(reported.length, 1);
    assert.equal((reported[0]?.error as Error).message, 'async push failed');
    assert.equal(reported[0]?.ctx?.op, 'cloudSyncMainRow.push');
    flow.dispose();
  } finally {
    Date.now = originalNow;
  }
});
