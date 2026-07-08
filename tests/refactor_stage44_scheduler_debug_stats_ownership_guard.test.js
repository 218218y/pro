import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 44 scheduler debug stats ownership split is anchored', () => {
  const facade = read('esm/native/builder/scheduler_debug_stats.ts');
  const full = read('esm/native/builder/scheduler_debug_stats_full.ts');
  const prod = read('esm/native/builder/scheduler_debug_stats_prod.ts');
  const reasonStore = read('esm/native/builder/scheduler_debug_stats_reason_store.ts');
  const signaturePolicy = read('esm/native/builder/scheduler_debug_stats_signature_policy.ts');
  const recorders = read('esm/native/builder/scheduler_debug_stats_recorders.ts');
  const budget = read('esm/native/builder/scheduler_debug_stats_budget.ts');
  const schedulerRuntime = read('esm/native/builder/scheduler_runtime.ts');

  assert.ok(
    lineCount(facade) <= 10,
    'scheduler_debug_stats.ts must stay a tiny canonical facade instead of importing implementation owners directly'
  );
  assert.ok(facade.includes("export * from './scheduler_debug_stats_full.js';"));

  assert.ok(
    lineCount(full) <= 60,
    'scheduler_debug_stats_full.ts must stay a small full-instrumentation facade over focused owners'
  );

  for (const modulePath of [
    './scheduler_debug_stats_reason_store.js',
    './scheduler_debug_stats_signature_policy.js',
    './scheduler_debug_stats_recorders.js',
    './scheduler_debug_stats_budget.js',
  ]) {
    assert.ok(full.includes(modulePath), `scheduler debug full facade must delegate to ${modulePath}`);
  }

  for (const publicExport of [
    'nowForBuildStats',
    'isBuildDebugStatsEnabled',
    'MAX_BUILD_DURATION_SAMPLES',
    'normalizeBuildReason',
    'createBuildDebugStats',
    'ensureBuildDebugStats',
    'cloneBuildDebugStats',
    'readBuildInputFingerprint',
    'shouldSuppressDuplicatePendingRequest',
    'shouldSuppressSatisfiedRequest',
    'shouldSuppressRepeatedExecute',
    'recordBuildRequest',
    'recordBuildExecute',
    'recordBuildExecuteDuration',
    'summarizeBuildDebugBudget',
  ]) {
    assert.ok(
      full.includes(publicExport),
      `scheduler debug full facade must keep public export ${publicExport}`
    );
  }

  for (const internalNeedle of [
    'REASON_STAT_NUMERIC_KEYS',
    'readBuildInputFingerprintFromState',
    'stats.requestCount += 1',
    'function readCount(',
  ]) {
    assert.equal(
      facade.includes(internalNeedle),
      false,
      `scheduler debug facade must not own internal implementation detail ${internalNeedle}`
    );
    assert.equal(
      full.includes(internalNeedle),
      false,
      `scheduler debug full facade must not own internal implementation detail ${internalNeedle}`
    );
  }

  assert.ok(
    prod.includes("from './scheduler_debug_stats_signature_policy.js';"),
    'prod scheduler stats must keep production signature/suppression policy'
  );
  assert.ok(
    prod.includes('state.lastExecutedSignature = readExecutionSignature(plan, buildState);'),
    'prod recordBuildExecute must preserve repeated-execute suppression signatures'
  );
  for (const forbiddenProdNeedle of [
    './scheduler_debug_stats_reason_store.js',
    './scheduler_debug_stats_recorders.js',
    './scheduler_debug_stats_budget.js',
    'getReasonStats',
    'executeDurationSamplesMs',
    'executeDurationAvgMs',
    'executeDurationP95Ms',
    'forceRequestCount',
    'performance.now',
    'Date.now',
  ]) {
    assert.equal(
      prod.includes(forbiddenProdNeedle),
      false,
      `prod scheduler stats must not retain instrumentation detail ${forbiddenProdNeedle}`
    );
  }

  assert.ok(
    reasonStore.includes('REASON_STAT_NUMERIC_KEYS'),
    'reason stat shape validation must live in scheduler_debug_stats_reason_store.ts'
  );
  assert.ok(
    reasonStore.includes('export function createBuildDebugStats'),
    'debug stats construction must live in scheduler_debug_stats_reason_store.ts'
  );
  assert.ok(
    reasonStore.includes(
      "import { isClientObservabilityBuild } from '../runtime/observability_build_mode.js';"
    ),
    'build debug stats must use the compile-time observability build-mode seam'
  );
  assert.ok(
    reasonStore.includes('export const MAX_BUILD_DURATION_SAMPLES = 512;'),
    'duration sample caps must live with the scheduler debug stats shape owner'
  );
  assert.ok(
    reasonStore.includes('export function isBuildDebugStatsEnabled(): boolean'),
    'client/release instrumentation gating must live with the scheduler debug stats owner'
  );
  assert.ok(
    reasonStore.includes('if (!isBuildDebugStatsEnabled()) {\n    return createBuildDebugStats();\n  }'),
    'ensureBuildDebugStats must not create state.debugStats while client stats are disabled'
  );
  assert.equal(
    reasonStore.includes('readBuildInputFingerprintFromState'),
    false,
    'reason store must not own signature policy'
  );

  assert.ok(
    signaturePolicy.includes('readBuildInputFingerprintFromState'),
    'input fingerprint bridge must live in scheduler_debug_stats_signature_policy.ts'
  );
  assert.ok(
    signaturePolicy.includes('export function shouldSuppressDuplicatePendingRequest'),
    'duplicate pending suppression policy must live in scheduler_debug_stats_signature_policy.ts'
  );
  assert.equal(
    signaturePolicy.includes('stats.requestCount += 1'),
    false,
    'signature policy must not mutate debug counters'
  );

  assert.ok(
    recorders.includes('export function recordBuildRequest'),
    'request counter mutation must live in scheduler_debug_stats_recorders.ts'
  );
  assert.ok(
    recorders.includes('export function recordBuildExecute'),
    'execute counter mutation must live in scheduler_debug_stats_recorders.ts'
  );
  assert.ok(recorders.includes('getReasonStats'), 'recorders must share the centralized reason-store seam');
  assert.ok(
    recorders.includes('MAX_BUILD_DURATION_SAMPLES'),
    'recorders must cap duration sample arrays instead of growing them indefinitely'
  );
  assert.ok(
    recorders.includes('samples.splice(0, samples.length - MAX_BUILD_DURATION_SAMPLES)'),
    'duration recording must evict old samples when the cap is exceeded'
  );
  assert.ok(
    recorders.includes(
      'if (!isBuildDebugStatsEnabled()) {\n    state.lastExecutedSignature = sig;\n    return reason;\n  }'
    ),
    'recordBuildExecute must preserve execution signature suppression without mutating debug stats in client builds'
  );
  const noOpRecorderGuards = recorders.match(/if \(!isBuildDebugStatsEnabled\(\)\) return reason;/g) || [];
  assert.ok(
    noOpRecorderGuards.length >= 9,
    'all scheduler stats recorders except the signature-preserving execute recorder must no-op in client builds'
  );

  assert.ok(
    budget.includes('export function summarizeBuildDebugBudget'),
    'budget summary logic must live in scheduler_debug_stats_budget.ts'
  );
  assert.ok(budget.includes('function ratio'), 'budget ratio math must stay with budget summary logic');
  assert.equal(
    budget.includes('getReasonStats'),
    false,
    'budget summary must not mutate or normalize per-reason stats'
  );

  assert.ok(
    schedulerRuntime.includes('const shouldMeasureBuildExecution = isBuildDebugStatsEnabled();'),
    'scheduler runtime must decide build execution timing through the central debug-stats guard'
  );
  assert.ok(
    schedulerRuntime.includes('const startedAt = shouldMeasureBuildExecution ? nowForBuildStats() : 0;'),
    'scheduler runtime must not call the timing source when client stats are disabled'
  );
  assert.equal(
    schedulerRuntime.includes('const startedAt = nowForBuildStats();'),
    false,
    'scheduler runtime must not keep an unconditional build execution timing probe'
  );
  assert.ok(
    (schedulerRuntime.match(/if \(shouldMeasureBuildExecution\) \{\s*recordBuildExecuteDuration/g) || [])
      .length >= 4,
    'every build duration recorder call in scheduler runtime must be guarded'
  );
  assert.ok(
    schedulerRuntime.includes(
      'if (isBuildDebugStatsEnabled()) summary.debugStats = ensureBuildDebugStats(s);'
    ),
    'getSchedulerState must not create debugStats in client/release state summaries'
  );
});
