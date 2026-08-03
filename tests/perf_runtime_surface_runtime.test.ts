import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPerfEntryOptionsFromActionResult,
  clearPerfEntries,
  createPerfConsoleSurface,
  endPerfSpan,
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getPerfEntries,
  getPerfSummary,
  getPerfStateFingerprint,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  getRuntimeErrorHistory,
  getStoreDebugStats,
  isNonErrorPerfResultReason,
  installPerfRuntimeSurface,
  markPerfPoint,
  markPerfRenderSettle,
  runPerfAction,
  runPerfInteractionWait,
  runPerfPhase,
  runWithPerfSpan,
  startPerfSpan,
} from '../esm/native/runtime/perf_runtime_surface.ts';

test('perf runtime surface records marks, spans, summaries, and errors', async () => {
  const prevCustomEvent = globalThis.CustomEvent;
  globalThis.CustomEvent = class CustomEvent<T = unknown> extends Event {
    detail: T;
    constructor(type: string, init?: CustomEventInit<T>) {
      super(type);
      this.detail = (init?.detail ?? null) as T;
    }
  } as typeof CustomEvent;
  const app = {
    deps: { config: {} },
    services: {
      errors: {
        getHistory: () => [
          {
            ts: '2026-05-10T00:00:00.000Z',
            kind: 'report',
            ctx: { where: 'unit/perf', op: 'ownerRejected', fatal: false },
            err: { name: 'Error', message: 'owner rejected', stack: '' },
          },
        ],
      },
    },
    store: {
      getState() {
        return {
          ui: {
            projectName: 'Browser Perf Project',
            doorStyle: 'profile',
            groovesEnabled: true,
            splitDoors: true,
            removeDoorsEnabled: true,
            internalDrawersEnabled: true,
          },
          config: {
            savedColors: [
              { id: 'saved-1', value: '#ABCDEF' },
              { id: 'saved-2', value: '#123456' },
            ],
            wardrobeType: 'hinged',
            boardMaterial: 'sandwich',
            grooveLinesCount: 12,
            groovesMap: { groove_d1_full: true, groove_d2_full: true, empty: false },
            grooveLinesCountMap: { d1_full: 12, d2_full: 8 },
            splitDoorsMap: { split_d1: true, split_d2: true },
            splitDoorsBottomMap: { splitb_d1: true },
            removedDoorsMap: { removed_d3_full: true, removed_d4_full: true },
            roundedFrameSideShelvesMap: { body_left: true },
            drawerDividersMap: { 'div:int_4': true, 'div:ext_2': true },
            doorTrimMap: {
              d1_full: [{ axis: 'vertical', sizeCm: 12 }],
              d2_full: [{ axis: 'horizontal', sizeCm: 9 }],
            },
            modulesConfiguration: [
              {
                extDrawersCount: 3,
                sketchExtras: { drawers: [{ id: 'sid-1' }, { id: 'sid-2' }, { id: 'sid-3' }] },
              },
              { extDrawersCount: 0 },
            ],
            stackSplitLowerModulesConfiguration: [
              { extDrawersCount: 1, sketchExtras: { drawers: [{ id: 'sid-lower-1' }] } },
            ],
          },
          runtime: {},
          mode: {},
          meta: { version: 1, updatedAt: 1, dirty: false },
        };
      },
    },
    browser: {
      window: {
        dispatchEvent() {
          return true;
        },
      },
    },
  } as any;

  const mark = markPerfPoint(app, 'boot.mark');
  assert.equal(mark.name, 'boot.mark');
  assert.equal(mark.status, 'mark');

  const spanId = startPerfSpan(app, 'project.load');
  const ended = endPerfSpan(app, spanId);
  assert.equal(ended?.name, 'project.load');
  assert.equal(ended?.status, 'ok');
  assert.equal(ended?.kind, 'action');
  assert.equal(typeof ended?.uxTotalMs, 'number');
  assert.equal(typeof ended?.codeExecutionMs, 'number');
  assert.equal(ended?.interactionWaitMs, 0);

  await runWithPerfSpan(app, 'cloudSync.floatingSync.toggle', async () => true);
  await assert.rejects(async () => {
    await runWithPerfSpan(app, 'project.save', async () => {
      throw new Error('boom');
    });
  }, /boom/);

  const pendingResult = await runPerfAction(
    app,
    'project.restoreLastSession',
    async () => ({ ok: true, pending: true }),
    {
      detail: { source: 'test' },
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    }
  );
  assert.deepEqual(pendingResult, { ok: true, pending: true });

  const failedResult = await runPerfAction(
    app,
    'project.load.invalid',
    async () => ({ ok: false, reason: 'invalid', message: 'bad project file' }),
    {
      detail: { source: 'fixture' },
      resolveEndOptions: result => buildPerfEntryOptionsFromActionResult(result),
    }
  );
  assert.deepEqual(failedResult, { ok: false, reason: 'invalid', message: 'bad project file' });

  const summary = getPerfSummary(app);
  assert.ok(summary['project.load']);
  assert.ok(summary['project.save']);
  assert.ok(summary['cloudSync.floatingSync.toggle']);
  assert.ok(summary['project.restoreLastSession']);
  assert.ok(summary['project.load.invalid']);
  assert.ok(summary['project.save'].count >= 1);
  assert.ok(summary['project.save'].codeExecutionMaxMs >= 0);
  assert.ok(summary['project.save'].uxMaxMs >= summary['project.save'].codeExecutionMaxMs);
  assert.equal(summary['project.save'].errorCount, 1);
  assert.equal(summary['project.save'].lastStatus, 'error');
  assert.match(String(summary['project.save'].lastError || ''), /boom/);
  assert.equal(summary['project.load.invalid'].errorCount, 1);
  assert.equal(summary['project.restoreLastSession'].errorCount, 0);
  assert.equal(summary['boot.mark'].markCount, 1);

  const entries = getPerfEntries(app);
  assert.ok(entries.length >= 6);
  assert.ok(entries.some(entry => entry.name === 'project.save' && entry.status === 'error'));
  const invalidLoadEntry = entries.find(entry => entry.name === 'project.load.invalid');
  assert.equal(invalidLoadEntry?.status, 'error');
  assert.deepEqual(invalidLoadEntry?.detail, {
    source: 'fixture',
    reason: 'invalid',
    message: 'bad project file',
  });

  const surface = createPerfConsoleSurface(app);
  assert.equal(typeof surface.start, 'function');
  assert.equal(typeof surface.getSummary, 'function');
  assert.equal(typeof surface.getBrowserMetrics, 'function');
  assert.equal(typeof surface.getStateFingerprint, 'function');
  assert.equal(typeof surface.getStoreDebugStats, 'function');
  assert.equal(typeof surface.getErrorHistory, 'function');
  assert.equal(typeof surface.getBuildDebugStats, 'function');
  assert.equal(typeof surface.getBuildDebugBudget, 'function');
  assert.equal(typeof surface.getRenderDebugStats, 'function');
  assert.equal(typeof surface.getRenderDebugBudget, 'function');
  const storeDebug = getStoreDebugStats(app);
  assert.equal(storeDebug, null);
  assert.equal(surface.getStoreDebugStats?.(), null);
  assert.deepEqual(getPerfStateFingerprint(app), {
    projectName: 'Browser Perf Project',
    savedColorCount: 2,
    savedColorValues: ['#123456', '#abcdef'],
    wardrobeType: 'hinged',
    boardMaterial: 'sandwich',
    doorStyle: 'profile',
    groovesEnabled: true,
    grooveLinesCount: 12,
    splitDoors: true,
    removeDoorsEnabled: true,
    internalDrawersEnabled: true,
    groovesMapCount: 2,
    grooveLinesCountMapCount: 2,
    splitDoorMapCount: 2,
    splitDoorBottomMapCount: 1,
    removedDoorMapCount: 2,
    roundedFrameSideShelfCount: 1,
    doorTrimCount: 2,
    drawerDividerCount: 2,
    internalDrawerPlacementCount: 4,
    externalDrawerSelectionCount: 4,
  });
  assert.deepEqual(surface.getStateFingerprint?.(), getPerfStateFingerprint(app));
  assert.equal(getRuntimeErrorHistory(app).length, 1);
  assert.deepEqual(surface.getErrorHistory?.(), getRuntimeErrorHistory(app));
  const buildDebug = getBuildRuntimeDebugStats(app);
  const buildBudget = getBuildRuntimeDebugBudget(app);
  assert.ok(buildDebug && typeof buildDebug === 'object');
  assert.ok(buildBudget && typeof buildBudget === 'object');
  assert.ok((buildDebug.requestCount || 0) >= 0);
  assert.ok((buildBudget.requestCount || 0) >= 0);
  assert.deepEqual(surface.getBuildDebugStats?.(), buildDebug);
  assert.deepEqual(surface.getBuildDebugBudget?.(), buildBudget);
  assert.equal(getRenderRuntimeDebugStats(app), null);
  assert.equal(getRenderRuntimeDebugBudget(app), null);
  assert.equal(surface.getRenderDebugStats?.(), null);
  assert.equal(surface.getRenderDebugBudget?.(), null);
  surface.clear();
  assert.equal(getPerfEntries(app).length, 0);
  clearPerfEntries(app);
  assert.equal(getPerfEntries(app).length, 0);
  globalThis.CustomEvent = prevCustomEvent;
});

