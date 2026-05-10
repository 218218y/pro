import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBuildDebugBudget,
  getBuildDebugStats,
  installBuilderScheduler,
  requestBuild,
} from '../esm/native/builder/scheduler.ts';

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

test('builder scheduler runtime: install surface exposes runtime stats/reset hooks and compat scheduler state', () => {
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
  assert.equal(stats.skippedSatisfiedRequestCount, 1);
  assert.equal(stats.skippedRepeatedExecuteCount, 0);
  assert.equal(stats.reasons['autosave-force']?.executeCount, 1);
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
  assert.equal(stats.skippedRepeatedExecuteCount, 1);
  assert.equal(stats.reasons['pointer:move:force']?.executeImmediateCount, 1);
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

test('builder scheduler runtime: fallback timer stale callbacks are ignored after a newer debounced schedule replaces them', () => {
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
