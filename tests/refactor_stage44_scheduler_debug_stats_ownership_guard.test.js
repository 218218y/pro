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
  const reasonStore = read('esm/native/builder/scheduler_debug_stats_reason_store.ts');
  const signaturePolicy = read('esm/native/builder/scheduler_debug_stats_signature_policy.ts');
  const recorders = read('esm/native/builder/scheduler_debug_stats_recorders.ts');
  const budget = read('esm/native/builder/scheduler_debug_stats_budget.ts');

  assert.ok(
    lineCount(facade) <= 60,
    'scheduler_debug_stats.ts must stay a small public facade instead of regrowing implementation logic'
  );

  for (const modulePath of [
    './scheduler_debug_stats_reason_store.js',
    './scheduler_debug_stats_signature_policy.js',
    './scheduler_debug_stats_recorders.js',
    './scheduler_debug_stats_budget.js',
  ]) {
    assert.ok(facade.includes(modulePath), `scheduler debug facade must delegate to ${modulePath}`);
  }

  for (const publicExport of [
    'nowForBuildStats',
    'normalizeBuildReason',
    'createBuildDebugStats',
    'ensureBuildDebugStats',
    'cloneBuildDebugStats',
    'readBuildDedupeSignature',
    'shouldSuppressDuplicatePendingRequest',
    'shouldSuppressSatisfiedRequest',
    'shouldSuppressRepeatedExecute',
    'recordBuildRequest',
    'recordBuildExecute',
    'summarizeBuildDebugBudget',
  ]) {
    assert.ok(facade.includes(publicExport), `scheduler debug facade must keep public export ${publicExport}`);
  }

  for (const internalNeedle of [
    'REASON_STAT_NUMERIC_KEYS',
    'readBuildDedupeSignatureFromState',
    'stats.requestCount += 1',
    'function readCount(',
  ]) {
    assert.equal(
      facade.includes(internalNeedle),
      false,
      `scheduler debug facade must not own internal implementation detail ${internalNeedle}`
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
  assert.equal(
    reasonStore.includes('readBuildDedupeSignatureFromState'),
    false,
    'reason store must not own signature policy'
  );

  assert.ok(
    signaturePolicy.includes('readBuildDedupeSignatureFromState'),
    'dedupe signature bridge must live in scheduler_debug_stats_signature_policy.ts'
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
  assert.ok(
    recorders.includes('getReasonStats'),
    'recorders must share the centralized reason-store seam'
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
});