test('perf runtime surface classifies non-error action results as marks and keeps real failures as errors', async () => {
  assert.equal(isNonErrorPerfResultReason('busy'), true);
  assert.equal(isNonErrorPerfResultReason('cancelled'), true);
  assert.equal(isNonErrorPerfResultReason('missing-file'), true);
  assert.equal(isNonErrorPerfResultReason('missing-autosave'), true);
  assert.equal(isNonErrorPerfResultReason('invalid'), false);

  assert.deepEqual(buildPerfEntryOptionsFromActionResult({ ok: false, reason: 'busy' }), {
    status: 'mark',
    detail: {
      reason: 'busy',
      outcome: 'non-error',
    },
  });

  assert.deepEqual(
    buildPerfEntryOptionsFromActionResult({ ok: false, reason: 'cancelled', message: 'user cancelled' }),
    {
      status: 'mark',
      detail: {
        reason: 'cancelled',
        message: 'user cancelled',
        outcome: 'non-error',
      },
    }
  );

  assert.deepEqual(buildPerfEntryOptionsFromActionResult({ ok: false, reason: 'missing-autosave' }), {
    status: 'mark',
    detail: {
      reason: 'missing-autosave',
      outcome: 'non-error',
    },
  });

  assert.deepEqual(buildPerfEntryOptionsFromActionResult({ ok: false, reason: 'invalid' }), {
    status: 'error',
    detail: {
      reason: 'invalid',
    },
    error: 'invalid',
  });

  assert.deepEqual(
    buildPerfEntryOptionsFromActionResult({
      ok: false,
      reason: 'busy',
      perfStatus: 'error',
      perfError: 'forced error',
    }),
    {
      status: 'error',
      detail: {
        reason: 'busy',
      },
      error: 'forced error',
    }
  );

  assert.deepEqual(buildPerfEntryOptionsFromActionResult({ perfStatus: 'mark', message: 'note only' }), {
    status: 'mark',
    detail: {
      message: 'note only',
    },
  });

  assert.deepEqual(
    buildPerfEntryOptionsFromActionResult({
      ok: true,
      warnings: [
        { effect: 'build', message: 'build failed' },
        { effect: 'autosave-refresh', message: 'autosave failed' },
      ],
    }),
    {
      detail: {
        warningCount: 2,
        warningEffects: ['build', 'autosave-refresh'],
      },
    }
  );
});

