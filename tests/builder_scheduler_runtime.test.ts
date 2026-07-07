import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getSchedulerState,
  getBuildDebugBudget,
  getBuildDebugStats,
  installBuilderScheduler,
  requestBuild,
} from '../esm/native/builder/scheduler.ts';
import {
  isBuildDebugStatsEnabled,
  MAX_BUILD_DURATION_SAMPLES,
  recordBuildExecuteDuration,
} from '../esm/native/builder/scheduler_debug_stats.ts';

type BuildFlagGlobals = typeof globalThis & {
  __WP_BUILD_CLIENT__?: boolean;
  __WP_BUILD_PERF__?: boolean;
  __WP_BUILD_DEBUG__?: boolean;
};

type BuildFlagPatch = {
  client?: boolean;
  perf?: boolean;
  debug?: boolean;
};

function setOptionalBuildFlag(
  target: BuildFlagGlobals,
  key: '__WP_BUILD_CLIENT__' | '__WP_BUILD_PERF__' | '__WP_BUILD_DEBUG__',
  value: boolean | undefined
): void {
  if (typeof value === 'boolean') {
    target[key] = value;
    return;
  }
  delete target[key];
}

function withBuildFlags<T>(flags: BuildFlagPatch, run: () => T): T {
  const target = globalThis as BuildFlagGlobals;
  const previous = {
    client: target.__WP_BUILD_CLIENT__,
    perf: target.__WP_BUILD_PERF__,
    debug: target.__WP_BUILD_DEBUG__,
  };

  setOptionalBuildFlag(target, '__WP_BUILD_CLIENT__', flags.client);
  setOptionalBuildFlag(target, '__WP_BUILD_PERF__', flags.perf);
  setOptionalBuildFlag(target, '__WP_BUILD_DEBUG__', flags.debug);

  try {
    return run();
  } finally {
    setOptionalBuildFlag(target, '__WP_BUILD_CLIENT__', previous.client);
    setOptionalBuildFlag(target, '__WP_BUILD_PERF__', previous.perf);
    setOptionalBuildFlag(target, '__WP_BUILD_DEBUG__', previous.debug);
  }
}

function percentile(values: number[], pct: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * pct) - 1));
  return sorted[rank] || 0;
}

function createDebounceHarness() {
  let scheduled: (() => void) | null = null;
  let scheduleCount = 0;

  return {
    debounce(fn: () => void) {
      return () => {
        scheduleCount += 1;
        scheduled = fn;
      };
    },
    flush() {
      const next = scheduled;
      scheduled = null;
      if (typeof next === 'function') next();
    },
    getScheduleCount() {
      return scheduleCount;
    },
  };
}

function createTimerHarness() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  let setTimeoutCount = 0;
  let clearTimeoutCount = 0;

  return {
    setTimeout(fn: () => void) {
      const id = nextId++;
      setTimeoutCount += 1;
      callbacks.set(id, fn);
      return id;
    },
    clearTimeout(id: number | undefined) {
      clearTimeoutCount += 1;
      if (typeof id === 'number') callbacks.delete(id);
    },
    flushAll() {
      const pending = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, fn] of pending) fn();
    },
    getPendingCount() {
      return callbacks.size;
    },
    getSetTimeoutCount() {
      return setTimeoutCount;
    },
    getClearTimeoutCount() {
      return clearTimeoutCount;
    },
  };
}

function createLeakyTimerHarness() {
  let nextId = 1;
  const callbacks = new Map<number, () => void>();
  let setTimeoutCount = 0;
  let clearTimeoutCount = 0;

  return {
    setTimeout(fn: () => void) {
      const id = nextId++;
      setTimeoutCount += 1;
      callbacks.set(id, fn);
      return id;
    },
    clearTimeout(_id: number | undefined) {
      clearTimeoutCount += 1;
      // Intentionally leaky: keep the callback queued to simulate a stale wakeup.
    },
    flushAll() {
      const pending = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, fn] of pending) fn();
    },
    getPendingCount() {
      return callbacks.size;
    },
    getSetTimeoutCount() {
      return setTimeoutCount;
    },
    getClearTimeoutCount() {
      return clearTimeoutCount;
    },
  };
}

function createSchedulerHarness(initialSignature = 'sig:a') {
  const buildCalls: any[] = [];
  let signature = initialSignature;
  const debounceHarness = createDebounceHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  return {
    App,
    buildCalls,
    flush() {
      debounceHarness.flush();
    },
    getScheduleCount() {
      return debounceHarness.getScheduleCount();
    },
    setSignature(next: string) {
      signature = next;
    },
  };
}

