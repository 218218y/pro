import test from 'node:test';
import assert from 'node:assert/strict';

import { summarizeBuildDebugBudget } from '../esm/native/builder/scheduler_debug_stats_budget.ts';
import { makeDebouncedBuild } from '../esm/native/builder/scheduler_shared_timers.ts';
import { ensureSchedulerState } from '../esm/native/builder/scheduler_shared_state.ts';

test('scheduler timer version reader does not coerce string versions into stale runtime versions', () => {
  const queued: Array<() => void> = [];
  const App: any = {
    services: { builder: {} },
    deps: {
      browser: {
        setTimeout(fn: () => void) {
          queued.push(fn);
          return queued.length;
        },
        clearTimeout() {},
      },
    },
  };
  const state = ensureSchedulerState(App);
  state.debouncedRunScheduled = true;
  state.debouncedRunVersion = 0;

  const calls: string[] = [];
  let staleCount = 0;
  const run = makeDebouncedBuild(App, reason => calls.push(reason), {
    readScheduledVersion: (() => '2') as unknown as () => number,
    onStaleTimerFire: () => {
      staleCount += 1;
    },
  });

  run();
  assert.equal(queued.length, 1);
  queued[0]?.();

  assert.deepEqual(calls, ['debounced']);
  assert.equal(staleCount, 0);
});

test('scheduler budget ratio rounds without string round-trip coercion', () => {
  const summary = summarizeBuildDebugBudget({
    requestCount: 3,
    executeCount: 1,
    skippedDuplicatePendingRequestCount: 1,
    skippedSatisfiedRequestCount: 0,
    skippedRepeatedExecuteCount: 0,
    debouncedScheduleCount: 2,
    reusedDebouncedScheduleCount: 1,
    builderWaitScheduleCount: 0,
    staleDebouncedTimerFireCount: 0,
    staleBuilderWaitWakeupCount: 0,
    reasons: {},
  });

  assert.equal(summary.duplicatePendingRate, 0.3333);
  assert.equal(summary.debouncedScheduleReuseRate, 0.3333);
});
