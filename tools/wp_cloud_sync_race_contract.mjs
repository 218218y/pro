#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

const errors = [];
function requireNeedle(label, source, needle) {
  if (!source.includes(needle)) errors.push(`${label}: missing ${needle}`);
}

const queueRuntime = read('esm/native/services/cloud_sync_coalescer_queue_runtime.ts');
requireNeedle(
  'cloud_sync_coalescer_queue_runtime.ts',
  queueRuntime,
  'resetPullCoalescerState(context.state);'
);
requireNeedle(
  'cloud_sync_coalescer_queue_runtime.ts',
  queueRuntime,
  'context.state.queued && (context.deps.isDisposed() || context.deps.isSuppressed())'
);
requireNeedle('cloud_sync_coalescer_queue_runtime.ts', queueRuntime, '.finally(() => {');

const pushRuntime = read('esm/native/services/cloud_sync_main_row_push_runtime.ts');
const pushShared = read('esm/native/services/cloud_sync_main_row_push_shared.ts');
requireNeedle(
  'cloud_sync_main_row_push_runtime.ts',
  pushRuntime,
  'resetPendingPushAfterFlights();'
);
requireNeedle(
  'cloud_sync_main_row_push_runtime.ts',
  pushRuntime,
  'if (args.suppressRef.v) {'
);
requireNeedle(
  'cloud_sync_main_row_push_shared.ts',
  pushShared,
  'resetCloudSyncMainRowPendingPushAfterFlights'
);

const coalescerTest = read('tests/cloud_sync_pull_coalescer_runtime.test.ts');
requireNeedle(
  'tests/cloud_sync_pull_coalescer_runtime.test.ts',
  coalescerTest,
  'drops queued follow-up work when owner becomes stale during an in-flight run'
);
requireNeedle(
  'tests/cloud_sync_pull_coalescer_runtime.test.ts',
  coalescerTest,
  'drops queued follow-up work when suppression starts during an in-flight run'
);

const pushFlowTest = read('tests/cloud_sync_main_row_push_flow_runtime.test.ts');
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'drops pending follow-up push when suppression starts during an in-flight push'
);
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'assert.equal(pushCalls, 2)'
);

if (errors.length) {
  console.error('[cloud-sync-race-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[cloud-sync-race-contract] ok');
