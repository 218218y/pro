import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncPullCoalescer } from '../esm/native/services/cloud_sync_coalescer.ts';

type TimerRec = { id: number; ms: number; cb: () => void; active: boolean };

function createTimerHarness() {
  let nextId = 1;
  const timers = new Map<number, TimerRec>();
  let setCount = 0;
  let clearCount = 0;

  const setTimeoutFn = (cb: () => void, ms: number): number => {
    const id = nextId++;
    setCount += 1;
    timers.set(id, { id, ms: Number(ms) || 0, cb, active: true });
    return id;
  };

  const clearTimeoutFn = (id: unknown): void => {
    const rec = timers.get(Number(id));
    if (rec) {
      rec.active = false;
      clearCount += 1;
    }
  };

  const runNext = (): boolean => {
    const active = [...timers.values()].filter(t => t.active).sort((a, b) => a.ms - b.ms || a.id - b.id);
    if (!active.length) return false;
    const rec = active[0];
    rec.active = false;
    rec.cb();
    return true;
  };

  const activeCount = (): number => [...timers.values()].filter(t => t.active).length;
  const activeDelays = (): number[] =>
    [...timers.values()]
      .filter(t => t.active)
      .map(t => t.ms)
      .sort((a, b) => a - b);

  return {
    setTimeoutFn,
    clearTimeoutFn,
    runNext,
    activeCount,
    activeDelays,
    get setCount() {
      return setCount;
    },
    get clearCount() {
      return clearCount;
    },
  };
}