test('builder scheduler runtime: install surface exposes runtime stats/reset hooks and public scheduler state', () => {
  const harness = createSchedulerHarness('sig:surface');
  const builder = harness.App.services.builder;

  assert.equal(typeof builder.getBuildDebugStats, 'function');
  assert.equal(typeof builder.resetBuildDebugStats, 'function');
  assert.equal(typeof builder.__scheduler?.getState, 'function');
  assert.equal(builder.__scheduler?.__esm_v1, true);

  requestBuild(harness.App, null, { reason: 'surface:request' });
  harness.flush();

  const stats = builder.getBuildDebugStats();
  assert.equal(stats.requestCount, 1);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.reasons['surface:request']?.executeCount, 1);

  const beforeReset = builder.resetBuildDebugStats();
  assert.equal(beforeReset.requestCount, 1);
  assert.equal(builder.getBuildDebugStats().requestCount, 0);
  assert.equal(builder.__scheduler.getState().waiting, false);
});

test('builder scheduler runtime: client build keeps debug stats no-op without creating scheduler stats', () => {
  withBuildFlags({ client: true, perf: false, debug: false }, () => {
    const harness = createSchedulerHarness('sig:client:no-stats');
    const state = harness.App.services.builder.__schedulerState;

    assert.equal(isBuildDebugStatsEnabled(), false);
    assert.equal(state.debugStats, undefined);

    requestBuild(harness.App, null, { reason: 'client:no-stats', immediate: true });

    assert.equal(harness.buildCalls.length, 1);
    assert.equal(state.debugStats, undefined);
    const summary = getSchedulerState(harness.App);
    assert.equal(Object.prototype.hasOwnProperty.call(summary, 'debugStats'), false);
    assert.deepEqual(summary.debugStats, undefined);

    const stats = getBuildDebugStats(harness.App);
    assert.equal(stats.requestCount, 0);
    assert.equal(stats.executeCount, 0);
    assert.equal(stats.executeSuccessCount, 0);
    assert.deepEqual(stats.executeDurationSamplesMs, []);
    assert.deepEqual(stats.reasons, {});
    assert.equal(state.debugStats, undefined);

    recordBuildExecuteDuration(state, 'client:direct-duration', true, true, 25, 'ok');
    assert.equal(state.debugStats, undefined);
    assert.deepEqual(getBuildDebugStats(harness.App).executeDurationSamplesMs, []);
  });
});

test('builder scheduler runtime: perf/debug build flags still record duration by reason and split', () => {
  withBuildFlags({ client: false, perf: true, debug: false }, () => {
    const harness = createSchedulerHarness('sig:perf:immediate');

    assert.equal(isBuildDebugStatsEnabled(), true);

    requestBuild(harness.App, null, { reason: 'perf:immediate', immediate: true });
    harness.setSignature('sig:perf:debounced-force');
    requestBuild(harness.App, null, { reason: 'perf:debounced-force', force: true });
    harness.flush();

    const stats = getBuildDebugStats(harness.App);
    assert.equal(stats.executeCount, 2);
    assert.equal(stats.executeSuccessCount, 2);
    assert.equal(stats.executeDurationSamplesMs.length, 2);
    assert.equal(stats.executeImmediateDurationSamplesMs.length, 1);
    assert.equal(stats.executeDebouncedDurationSamplesMs.length, 1);
    assert.equal(stats.executeForceDurationSamplesMs.length, 1);
    assert.equal(stats.executeNonForceDurationSamplesMs.length, 1);
    assert.equal(stats.reasons['perf:immediate']?.executeDurationSamplesMs.length, 1);
    assert.equal(stats.reasons['perf:debounced-force']?.executeDurationSamplesMs.length, 1);
    assert.equal(stats.reasons['perf:debounced-force']?.executeForceCount, 1);
  });
});

test('builder scheduler runtime: client build keeps scheduling suppression active without debug stats', () => {
  withBuildFlags({ client: true, perf: false, debug: false }, () => {
    const duplicatePending = createSchedulerHarness('sig:client:pending');
    requestBuild(duplicatePending.App, null, { reason: 'client:pending' });
    requestBuild(duplicatePending.App, null, { reason: 'client:pending' });
    assert.equal(duplicatePending.getScheduleCount(), 1);
    duplicatePending.flush();
    assert.equal(duplicatePending.buildCalls.length, 1);
    assert.equal(duplicatePending.App.services.builder.__schedulerState.debugStats, undefined);

    const satisfied = createSchedulerHarness('sig:client:satisfied');
    requestBuild(satisfied.App, null, { reason: 'client:satisfied' });
    satisfied.flush();
    requestBuild(satisfied.App, null, { reason: 'client:satisfied' });
    assert.equal(satisfied.getScheduleCount(), 1);
    assert.equal(satisfied.buildCalls.length, 1);
    assert.equal(satisfied.App.services.builder.__schedulerState.debugStats, undefined);

    const repeated = createSchedulerHarness('sig:client:repeated');
    requestBuild(repeated.App, null, { reason: 'client:repeated', immediate: true });
    requestBuild(repeated.App, null, { reason: 'client:repeated', immediate: true });
    assert.equal(repeated.buildCalls.length, 1);
    assert.equal(repeated.App.services.builder.__schedulerState.debugStats, undefined);

    requestBuild(repeated.App, null, { reason: 'client:repeated:force', immediate: true, force: true });
    assert.equal(repeated.buildCalls.length, 2);
    assert.equal(repeated.buildCalls[1]?.ui?.forceBuild, true);
    assert.equal(repeated.App.services.builder.__schedulerState.debugStats, undefined);

    const forcedRecovery = createSchedulerHarness('sig:client:forced-initial');
    requestBuild(forcedRecovery.App, null, { reason: 'client:forced', force: true });
    forcedRecovery.setSignature('sig:client:forced-latest');
    requestBuild(forcedRecovery.App, null, { reason: 'client:forced-latest' });
    forcedRecovery.flush();
    assert.equal(forcedRecovery.buildCalls.length, 1);
    assert.equal(forcedRecovery.buildCalls[0]?.build?.signature, 'sig:client:forced-latest');
    assert.equal(forcedRecovery.buildCalls[0]?.ui?.forceBuild, true);
    assert.equal(forcedRecovery.App.services.builder.__schedulerState.debugStats, undefined);
  });
});

