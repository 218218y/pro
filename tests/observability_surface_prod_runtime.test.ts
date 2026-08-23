import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  buildPerfEntryOptionsFromActionResult,
  createPerfConsoleSurface,
  endPerfSpan,
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getObservabilityBuildMode,
  getPerfEntries,
  getPerfSummary,
  getPerfStateFingerprint,
  getRuntimeErrorHistory,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  installDebugConsoleSurface,
  installObservabilityForBuild,
  installPerfRuntimeSurface,
  markPerfPoint,
  markPerfRenderSettle,
  recordPerfMetric,
  runPerfAction,
  runPerfInteractionWait,
  runPerfPhase,
  runWithPerfSpan,
  startPerfSpan,
} from '../esm/native/runtime/observability_surface_prod.ts';

test('prod observability surface stays no-op and preserves app actions', async () => {
  const app = { services: {} } as any;
  const win = {} as Window;

  assert.equal(getObservabilityBuildMode(), 'client');
  assert.equal(buildPerfEntryOptionsFromActionResult({ ok: false, reason: 'busy' }), undefined);

  const mark = markPerfPoint(app, 'project.save', { detail: { source: 'test' } });
  assert.equal(mark.id, 'noop');
  assert.equal(mark.name, 'project.save');
  assert.equal(mark.status, 'mark');
  assert.equal(mark.startTime, 0);
  assert.equal(mark.endTime, 0);
  assert.equal(mark.kind, 'mark');
  assert.equal(mark.uxTotalMs, 0);
  assert.equal(mark.codeExecutionMs, 0);
  assert.equal(mark.interactionWaitMs, 0);
  assert.deepEqual(mark.detail, { source: 'test' });

  const spanId = startPerfSpan(app, 'project.load');
  assert.equal(spanId, 'noop-span');
  assert.equal(endPerfSpan(app, spanId), null);

  const sync = runPerfAction(app, 'project.sync', () => ({ ok: true }));
  assert.deepEqual(sync, { ok: true });

  const asyncResult = await runPerfAction(app, 'project.async', async () => ({ ok: true, pending: true }));
  assert.deepEqual(asyncResult, { ok: true, pending: true });

  const promise = Promise.resolve({ ok: true, identity: true });
  assert.equal(
    runPerfAction(app, 'project.promiseIdentity', () => promise),
    promise
  );

  const wrapped = await runWithPerfSpan(app, 'project.wrap', async () => 42);
  assert.equal(wrapped, 42);
  assert.equal(
    runPerfPhase(app, 'project.wrap.parse', 'parse', () => 7),
    7
  );
  assert.equal(
    runPerfInteractionWait(app, 'project.wrap.confirm', () => true),
    true
  );
  assert.equal(await markPerfRenderSettle(app, 'project.wrap'), null);
  const metric = recordPerfMetric(app, 'browser.cls', 0.1, 'score');
  assert.equal(metric.kind, 'browser-metric');
  assert.equal(metric.metricValue, 0.1);

  const surface = createPerfConsoleSurface(app);
  assert.deepEqual(surface.getEntries(), []);
  assert.deepEqual(surface.getSummary(), {});
  assert.equal(surface.getBrowserMetrics().observerSupported, false);
  assert.equal(surface.end('noop-span'), null);
  assert.equal(surface.getStateFingerprint?.(), null);
  assert.equal(surface.getRendererInfoSnapshot?.(), null);
  assert.equal(surface.getSceneContentSnapshot?.(), null);
  assert.deepEqual(surface.getErrorHistory?.(), []);
  assert.equal(surface.getBuildDebugStats?.(), null);
  assert.equal(surface.getBuildDebugBudget?.(), null);
  assert.equal(surface.getRenderDebugStats?.(), null);
  assert.equal(surface.getRenderDebugBudget?.(), null);

  assert.deepEqual(getPerfEntries(app), []);
  assert.deepEqual(getPerfSummary(app), {});
  assert.equal(getPerfStateFingerprint(app), null);
  assert.deepEqual(getRuntimeErrorHistory(app), []);
  assert.equal(getBuildRuntimeDebugStats(app), null);
  assert.equal(getBuildRuntimeDebugBudget(app), null);
  assert.equal(getRenderRuntimeDebugStats(app), null);
  assert.equal(getRenderRuntimeDebugBudget(app), null);
  assert.equal(installPerfRuntimeSurface(app, win), null);
  assert.equal(installDebugConsoleSurface(app, win), null);
  assert.deepEqual(installObservabilityForBuild(app, win), { perf: null, debug: null });
});

test('prod observability source stays free of active timing probes', () => {
  const source = fs.readFileSync('esm/native/runtime/observability_surface_prod.ts', 'utf8');
  assert.doesNotMatch(source, /performance\.now\s*\(/);
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.doesNotMatch(source, /Math\.random\s*\(/);
  assert.doesNotMatch(source, /perf_runtime_surface|perf_runtime_core|debug_console_surface/);
});