test('perf runtime separates interaction wait from code phases and records render settle', async () => {
  let rafCount = 0;
  const app = {
    deps: {
      config: {},
      browser: {
        requestAnimationFrame(callback: FrameRequestCallback) {
          rafCount += 1;
          callback(rafCount * 16);
          return rafCount;
        },
        setTimeout(callback: () => void) {
          callback();
          return 1;
        },
      },
    },
    services: {},
  } as any;

  await runPerfAction(app, 'settingsBackup.import', async () => {
    await runPerfInteractionWait(app, 'settingsBackup.import.confirm', async () => {
      await new Promise(resolve => setTimeout(resolve, 8));
      return true;
    });
    return runPerfPhase(app, 'settingsBackup.import.parse', 'parse', () => JSON.parse('{"ok":true}'));
  });

  const action = getPerfEntries(app, 'settingsBackup.import').at(-1);
  const wait = getPerfEntries(app, 'settingsBackup.import.confirm').at(-1);
  const phase = getPerfEntries(app, 'settingsBackup.import.parse').at(-1);
  assert.equal(action?.kind, 'action');
  assert.equal(wait?.kind, 'interaction-wait');
  assert.equal(wait?.codeExecutionMs, 0);
  assert.ok((wait?.interactionWaitMs || 0) > 0);
  assert.equal(phase?.kind, 'phase');
  assert.equal(phase?.phase, 'parse');
  assert.equal(phase?.interactionWaitMs, 0);
  assert.equal(phase?.codeExecutionMs, phase?.uxTotalMs);
  assert.ok((action?.interactionWaitMs || 0) > 0);
  assert.ok((action?.codeExecutionMs || 0) < (action?.uxTotalMs || 0));

  const settled = await markPerfRenderSettle(app, 'build', { reason: 'unit-test' });
  assert.equal(settled?.kind, 'render-settle');
  assert.equal(settled?.codeExecutionMs, 0);
  assert.equal(rafCount, 2);
  assert.equal(createPerfConsoleSurface(app).getBrowserMetrics().renderSettle.count, 1);

  await runPerfAction(app, 'viewer.image.change', async () => true);
  await new Promise(resolve => setTimeout(resolve, 0));
  const viewerSettles = getPerfEntries(app, 'render.settle').filter(
    entry => (entry.detail as { reason?: string } | undefined)?.reason === 'viewer.image.change'
  );
  assert.equal(viewerSettles.length, 1);
  assert.equal(createPerfConsoleSurface(app).getBrowserMetrics().renderSettle.count, 2);
});