test('builder scheduler runtime: legacy debug stats are normalized without dropping reason rows', () => {
  const harness = createSchedulerHarness('sig:legacy-stats');
  const state = harness.App.services.builder.__schedulerState;
  state.debugStats = {
    requestCount: 1,
    immediateRequestCount: 0,
    debouncedRequestCount: 1,
    forceRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    executeForceCount: 0,
    pendingOverwriteCount: 0,
    debouncedScheduleCount: 1,
    reusedDebouncedScheduleCount: 0,
    builderWaitScheduleCount: 0,
    staleDebouncedTimerFireCount: 0,
    staleBuilderWaitWakeupCount: 0,
    duplicatePendingSignatureCount: 0,
    skippedDuplicatePendingRequestCount: 0,
    skippedSatisfiedRequestCount: 0,
    repeatedExecuteCount: 0,
    skippedRepeatedExecuteCount: 0,
    lastRequestReason: 'legacy',
    lastExecuteReason: '',
    reasons: {
      legacy: {
        reason: 'legacy',
        requestCount: 1,
        immediateRequestCount: 0,
        debouncedRequestCount: 1,
        forceRequestCount: 0,
        executeCount: 0,
        executeImmediateCount: 0,
        executeDebouncedCount: 0,
        executeForceCount: 0,
        overwriteCount: 0,
        debouncedScheduleCount: 1,
        reusedDebouncedScheduleCount: 0,
        builderWaitScheduleCount: 0,
        staleDebouncedTimerFireCount: 0,
        staleBuilderWaitWakeupCount: 0,
        duplicatePendingSignatureCount: 0,
        skippedDuplicatePendingRequestCount: 0,
        skippedSatisfiedRequestCount: 0,
        repeatedExecuteCount: 0,
        skippedRepeatedExecuteCount: 0,
      },
    },
  } as any;

  let stats = getBuildDebugStats(harness.App);
  assert.equal(stats.debouncedNonForceRequestCount, 0);
  assert.equal(stats.executeDebouncedForceCount, 0);
  assert.equal(stats.executeDurationTotalMs, 0);
  assert.deepEqual(stats.executeDurationSamplesMs, []);
  assert.equal(stats.reasons.legacy?.requestCount, 1);
  assert.equal(stats.reasons.legacy?.debouncedNonForceRequestCount, 0);
  assert.equal(stats.reasons.legacy?.executeDurationTotalMs, 0);
  assert.deepEqual(stats.reasons.legacy?.executeDurationSamplesMs, []);

  requestBuild(harness.App, null, { reason: 'legacy:next' });
  stats = getBuildDebugStats(harness.App);

  assert.equal(stats.requestCount, 2);
  assert.equal(stats.debouncedNonForceRequestCount, 1);
  assert.equal(stats.reasons.legacy?.requestCount, 1);
  assert.equal(stats.reasons['legacy:next']?.debouncedNonForceRequestCount, 1);
});

test('builder scheduler runtime: build execute duration is recorded by reason and request split', () => {
  const harness = createSchedulerHarness('sig:timing:immediate');

  requestBuild(harness.App, null, { reason: 'timing:immediate', immediate: true });
  harness.setSignature('sig:timing:force');
  requestBuild(harness.App, null, { reason: 'timing:force', force: true });
  harness.flush();

  const stats = getBuildDebugStats(harness.App);
  assert.equal(stats.executeCount, 2);
  assert.equal(stats.executeSuccessCount, 2);
  assert.equal(stats.executeFailureCount, 0);
  assert.equal(stats.executeDurationSamplesMs.length, 2);
  assert.equal(stats.executeImmediateDurationSamplesMs.length, 1);
  assert.equal(stats.executeDebouncedDurationSamplesMs.length, 1);
  assert.equal(stats.executeForceDurationSamplesMs.length, 1);
  assert.equal(stats.executeNonForceDurationSamplesMs.length, 1);
  assert.equal(stats.lastExecuteStatus, 'ok');
  assert.equal(stats.reasons['timing:immediate']?.executeDurationSamplesMs.length, 1);
  assert.equal(stats.reasons['timing:force']?.executeDurationSamplesMs.length, 1);
  assert.equal(stats.reasons['timing:force']?.executeForceCount, 1);
});