function createDeferredRun() {
  let resolve!: () => void;
  const promise = new Promise<void>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

function createCoalescerHarness(opts?: {
  debounceMs?: number;
  minGapMs?: number;
  maxDelayMs?: number;
  diagCooldownMs?: number;
  run?: () => Promise<void> | void;
  isDisposed?: () => boolean;
  isSuppressed?: () => boolean;
  subscribeMainPushSettled?: ((listener: () => void) => () => void) | null;
}) {
  const timers = createTimerHarness();
  const runs: string[] = [];
  const diags: unknown[] = [];
  const errors: string[] = [];
  let mainPushInFlight = false;
  let disposed = false;
  let suppressed = false;
  let subscribeCount = 0;
  let unsubscribeCount = 0;
  const pushSettledListeners = new Set<() => void>();

  const coalescer = createCloudSyncPullCoalescer({
    scope: 'rt',
    run: () => {
      runs.push('run');
      return opts?.run?.();
    },
    debounceMs: opts?.debounceMs ?? 0,
    minGapMs: opts?.minGapMs ?? 0,
    maxDelayMs: opts?.maxDelayMs ?? 0,
    diagCooldownMs: opts?.diagCooldownMs,
    isDisposed: () => (typeof opts?.isDisposed === 'function' ? opts.isDisposed() : disposed),
    isSuppressed: () => (typeof opts?.isSuppressed === 'function' ? opts.isSuppressed() : suppressed),
    isMainPushInFlight: () => mainPushInFlight,
    subscribeMainPushSettled:
      opts && 'subscribeMainPushSettled' in opts
        ? opts.subscribeMainPushSettled
        : listener => {
            subscribeCount += 1;
            pushSettledListeners.add(listener);
            return () => {
              unsubscribeCount += 1;
              pushSettledListeners.delete(listener);
            };
          },
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    reportNonFatal: (op: string) => errors.push(op),
    diag: (...args: unknown[]) => diags.push(args),
  });

  return {
    timers,
    runs,
    diags,
    errors,
    coalescer,
    setMainPushInFlight(next: boolean) {
      mainPushInFlight = next;
    },
    setDisposed(next: boolean) {
      disposed = !!next;
    },
    setSuppressed(next: boolean) {
      suppressed = !!next;
    },
    emitMainPushSettled() {
      for (const listener of [...pushSettledListeners]) listener();
    },
    get subscribeCount() {
      return subscribeCount;
    },
    get unsubscribeCount() {
      return unsubscribeCount;
    },
    get pushSettledListenerCount() {
      return pushSettledListeners.size;
    },
  };
}

test('cloud sync pull coalescer collapses burst triggers into one run and supports cancel', async () => {
  const burst = createCoalescerHarness();

  burst.coalescer.trigger('a');
  burst.coalescer.trigger('b');
  burst.coalescer.trigger('c');

  assert.equal(burst.timers.activeCount(), 1);
  assert.equal(burst.runs.length, 0);

  assert.equal(burst.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(burst.runs.length, 1);
  assert.equal(burst.errors.length, 0);
  assert.equal(burst.diags.length >= 1, true);

  const cancelHarness = createCoalescerHarness();
  cancelHarness.coalescer.trigger('cancel-me');
  assert.equal(cancelHarness.timers.activeCount(), 1);
  cancelHarness.coalescer.cancel();
  assert.equal(cancelHarness.timers.activeCount(), 0);
  assert.equal(cancelHarness.runs.length, 0);
});

test('cloud sync pull coalescer keeps diag reasons bounded and collapses duplicate reason labels', async () => {
  const burst = createCoalescerHarness();

  burst.coalescer.trigger('main');
  burst.coalescer.trigger('main');
  burst.coalescer.trigger('sketch');
  burst.coalescer.trigger('tabs');
  burst.coalescer.trigger('floating');
  burst.coalescer.trigger('colors');
  burst.coalescer.trigger('models');
  burst.coalescer.trigger('settings');
  burst.coalescer.trigger('settings');

  assert.equal(burst.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(burst.runs.length, 1);
  assert.equal(burst.diags.length >= 1, true);
  const payload = burst.diags[0]?.[1] as { scope?: string; count?: number; reason?: string };
  assert.equal(payload.scope, 'rt');
  assert.equal(payload.count, 9);
  assert.equal(payload.reason, 'main|sketch|tabs|floating|colors|models|…(+1)');
});

test('cloud sync pull coalescer normalizes blank scope labels for fallback reasons and diagnostics', async () => {
  const timers = createTimerHarness();
  const diags: unknown[] = [];
  const coalescer = createCloudSyncPullCoalescer({
    scope: '   ',
    run: () => undefined,
    isDisposed: () => false,
    isSuppressed: () => false,
    isMainPushInFlight: () => false,
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    reportNonFatal: () => undefined,
    diag: (...args: unknown[]) => diags.push(args),
  });

  coalescer.trigger('   ');
  coalescer.trigger('x');

  assert.equal(timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  const payload = diags[0]?.[1] as { scope?: string; reason?: string; count?: number };
  assert.equal(payload.scope, 'pull');
  assert.equal(payload.reason, 'pull|x');
  assert.equal(payload.count, 2);
});

test('cloud sync pull coalescer keeps an earlier pending timer instead of rearming on later burst triggers', () => {
  const harness = createCoalescerHarness({ debounceMs: 50 });
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    harness.coalescer.trigger('first');
    assert.deepEqual(harness.timers.activeDelays(), [50]);
    assert.equal(harness.timers.setCount, 1);
    assert.equal(harness.timers.clearCount, 0);

    now = 1010;
    harness.coalescer.trigger('later-burst');

    assert.deepEqual(harness.timers.activeDelays(), [50]);
    assert.equal(harness.timers.setCount, 1, 'later trigger should reuse the earlier timer');
    assert.equal(harness.timers.clearCount, 0, 'later trigger should not churn timeout handles');
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync pull coalescer rearms when a newer trigger asks for an earlier immediate run', () => {
  const harness = createCoalescerHarness({ debounceMs: 50 });
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    harness.coalescer.trigger('first');
    assert.deepEqual(harness.timers.activeDelays(), [50]);

    now = 1010;
    harness.coalescer.trigger('urgent', true);

    assert.deepEqual(harness.timers.activeDelays(), [0]);
    assert.equal(harness.timers.setCount, 2, 'immediate trigger should rearm to the earlier due time');
    assert.equal(harness.timers.clearCount, 1, 'earlier run should replace the stale later timer');
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync pull coalescer parks queued work during main-row push and resumes once the push settles', async () => {
  const harness = createCoalescerHarness();

  harness.setMainPushInFlight(true);
  harness.coalescer.trigger('push-blocked');

  assert.equal(
    harness.timers.activeCount(),
    0,
    'blocked coalescer should park without arming a throwaway timer'
  );
  assert.equal(harness.subscribeCount, 1);
  assert.equal(harness.pushSettledListenerCount, 1);
  assert.equal(harness.runs.length, 0);

  harness.setMainPushInFlight(false);
  harness.emitMainPushSettled();

  assert.equal(harness.timers.activeCount(), 1, 'push-settled hook should arm one canonical follow-up timer');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 1);
  assert.equal(harness.errors.length, 0);
  assert.equal(harness.timers.activeCount(), 0);
});

test('cloud sync pull coalescer keeps one fallback retry timer when main-row push is active but no push-settled hook exists', async () => {
  const harness = createCoalescerHarness({ subscribeMainPushSettled: null });

  harness.setMainPushInFlight(true);
  harness.coalescer.trigger('push-blocked-no-hook');

  assert.deepEqual(harness.timers.activeDelays(), [25]);
  assert.equal(harness.subscribeCount, 0);
  assert.equal(harness.pushSettledListenerCount, 0);
  assert.equal(harness.runs.length, 0);

  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  assert.deepEqual(
    harness.timers.activeDelays(),
    [25],
    'blocked retry should keep one canonical timer instead of dropping the queued run'
  );
  assert.equal(harness.runs.length, 0);

  harness.setMainPushInFlight(false);
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 1);
  assert.equal(harness.errors.length, 0);
  assert.equal(harness.timers.activeCount(), 0);
});

test('cloud sync pull coalescer subscribes to push-settled only while blocked and can resubscribe after reuse', async () => {
  const harness = createCoalescerHarness();

  assert.equal(harness.subscribeCount, 0);
  assert.equal(harness.pushSettledListenerCount, 0);

  harness.coalescer.trigger('idle-first');
  assert.equal(harness.subscribeCount, 0);
  assert.equal(harness.pushSettledListenerCount, 0);
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(harness.runs.length, 1);
  assert.equal(harness.unsubscribeCount, 0);
  await Promise.resolve();

  harness.setMainPushInFlight(true);
  harness.coalescer.trigger('blocked-second');
  assert.equal(harness.subscribeCount, 1, 'blocked work should subscribe once');
  assert.equal(harness.pushSettledListenerCount, 1);
  await Promise.resolve();
  assert.equal(harness.timers.activeCount(), 0, 'blocked follow-up should stay parked until push settles');
  assert.equal(harness.runs.length, 1);

  harness.setMainPushInFlight(false);
  harness.emitMainPushSettled();
  assert.equal(harness.timers.activeCount(), 1);
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 2);
  assert.equal(harness.unsubscribeCount, 1, 'subscription should be released once the queue settles');
  assert.equal(harness.pushSettledListenerCount, 0);
  await Promise.resolve();

  harness.setMainPushInFlight(true);
  harness.coalescer.trigger('blocked-third');
  assert.equal(harness.subscribeCount, 2, 'coalescer should re-subscribe after reuse');
  assert.equal(harness.pushSettledListenerCount, 1);
  harness.coalescer.cancel();
  assert.equal(harness.unsubscribeCount, 2);
  assert.equal(harness.pushSettledListenerCount, 0);
});

test('cloud sync pull coalescer cancel clears stale pending reasons and counts before the next burst', async () => {
  const harness = createCoalescerHarness();

  harness.coalescer.trigger('stale-a');
  harness.coalescer.trigger('stale-b');
  harness.coalescer.cancel();

  harness.coalescer.trigger('fresh-a');
  harness.coalescer.trigger('fresh-b');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  const payload = harness.diags[0]?.[1] as { count?: number; reason?: string };
  assert.equal(payload.count, 2);
  assert.equal(payload.reason, 'fresh-a|fresh-b');
});

test('cloud sync pull coalescer rearms directly to the debounced due time after main-row push settles', async () => {
  const harness = createCoalescerHarness({ debounceMs: 50 });
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    harness.setMainPushInFlight(true);
    harness.coalescer.trigger('push-blocked');

    assert.equal(harness.timers.activeCount(), 0);
    assert.equal(harness.timers.setCount, 0);

    now = 1010;
    harness.setMainPushInFlight(false);
    harness.emitMainPushSettled();

    assert.deepEqual(harness.timers.activeDelays(), [40]);
    assert.equal(
      harness.timers.setCount,
      1,
      'push-settled resume should arm the final debounced timer directly instead of a throwaway immediate wakeup'
    );

    now = 1050;
    assert.equal(harness.timers.runNext(), true);
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(harness.runs.length, 1);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync pull coalescer keeps queued follow-up work on one canonical timer after an in-flight run settles', async () => {
  const deferred = createDeferredRun();
  const harness = createCoalescerHarness({ debounceMs: 50, run: () => deferred.promise });
  const originalNow = Date.now;
  let now = 1000;
  Date.now = () => now;

  try {
    harness.coalescer.trigger('first');
    assert.deepEqual(harness.timers.activeDelays(), [50]);
    now = 1050;
    assert.equal(harness.timers.runNext(), true);
    await Promise.resolve();
    assert.equal(harness.runs.length, 1);
    assert.equal(harness.timers.activeCount(), 0);

    now = 1060;
    harness.coalescer.trigger('queued-during-flight');
    assert.equal(
      harness.timers.activeCount(),
      0,
      'queued follow-up should stay parked while the run is still active'
    );

    deferred.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(harness.timers.activeDelays(), [50]);
    assert.equal(
      harness.timers.setCount,
      2,
      'the follow-up should arm one real debounced timer after the first run, not an immediate timer plus a retry timer'
    );

    now = 1110;
    assert.equal(harness.timers.runNext(), true);
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(harness.runs.length, 2);
  } finally {
    Date.now = originalNow;
  }
});

test('cloud sync pull coalescer reports synchronous run failures and recovers for later work', async () => {
  let shouldThrow = true;
  const harness = createCoalescerHarness({
    run: () => {
      if (shouldThrow) throw new Error('sync boom');
    },
  });

  harness.coalescer.trigger('sync-throw');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 1);
  assert.deepEqual(harness.errors, ['pullCoalescer.rt.run']);
  assert.equal(harness.timers.activeCount(), 0);

  shouldThrow = false;
  harness.coalescer.trigger('fresh-after-sync-throw');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 2, 'fresh work should run after a synchronous failure reset');
  assert.deepEqual(harness.errors, ['pullCoalescer.rt.run']);
  assert.equal(harness.timers.activeCount(), 0);
});

