import test from 'node:test';
import assert from 'node:assert/strict';

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
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  installDebugConsoleSurface,
  installObservabilityForBuild,
  installPerfRuntimeSurface,
  markPerfPoint,
  runPerfAction,
  runWithPerfSpan,
  startPerfSpan,
} from '../esm/native/runtime/observability_surface_prod.ts';

test('prod observability surface stays no-op and preserves app actions', async () => {
  const app = { services: {} } as any;
  const win = {} as Window;

  assert.equal(getObservabilityBuildMode(), 'client');
  assert.equal(buildPerfEntryOptionsFromActionResult({ ok: false, reason: 'busy' }), undefined);

  const mark = markPerfPoint(app, 'project.save', { detail: { source: 'test' } });
  assert.equal(mark.name, 'project.save');
  assert.equal(mark.status, 'mark');
  assert.deepEqual(mark.detail, { source: 'test' });

  const spanId = startPerfSpan(app, 'project.load');
  assert.equal(spanId, 'noop-span');
  assert.equal(endPerfSpan(app, spanId), null);

  const sync = runPerfAction(app, 'project.sync', () => ({ ok: true }));
  assert.deepEqual(sync, { ok: true });

  const asyncResult = await runPerfAction(app, 'project.async', async () => ({ ok: true, pending: true }));
  assert.deepEqual(asyncResult, { ok: true, pending: true });

  const wrapped = await runWithPerfSpan(app, 'project.wrap', async () => 42);
  assert.equal(wrapped, 42);

  const surface = createPerfConsoleSurface(app);
  assert.deepEqual(surface.getEntries(), []);
  assert.deepEqual(surface.getSummary(), {});
  assert.equal(surface.end('noop-span'), null);
  assert.equal(surface.getStateFingerprint?.(), null);
  assert.equal(surface.getBuildDebugStats?.(), null);
  assert.equal(surface.getBuildDebugBudget?.(), null);
  assert.equal(surface.getRenderDebugStats?.(), null);
  assert.equal(surface.getRenderDebugBudget?.(), null);

  assert.deepEqual(getPerfEntries(app), []);
  assert.deepEqual(getPerfSummary(app), {});
  assert.equal(getPerfStateFingerprint(app), null);
  assert.equal(getBuildRuntimeDebugStats(app), null);
  assert.equal(getBuildRuntimeDebugBudget(app), null);
  assert.equal(getRenderRuntimeDebugStats(app), null);
  assert.equal(getRenderRuntimeDebugBudget(app), null);
  assert.equal(installPerfRuntimeSurface(app, win), null);
  assert.equal(installDebugConsoleSurface(app, win), null);
  assert.deepEqual(installObservabilityForBuild(app, win), { perf: null, debug: null });
});