test('builder scheduler runtime: build execute duration samples are capped to a bounded window', () => {
  const harness = createSchedulerHarness('sig:timing:cap');
  const state = harness.App.services.builder.__schedulerState;
  const sampleCount = MAX_BUILD_DURATION_SAMPLES + 20;

  for (let i = 0; i < sampleCount; i += 1) {
    recordBuildExecuteDuration(state, 'timing:cap', true, true, i, 'ok');
  }
  for (let i = 0; i < sampleCount; i += 1) {
    recordBuildExecuteDuration(state, 'timing:cap', false, false, 1000 + i, 'ok');
  }

  const stats = getBuildDebugStats(harness.App);
  const expectedWindow = Array.from(
    { length: MAX_BUILD_DURATION_SAMPLES },
    (_item, index) => 1000 + index + 20
  );
  const expectedFirstSplitWindow = Array.from(
    { length: MAX_BUILD_DURATION_SAMPLES },
    (_item, index) => index + 20
  );
  const expectedTotal = expectedWindow.reduce((sum, value) => sum + value, 0);

  assert.equal(stats.executeSuccessCount, sampleCount * 2);
  assert.equal(stats.executeDurationSamplesMs.length, MAX_BUILD_DURATION_SAMPLES);
  assert.deepEqual(stats.executeDurationSamplesMs, expectedWindow);
  assert.equal(stats.executeDurationTotalMs, expectedTotal);
  assert.equal(stats.executeDurationAvgMs, expectedTotal / MAX_BUILD_DURATION_SAMPLES);
  assert.equal(stats.executeDurationP95Ms, percentile(expectedWindow, 0.95));
  assert.equal(stats.executeDurationMaxMs, 1000 + sampleCount - 1);
  assert.equal(stats.reasons['timing:cap']?.executeDurationSamplesMs.length, MAX_BUILD_DURATION_SAMPLES);
  assert.equal(stats.executeImmediateDurationSamplesMs.length, MAX_BUILD_DURATION_SAMPLES);
  assert.deepEqual(stats.executeImmediateDurationSamplesMs, expectedFirstSplitWindow);
  assert.equal(stats.executeDebouncedDurationSamplesMs.length, MAX_BUILD_DURATION_SAMPLES);
  assert.deepEqual(stats.executeDebouncedDurationSamplesMs, expectedWindow);
  assert.equal(stats.executeForceDurationSamplesMs.length, MAX_BUILD_DURATION_SAMPLES);
  assert.deepEqual(stats.executeForceDurationSamplesMs, expectedFirstSplitWindow);
  assert.equal(stats.executeNonForceDurationSamplesMs.length, MAX_BUILD_DURATION_SAMPLES);
  assert.deepEqual(stats.executeNonForceDurationSamplesMs, expectedWindow);
});

test('builder scheduler runtime: failed build execute still records duration and status', () => {
  const reports: any[] = [];
  const App: any = {
    services: {
      platform: {
        reportError(err: unknown, ctx?: unknown) {
          reports.push({ err, ctx });
        },
      },
      builder: {
        buildWardrobe() {
          throw new Error('build exploded');
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature: 'sig:timing:error' },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature: 'sig:timing:error' },
      } as any;
    },
  });

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.doesNotThrow(() => requestBuild(App, null, { reason: 'timing:error', immediate: true }));
  } finally {
    console.error = originalConsoleError;
  }

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.executeSuccessCount, 0);
  assert.equal(stats.executeFailureCount, 1);
  assert.equal(stats.lastExecuteStatus, 'error');
  assert.equal(stats.executeDurationSamplesMs.length, 1);
  assert.equal(stats.reasons['timing:error']?.executeFailureCount, 1);
  assert.equal(stats.reasons['timing:error']?.lastExecuteStatus, 'error');
  assert.equal(stats.reasons['timing:error']?.executeDurationSamplesMs.length, 1);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.ctx?.where, 'builder/scheduler.requestBuild');
});

test('builder scheduler runtime: duplicate pending signature requests keep the original pending plan and avoid rescheduling churn', () => {
  const harness = createSchedulerHarness('sig:alpha');

  requestBuild(harness.App, null, { reason: 'typing' });
  requestBuild(harness.App, null, { reason: 'typing' });

  assert.equal(harness.getScheduleCount(), 1);
  harness.flush();
  assert.equal(harness.buildCalls.length, 1);

  const stats = getBuildDebugStats(harness.App);
  assert.equal(stats.requestCount, 2);
  assert.equal(stats.duplicatePendingSignatureCount, 1);
  assert.equal(stats.skippedDuplicatePendingRequestCount, 1);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.reasons.typing?.requestCount, 2);
  assert.equal(stats.reasons.typing?.skippedDuplicatePendingRequestCount, 1);
});