test('perf render settle does not borrow host timeout queues when animation frames are unavailable', async () => {
  let timeoutCount = 0;
  const app = {
    deps: {
      config: {},
      browser: {
        setTimeout() {
          timeoutCount += 1;
          return 1;
        },
      },
    },
    services: {},
  } as any;

  const settled = await markPerfRenderSettle(app, 'build', { reason: 'no-frame-runtime' });

  assert.equal(settled?.kind, 'render-settle');
  assert.equal(timeoutCount, 0);
});

test('perf runtime attributes only the overlapping portion of an early interaction wait', () => {
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  let now = 0;
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => now },
  });
  try {
    const app = { deps: { config: {} }, services: {} } as any;
    const waitId = startPerfSpan(app, 'project.save.prompt', { kind: 'interaction-wait' });
    now = 50;
    const actionId = startPerfSpan(app, 'project.save');
    now = 80;
    const wait = endPerfSpan(app, waitId);
    now = 100;
    const action = endPerfSpan(app, actionId);

    assert.equal(wait?.parentId, action?.id);
    assert.equal(wait?.interactionWaitMs, 80);
    assert.equal(action?.uxTotalMs, 50);
    assert.equal(action?.interactionWaitMs, 30);
    assert.equal(action?.codeExecutionMs, 20);
  } finally {
    if (originalPerformance) Object.defineProperty(globalThis, 'performance', originalPerformance);
    else Reflect.deleteProperty(globalThis, 'performance');
  }
});