test('cloud sync pull coalescer drops queued work once the owner turns stale before the timer fires', async () => {
  const harness = createCoalescerHarness();

  harness.coalescer.trigger('stale-before-run');
  assert.equal(harness.timers.activeCount(), 1);

  harness.setDisposed(true);
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 0, 'stale owner should not execute the queued pull');
  assert.equal(harness.timers.activeCount(), 0, 'stale flush should drop the queued timer state');

  harness.coalescer.trigger('ignored-while-stale');
  assert.equal(harness.timers.activeCount(), 0, 'disposed owner should not arm new queued timers');
});

test('cloud sync pull coalescer drops queued follow-up work when owner becomes stale during an in-flight run', async () => {
  const deferred = createDeferredRun();
  const harness = createCoalescerHarness({ run: () => deferred.promise });

  harness.coalescer.trigger('first');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  assert.equal(harness.runs.length, 1);

  harness.coalescer.trigger('queued-during-flight');
  assert.equal(harness.timers.activeCount(), 0);

  harness.setDisposed(true);
  deferred.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 1, 'disposed owner must not run queued follow-up work');
  assert.equal(harness.timers.activeCount(), 0, 'disposed owner must not arm a stale follow-up timer');

  harness.setDisposed(false);
  harness.coalescer.trigger('fresh-after-dispose-reset');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 2, 'fresh work should start from a clean queue after stale reset');
  assert.equal(
    harness.diags.some(entry => (entry as unknown[])[1]?.reason === 'queued-during-flight'),
    false,
    'stale in-flight follow-up reason must not leak into later diagnostics'
  );
});