test('builder scheduler runtime: coalesced non-force requests with changed fingerprints execute only the latest pending build', () => {
  const harness = createSchedulerHarness('sig:width');

  requestBuild(harness.App, null, { reason: 'react:structure:width' });
  harness.setSignature('sig:height');
  requestBuild(harness.App, null, { reason: 'react:structure:height' });
  harness.setSignature('sig:depth');
  requestBuild(harness.App, null, { reason: 'react:structure:depth' });

  assert.equal(harness.buildCalls.length, 0);
  assert.equal(harness.getScheduleCount(), 3);

  harness.flush();

  assert.equal(harness.buildCalls.length, 1);
  assert.equal(harness.buildCalls[0]?.build?.signature, 'sig:depth');

  const stats = getBuildDebugStats(harness.App);
  assert.equal(stats.requestCount, 3);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.forceRequestCount, 0);
  assert.equal(stats.executeForceCount, 0);
  assert.equal(stats.pendingOverwriteCount, 2);
  assert.equal(stats.debouncedNonForceRequestCount, 3);
  assert.equal(stats.executeDebouncedNonForceCount, 1);
  assert.equal(stats.reasons['react:structure:depth']?.executeCount, 1);
});

test('builder scheduler runtime: a pending forced build is preserved when a newer non-force request supplies the latest state', () => {
  const harness = createSchedulerHarness('sig:recovery');

  requestBuild(harness.App, null, { reason: 'recompute:recovery', force: true });
  harness.setSignature('sig:latest-structure');
  requestBuild(harness.App, null, { reason: 'react:structure:width' });

  harness.flush();

  assert.equal(harness.buildCalls.length, 1);
  assert.equal(harness.buildCalls[0]?.build?.signature, 'sig:latest-structure');
  assert.equal(harness.buildCalls[0]?.ui?.forceBuild, true);

  const stats = getBuildDebugStats(harness.App);
  assert.equal(stats.requestCount, 2);
  assert.equal(stats.forceRequestCount, 1);
  assert.equal(stats.debouncedForceRequestCount, 1);
  assert.equal(stats.debouncedNonForceRequestCount, 1);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.executeForceCount, 1);
  assert.equal(stats.executeDebouncedForceCount, 1);
  assert.equal(stats.reasons['react:structure:width']?.forceRequestCount, 0);
  assert.equal(stats.reasons['react:structure:width']?.executeForceCount, 1);
});

test('builder scheduler runtime: fallback debounce keeps only one queued timer active for repeated non-immediate requests', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:fallback';
  const timers = createTimerHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    deps: {
      browser: {
        setTimeout: (fn: () => void, _ms?: number) => timers.setTimeout(fn),
        clearTimeout: (id: number | undefined) => timers.clearTimeout(id),
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'drag' });
  requestBuild(App, null, { reason: 'drag' });
  signature = 'sig:fallback:updated';
  requestBuild(App, null, { reason: 'drag' });

  assert.equal(timers.getPendingCount(), 1);
  assert.equal(timers.getSetTimeoutCount(), 2);
  assert.equal(timers.getClearTimeoutCount(), 1);

  timers.flushAll();

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:fallback:updated');
  assert.equal(timers.getPendingCount(), 0);
});

test('builder scheduler runtime: already-satisfied debounced requests are suppressed before rearming debounce churn', () => {
  const harness = createSchedulerHarness('sig:settled');

  requestBuild(harness.App, null, { reason: 'autosave:settled' });
  harness.flush();
  assert.equal(harness.buildCalls.length, 1);
  assert.equal(harness.getScheduleCount(), 1);

  requestBuild(harness.App, null, { reason: 'autosave:settled' });

  assert.equal(harness.getScheduleCount(), 1, 'already-satisfied request should not rearm debounce');
  assert.equal(harness.buildCalls.length, 1);

  const stats = getBuildDebugStats(harness.App);
  assert.equal(stats.requestCount, 2);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.debouncedScheduleCount, 1);
  assert.equal(stats.skippedSatisfiedRequestCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons['autosave:settled']?.skippedSatisfiedRequestCount, 1);

  const budget = getBuildDebugBudget(harness.App);
  assert.equal(budget.requestCount, 2);
  assert.equal(budget.executeCount, 1);
  assert.equal(budget.suppressedRequestCount, 1);
  assert.equal(budget.suppressedExecuteCount, 0);
  assert.equal(budget.noOpRequestRate, 0.5);
  assert.equal(budget.noOpExecuteRate, 0);
});

test('builder scheduler runtime: repeated settled debounced requests are skipped before execute, while forced builds still bypass the dedupe gate', () => {
  const harness = createSchedulerHarness('sig:stable');

  requestBuild(harness.App, null, { reason: 'autosave' });
  harness.flush();
  assert.equal(harness.buildCalls.length, 1);

  requestBuild(harness.App, null, { reason: 'autosave' });
  harness.flush();
  assert.equal(harness.buildCalls.length, 1);

  let stats = getBuildDebugStats(harness.App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.skippedSatisfiedRequestCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons.autosave?.skippedSatisfiedRequestCount, 1);

  requestBuild(harness.App, null, { reason: 'autosave-force', force: true });
  harness.flush();
  assert.equal(harness.buildCalls.length, 2);
  assert.equal(harness.buildCalls[1]?.ui?.forceBuild, true);

  stats = getBuildDebugStats(harness.App);
  assert.equal(stats.executeCount, 2);
  assert.equal(stats.forceRequestCount, 1);
  assert.equal(stats.executeForceCount, 1);
  assert.equal(stats.skippedSatisfiedRequestCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons['autosave-force']?.executeCount, 1);
  assert.equal(stats.reasons['autosave-force']?.forceRequestCount, 1);
  assert.equal(stats.reasons['autosave-force']?.executeForceCount, 1);
});

