import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 43 perf runtime ownership split is anchored', () => {
  const facade = read('esm/native/runtime/perf_runtime_surface.ts');
  const core = read('esm/native/runtime/perf_runtime_core.ts');
  const stateFingerprint = read('esm/native/runtime/perf_runtime_state_fingerprint.ts');
  const debugSurfaces = read('esm/native/runtime/perf_runtime_debug_surfaces.ts');
  const typeSeam = read('esm/native/runtime/perf_runtime_surface_types.ts');

  assert.ok(
    lineCount(facade) <= 160,
    'perf_runtime_surface.ts must stay a small public facade instead of regrowing into the owner implementation'
  );

  for (const modulePath of [
    './perf_runtime_core.js',
    './perf_runtime_debug_surfaces.js',
    './perf_runtime_state_fingerprint.js',
  ]) {
    assert.ok(facade.includes(modulePath), `perf runtime facade must delegate to ${modulePath}`);
  }

  for (const publicExport of [
    'buildPerfEntryOptionsFromActionResult',
    'markPerfPoint',
    'startPerfSpan',
    'endPerfSpan',
    'runPerfAction',
    'getPerfEntries',
    'getPerfSummary',
    'getPerfStateFingerprint',
    'getBuildRuntimeDebugBudget',
    'getRenderRuntimeDebugBudget',
    'installPerfRuntimeSurface',
  ]) {
    assert.ok(facade.includes(publicExport), `perf runtime facade must keep public export ${publicExport}`);
  }

  for (const internalNeedle of [
    'PERF_RUNTIME_KEY',
    'normalizePerfStateString',
    'summarizeBuildDebugBudgetLocal',
  ]) {
    assert.equal(
      facade.includes(internalNeedle),
      false,
      `perf runtime facade must not own internal implementation detail ${internalNeedle}`
    );
  }

  assert.ok(core.includes('PERF_RUNTIME_KEY'), 'perf entry storage owner must live in perf_runtime_core.ts');
  assert.ok(
    core.includes('buildPerfEntryOptionsFromActionResult'),
    'action-result performance classification must live in perf_runtime_core.ts'
  );
  assert.ok(core.includes('getPerfSummary'), 'metric aggregation must live in perf_runtime_core.ts');

  assert.ok(
    stateFingerprint.includes('getPerfStateFingerprint'),
    'state fingerprint owner must live in perf_runtime_state_fingerprint.ts'
  );
  assert.ok(
    stateFingerprint.includes('readPerfStateSavedColorValues'),
    'saved-color fingerprint normalization must stay with the fingerprint owner'
  );
  assert.equal(
    stateFingerprint.includes('createPerfConsoleSurface'),
    false,
    'state fingerprint owner must not install the console surface'
  );

  assert.ok(
    debugSurfaces.includes('getBuildRuntimeDebugBudget'),
    'build debug budget owner must live in perf_runtime_debug_surfaces.ts'
  );
  assert.ok(
    debugSurfaces.includes('getRenderRuntimeDebugStats'),
    'render debug owner must live in perf_runtime_debug_surfaces.ts'
  );
  assert.equal(
    debugSurfaces.includes('getPerfStateFingerprint'),
    false,
    'debug surfaces owner must not own state fingerprinting'
  );

  for (const exportedType of ['PerfEntryOptions', 'PerfSpanOptions', 'PerfActionOptions']) {
    assert.ok(typeSeam.includes(`export type ${exportedType}`), `type seam must export ${exportedType}`);
  }
});