test('cloud sync pull coalescer drops queued follow-up work when suppression starts during an in-flight run', async () => {
  const deferred = createDeferredRun();
  const harness = createCoalescerHarness({ run: () => deferred.promise });

  harness.coalescer.trigger('first');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  assert.equal(harness.runs.length, 1);

  harness.coalescer.trigger('queued-during-flight');
  harness.setSuppressed(true);
  deferred.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 1, 'suppressed owner must not run queued follow-up work');
  assert.equal(harness.timers.activeCount(), 0, 'suppressed owner must not arm a stale follow-up timer');

  harness.setSuppressed(false);
  harness.coalescer.trigger('fresh-after-suppression-reset');
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 2);
  assert.equal(
    harness.diags.some(entry => (entry as unknown[])[1]?.reason === 'queued-during-flight'),
    false,
    'suppressed in-flight follow-up reason must not leak into later diagnostics'
  );
});

test('cloud sync pull coalescer clears inFlight immediately on synchronous run throws so a same-tick retrigger is accepted', async () => {
  let shouldThrow = true;
  const harness = createCoalescerHarness({
    run: () => {
      if (shouldThrow) throw new Error('sync immediate boom');
    },
  });

  harness.coalescer.trigger('sync-first');
  assert.equal(harness.timers.runNext(), true);

  harness.coalescer.trigger('sync-second-same-tick');
  assert.equal(
    harness.timers.activeCount(),
    1,
    'same-tick retrigger should be queued after sync throw recovery'
  );

  shouldThrow = false;
  assert.equal(harness.timers.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(harness.runs.length, 2);
  assert.equal(
    harness.errors.filter(op => op === 'pullCoalescer.rt.run').length,
    1,
    'sync throw should still be reported exactly once'
  );
});