test('builder scheduler runtime: settled structural config changes rebuild even when module signature is unchanged', () => {
  const buildCalls: any[] = [];
  let bodyColor = '#ffffff';
  const debounceHarness = createDebounceHarness();
  const readState = () => ({
    ui: { panel: 'demo' },
    config: { individualColors: { body: bodyColor } },
    runtime: {},
    mode: {},
    meta: {},
    build: { signature: 'sig:stable-structural-config' },
  });
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState: readState,
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState: readState,
  });

  requestBuild(App, null, { reason: 'color:first' });
  debounceHarness.flush();
  assert.equal(buildCalls.length, 1);

  bodyColor = '#111111';
  requestBuild(App, null, { reason: 'color:second' });
  debounceHarness.flush();

  assert.equal(buildCalls.length, 2);
  assert.equal(buildCalls[1]?.config?.individualColors?.body, '#111111');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.skippedSatisfiedRequestCount, 0);
  assert.equal(stats.reasons['color:second']?.executeCount, 1);
});

test('builder scheduler runtime: pending dedupe keeps active editor context distinct even when the build signature is unchanged', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:active';
  let activeId = 'width';
  const debounceHarness = createDebounceHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
    getActiveElementId() {
      return activeId;
    },
  });

  requestBuild(App, null, { reason: 'typing:active' });
  activeId = 'height';
  requestBuild(App, null, { reason: 'typing:active' });

  assert.equal(debounceHarness.getScheduleCount(), 2, 'changed active editor should rearm the pending build');
  debounceHarness.flush();

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.ui?.__activeId, 'height');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.duplicatePendingSignatureCount, 0);
  assert.equal(stats.skippedDuplicatePendingRequestCount, 0);
  assert.equal(stats.pendingOverwriteCount, 1);
});

test('builder scheduler runtime: repeated execute dedupe does not suppress rebuilds when the transient active editor changes', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:active-exec';
  let activeId = 'width';
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
    getActiveElementId() {
      return activeId;
    },
  });

  requestBuild(App, null, { reason: 'sanitize:width', immediate: true });
  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.ui?.__activeId, 'width');

  activeId = 'height';
  requestBuild(App, null, { reason: 'sanitize:height', immediate: true });
  assert.equal(buildCalls.length, 2);
  assert.equal(buildCalls[1]?.ui?.__activeId, 'height');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 2);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons['sanitize:height']?.executeImmediateCount, 1);
});

test('builder scheduler runtime: lifecycle boot-ready root is treated as canonical readiness for immediate requests', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:lifecycle-ready';
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    lifecycle: { bootReady: true },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'lifecycle-immediate', immediate: true });

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:lifecycle-ready');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.reasons['lifecycle-immediate']?.executeCount, 1);
});

test('builder scheduler runtime: repeated immediate non-forced execute signatures are skipped while forced immediate builds still run', () => {
  const harness = createSchedulerHarness('sig:instant');

  requestBuild(harness.App, null, { reason: 'pointer:move', immediate: true });
  assert.equal(harness.buildCalls.length, 1);

  requestBuild(harness.App, null, { reason: 'pointer:move', immediate: true });
  assert.equal(harness.buildCalls.length, 1);

  let stats = getBuildDebugStats(harness.App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.executeImmediateCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 1);
  assert.equal(stats.reasons['pointer:move']?.skippedRepeatedExecuteCount, 1);

  requestBuild(harness.App, null, { reason: 'pointer:move:force', immediate: true, force: true });
  assert.equal(harness.buildCalls.length, 2);
  assert.equal(harness.buildCalls[1]?.ui?.forceBuild, true);

  stats = getBuildDebugStats(harness.App);
  assert.equal(stats.executeCount, 2);
  assert.equal(stats.executeImmediateCount, 2);
  assert.equal(stats.forceRequestCount, 1);
  assert.equal(stats.executeForceCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 1);
  assert.equal(stats.reasons['pointer:move:force']?.executeImmediateCount, 1);
  assert.equal(stats.reasons['pointer:move:force']?.forceRequestCount, 1);
  assert.equal(stats.reasons['pointer:move:force']?.executeForceCount, 1);
});

