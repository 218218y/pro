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
  markPerfPoint,
  runPerfAction,
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
            grooveLinesCountMap: { groove_d1_full: 12, groove_d2_full: 8 },
            splitDoorsMap: { split_d1: true, split_d2: true },
            splitDoorsBottomMap: { splitb_d1: true },
            removedDoorsMap: { d3: true, d4: true },
            drawerDividersMap: { 'div:int_4': true, 'div:ext_2': true },
            doorTrimMap: {
              d1_full: [{ axis: 'vertical', sizeCm: 12 }],
              d2_full: [{ axis: 'horizontal', sizeCm: 9 }],
            },
            modulesConfiguration: [
              { intDrawersList: [2, 4], intDrawersSlot: 0, extDrawersCount: 3 },
              { intDrawersList: [], intDrawersSlot: 3, extDrawersCount: 0 },
            ],
            stackSplitLowerModulesConfiguration: [
              { intDrawersList: [1], intDrawersSlot: 0, extDrawersCount: 1 },
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
  assert.equal(typeof ended?.durationMs, 'number');

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
  assert.ok(summary['project.save'].maxMs >= 0);
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
});
