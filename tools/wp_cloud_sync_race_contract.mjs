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
requireNeedle('cloud_sync_coalescer_queue_runtime.ts', queueRuntime, 'Promise.resolve(context.deps.run())');
requireNeedle(
  'cloud_sync_coalescer_queue_runtime.ts',
  queueRuntime,
  'context.deps.reportNonFatal(`pullCoalescer.${context.policy.scopeLabel}.run`, e);'
);

const pushRuntime = read('esm/native/services/cloud_sync_main_row_push_runtime.ts');
const pushShared = read('esm/native/services/cloud_sync_main_row_push_shared.ts');
const pullRuntime = read('esm/native/services/cloud_sync_main_row_pull_runtime.ts');
const attentionHandlers = read('esm/native/services/cloud_sync_lifecycle_attention_pulls_handlers.ts');
requireNeedle('cloud_sync_main_row_push_runtime.ts', pushRuntime, 'resetPendingPushAfterFlights();');
requireNeedle('cloud_sync_main_row_push_runtime.ts', pushRuntime, 'if (args.suppressRef.v) {');
requireNeedle('cloud_sync_main_row_push_runtime.ts', pushRuntime, 'Promise.resolve(args.runPushRemote())');
requireNeedle('cloud_sync_main_row_push_runtime.ts', pushRuntime, 'cloudSyncMainRow.push');
requireNeedle(
  'cloud_sync_lifecycle_attention_pulls_handlers.ts',
  attentionHandlers,
  'onlineListener.callback'
);
requireNeedle(
  'cloud_sync_main_row_push_shared.ts',
  pushShared,
  'resetCloudSyncMainRowPendingPushAfterFlights'
);
requireNeedle('cloud_sync_main_row_push_shared.ts', pushShared, 'hasCloudSyncMainRowPendingPushWork');
requireNeedle(
  'cloud_sync_main_row_pull_runtime.ts',
  pullRuntime,
  'args.isPushInFlight() || args.hasPendingPushWork?.()'
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
requireNeedle(
  'tests/cloud_sync_pull_coalescer_runtime.test.ts',
  coalescerTest,
  'reports synchronous run failures and recovers for later work'
);

const pushFlowTest = read('tests/cloud_sync_main_row_push_flow_runtime.test.ts');
const mainRowTest = read('tests/cloud_sync_main_row_runtime.test.ts');
const attentionTest = read('tests/cloud_sync_lifecycle_attention_runtime.test.ts');
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'drops pending follow-up push when suppression starts during an in-flight push'
);
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'drops debounced push when suppression starts before the timer fires'
);
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'reports synchronous push failures and still notifies settled listeners'
);
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'reports async push rejections without leaving detached timer work unhandled'
);
requireNeedle(
  'tests/cloud_sync_main_row_push_flow_runtime.test.ts',
  pushFlowTest,
  'assert.equal(pushCalls, 2)'
);
requireNeedle(
  'tests/cloud_sync_main_row_runtime.test.ts',
  mainRowTest,
  'parks recovery pulls behind a debounced pending push so local changes flush first'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_attention_runtime.test.ts',
  attentionTest,
  'online handler reports pull failures without breaking later attention events'
);

if (errors.length) {
  console.error('[cloud-sync-race-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[cloud-sync-race-contract] ok');