test('perf runtime unions overlapping interaction waits before subtracting code time', () => {
  const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');
  let now = 0;
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: { now: () => now },
  });
  try {
    const app = { deps: { config: {} }, services: {} } as any;
    const actionId = startPerfSpan(app, 'design.savedColor.add');
    now = 10;
    const firstWaitId = startPerfSpan(app, 'design.savedColor.add.prompt', { kind: 'interaction-wait' });
    now = 30;
    const secondWaitId = startPerfSpan(app, 'design.savedColor.add.confirm', {
      kind: 'interaction-wait',
    });
    now = 50;
    endPerfSpan(app, firstWaitId);
    now = 70;
    endPerfSpan(app, secondWaitId);
    now = 100;
    const action = endPerfSpan(app, actionId);

    assert.equal(action?.uxTotalMs, 100);
    assert.equal(action?.interactionWaitMs, 60);
    assert.equal(action?.codeExecutionMs, 40);
  } finally {
    if (originalPerformance) Object.defineProperty(globalThis, 'performance', originalPerformance);
    else Reflect.deleteProperty(globalThis, 'performance');
  }
});

test('perf runtime observes CLS, LCP, and Long Tasks through PerformanceObserver', () => {
  type ObserverCallback = (list: { getEntries: () => PerformanceEntry[] }) => void;
  class FakePerformanceObserver {
    static supportedEntryTypes = ['layout-shift', 'largest-contentful-paint', 'longtask'];
    static observers: FakePerformanceObserver[] = [];
    callback: ObserverCallback;
    type = '';

    constructor(callback: ObserverCallback) {
      this.callback = callback;
      FakePerformanceObserver.observers.push(this);
    }

    observe(options: PerformanceObserverInit) {
      this.type = String(options.type || options.entryTypes?.[0] || '');
    }

    disconnect() {}

    static emit(type: string, entries: PerformanceEntry[]) {
      for (const observer of FakePerformanceObserver.observers.filter(item => item.type === type)) {
        observer.callback({ getEntries: () => entries });
      }
    }
  }

  const app = { deps: { config: {} }, services: {} } as any;
  const win = { PerformanceObserver: FakePerformanceObserver } as unknown as Window;
  const surface = installPerfRuntimeSurface(app, win);
  assert.ok(surface);

  FakePerformanceObserver.emit('layout-shift', [
    { entryType: 'layout-shift', name: '', startTime: 100, duration: 0, value: 0.04 } as any,
    { entryType: 'layout-shift', name: '', startTime: 500, duration: 0, value: 0.03 } as any,
    {
      entryType: 'layout-shift',
      name: '',
      startTime: 700,
      duration: 0,
      value: 0.5,
      hadRecentInput: true,
    } as any,
  ]);
  FakePerformanceObserver.emit('largest-contentful-paint', [
    {
      entryType: 'largest-contentful-paint',
      name: '',
      startTime: 1200,
      duration: 0,
      renderTime: 1200,
      size: 42,
    } as any,
  ]);
  FakePerformanceObserver.emit('longtask', [
    { entryType: 'longtask', name: 'self', startTime: 300, duration: 75 } as any,
    { entryType: 'longtask', name: 'self', startTime: 600, duration: 120 } as any,
  ]);

  const metrics = surface?.getBrowserMetrics();
  assert.equal(metrics?.observerSupported, true);
  assert.equal(metrics?.cls.value, 0.07);
  assert.equal(metrics?.cls.entryCount, 2);
  assert.equal(metrics?.lcp.valueMs, 1200);
  assert.equal(metrics?.longTasks.count, 2);
  assert.equal(metrics?.longTasks.totalMs, 195);
  assert.equal(metrics?.longTasks.p95Ms, 120);
  assert.equal(getPerfEntries(app, 'browser.cls').at(-1)?.kind, 'browser-metric');
  assert.equal(getPerfEntries(app, 'browser.longTask').length, 2);
});