test('builder scheduler runtime: reinstall keeps public scheduler method references stable while refreshing deps', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:first';
  const debounceA = createDebounceHarness();
  const debounceB = createDebounceHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceA.debounce(fn);
    },
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  const requestBuildRef = App.services.builder.requestBuild;
  const runPendingRef = App.services.builder._runPendingBuild;
  const getStatsRef = App.services.builder.getBuildDebugStats;
  const resetStatsRef = App.services.builder.resetBuildDebugStats;
  const getBudgetRef = App.services.builder.getBuildDebugBudget;
  const getPendingStateRef = App.services.builder.__scheduler.getPendingState;
  const getLastTsRef = App.services.builder.__scheduler.getLastTs;
  const flushRef = App.services.builder.__scheduler.flush;
  const isBuilderReadyRef = App.services.builder.__scheduler.isBuilderReady;
  const getStateRef = App.services.builder.__scheduler.getState;
  const debouncedBuildRef = App.services.builder.buildWardrobeDebounced;

  signature = 'sig:second';
  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceB.debounce(fn);
    },
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  assert.equal(App.services.builder.requestBuild, requestBuildRef);
  assert.equal(App.services.builder._runPendingBuild, runPendingRef);
  assert.equal(App.services.builder.getBuildDebugStats, getStatsRef);
  assert.equal(App.services.builder.resetBuildDebugStats, resetStatsRef);
  assert.equal(App.services.builder.getBuildDebugBudget, getBudgetRef);
  assert.equal(App.services.builder.__scheduler.getPendingState, getPendingStateRef);
  assert.equal(App.services.builder.__scheduler.getLastTs, getLastTsRef);
  assert.equal(App.services.builder.__scheduler.flush, flushRef);
  assert.equal(App.services.builder.__scheduler.isBuilderReady, isBuilderReadyRef);
  assert.equal(App.services.builder.__scheduler.getState, getStateRef);
  assert.equal(App.services.builder.buildWardrobeDebounced, debouncedBuildRef);

  requestBuild(App, null, { reason: 'reinstall:deps' });
  debounceA.flush();
  debounceB.flush();

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:second');
  assert.equal(getBuildDebugStats(App).reasons['reinstall:deps']?.executeCount, 1);
});

test('builder scheduler runtime: immediate requests during boot-not-ready do not execute early and coalesce into one queued retry', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:boot:initial';
  let bootReady = false;
  const debounceHarness = createDebounceHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return bootReady;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'boot:pointer', immediate: true });
  signature = 'sig:boot:latest';
  requestBuild(App, null, { reason: 'boot:pointer', immediate: true });

  assert.equal(buildCalls.length, 0);
  assert.equal(debounceHarness.getScheduleCount(), 1);

  bootReady = true;
  debounceHarness.flush();

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:boot:latest');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.requestCount, 2);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.executeImmediateCount, 1);
  assert.equal(stats.reasons['boot:pointer']?.requestCount, 2);
  assert.equal(stats.reasons['boot:pointer']?.executeImmediateCount, 1);
});

test('builder scheduler runtime: stale debounced callback after an immediate build does not re-read build state or schedule a suppressed follow-up execute', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:stale-immediate';
  let getBuildStateCalls = 0;
  const debounceHarness = createDebounceHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          getBuildStateCalls += 1;
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState() {
      getBuildStateCalls += 1;
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'typing:debounced' });
  assert.equal(getBuildStateCalls, 1, 'initial debounced request should capture one pending plan');

  requestBuild(App, null, { reason: 'typing:immediate', immediate: true });
  assert.equal(buildCalls.length, 1);
  assert.equal(getBuildStateCalls, 2, 'immediate request should only read build state once more');

  debounceHarness.flush();

  assert.equal(buildCalls.length, 1, 'stale debounced callback must not build again');
  assert.equal(
    getBuildStateCalls,
    2,
    'stale debounced callback must not even re-read build state after the immediate build consumed the pending work'
  );

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons['typing:immediate']?.executeImmediateCount, 1);
});

test('builder scheduler runtime: flush invalidates an older debounced callback so it cannot do a stale no-op replay', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:stale-flush';
  let getBuildStateCalls = 0;
  const debounceHarness = createDebounceHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          getBuildStateCalls += 1;
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState() {
      getBuildStateCalls += 1;
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'drag:debounced' });
  assert.equal(getBuildStateCalls, 1);

  const scheduler = App.services.builder.__scheduler;
  assert.equal(typeof scheduler?.flush, 'function');
  scheduler.flush();

  assert.equal(buildCalls.length, 1, 'flush should execute the pending build immediately');
  assert.equal(
    getBuildStateCalls,
    1,
    'flush should reuse the captured pending plan instead of re-reading state'
  );

  debounceHarness.flush();

  assert.equal(buildCalls.length, 1, 'older debounced callback must stay invalidated after flush');
  assert.equal(getBuildStateCalls, 1, 'older debounced callback must not re-read build state after flush');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons['drag:debounced']?.executeCount, 1);
});

test('builder scheduler runtime: timer deadline stale callbacks are ignored after a newer debounced schedule replaces them', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:leaky:one';
  const timers = createLeakyTimerHarness();
  const App: any = {
    services: {
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    actions: {
      builder: {
        getBuildState() {
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    deps: {
      browser: {
        setTimeout: (fn: () => void, _ms?: number) => timers.setTimeout(fn),
        clearTimeout: (id: number | undefined) => timers.clearTimeout(id),
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'drag:leaky' });
  signature = 'sig:leaky:two';
  requestBuild(App, null, { reason: 'drag:leaky' });

  assert.equal(timers.getPendingCount(), 2, 'leaky harness keeps both callbacks queued');
  timers.flushAll();

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:leaky:two');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.staleDebouncedTimerFireCount, 1);
  assert.equal(stats.reasons['drag:leaky']?.staleDebouncedTimerFireCount, 1);

  const budget = getBuildDebugBudget(App);
  assert.equal(budget.staleWakeupCount, 1);
});

test('builder scheduler runtime: stale builder-wait wakeups are ignored after an immediate build consumes the newer pending work', () => {
  const buildCalls: any[] = [];
  let signature = 'sig:wait:one';
  let getBuildStateCalls = 0;
  let builderReady = false;
  const timers = createLeakyTimerHarness();
  const App: any = {
    services: {
      builder: {},
    },
    actions: {
      builder: {
        getBuildState() {
          getBuildStateCalls += 1;
          return {
            ui: { panel: 'demo' },
            config: {},
            runtime: {},
            mode: {},
            meta: {},
            build: { signature },
          };
        },
      },
    },
    deps: {
      browser: {
        setTimeout: (fn: () => void, _ms?: number) => timers.setTimeout(fn),
        clearTimeout: (id: number | undefined) => timers.clearTimeout(id),
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      getBuildStateCalls += 1;
      return {
        ui: { panel: 'demo' },
        build: { signature },
      } as any;
    },
  });

  requestBuild(App, null, { reason: 'builder:wait', immediate: true });
  assert.equal(buildCalls.length, 0);
  assert.equal(getBuildStateCalls, 1);

  builderReady = true;
  App.services.builder.buildWardrobe = (state: unknown) => {
    buildCalls.push(state);
    return state;
  };
  signature = 'sig:wait:two';
  requestBuild(App, null, { reason: 'builder:wait', immediate: true });

  assert.equal(buildCalls.length, 1);
  assert.equal(getBuildStateCalls, 2);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:wait:two');

  timers.flushAll();

  assert.equal(buildCalls.length, 1, 'stale builder-ready wakeup must not re-run the build');
  assert.equal(getBuildStateCalls, 2, 'stale builder-ready wakeup must not even re-read state');

  const stats = getBuildDebugStats(App);
  assert.equal(stats.executeCount, 1);
  assert.equal(stats.builderWaitScheduleCount, 1);
  assert.equal(stats.staleBuilderWaitWakeupCount, 1);
  assert.equal(stats.reasons['builder:wait']?.staleBuilderWaitWakeupCount, 1);

  const budget = getBuildDebugBudget(App);
  assert.equal(budget.staleWakeupCount, 1);
});

test('builder scheduler runtime: request planning failures do not retry the same missing state seam when no pending plan exists', () => {
  const reports: any[] = [];
  const buildCalls: any[] = [];
  const App: any = {
    store: {
      getState() {
        throw new Error('root store state unavailable');
      },
    },
    services: {
      platform: {
        reportError(err: unknown, ctx?: unknown) {
          reports.push({ err, ctx });
        },
      },
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    getBuildState() {
      throw new Error('planned build state seam missing');
    },
  });

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.doesNotThrow(() => requestBuild(App, null, { reason: 'broken:state', immediate: true }));
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(buildCalls.length, 0);
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.ctx?.where, 'builder/scheduler.requestBuild');
});

test('builder scheduler runtime: request planning failure may recover only from an already staged pending plan', () => {
  const reports: any[] = [];
  const buildCalls: any[] = [];
  const debounceHarness = createDebounceHarness();
  let getBuildStateImpl = () => ({
    ui: { panel: 'demo' },
    config: {},
    runtime: {},
    mode: {},
    meta: {},
    build: { signature: 'sig:queued-before-planning-error' },
  });
  const App: any = {
    store: {
      getState() {
        throw new Error('root store state unavailable');
      },
    },
    services: {
      platform: {
        reportError(err: unknown, ctx?: unknown) {
          reports.push({ err, ctx });
        },
      },
      builder: {
        buildWardrobe(state: unknown) {
          buildCalls.push(state);
          return state;
        },
      },
    },
    boot: {
      isReady() {
        return true;
      },
    },
  };

  installBuilderScheduler(App, {
    debounce(fn: () => void) {
      return debounceHarness.debounce(fn);
    },
    getBuildState() {
      return getBuildStateImpl() as any;
    },
  });

  requestBuild(App, null, { reason: 'queued:before-error' });
  assert.equal(buildCalls.length, 0);
  assert.equal(debounceHarness.getScheduleCount(), 1);

  getBuildStateImpl = () => {
    throw new Error('new build state seam failed');
  };

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    assert.doesNotThrow(() => requestBuild(App, null, { reason: 'broken:state', immediate: true }));
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(buildCalls.length, 1);
  assert.equal(buildCalls[0]?.build?.signature, 'sig:queued-before-planning-error');
  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.ctx?.where, 'builder/scheduler.requestBuild');
});
