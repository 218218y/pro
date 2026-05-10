#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

const errors = [];
function requireNeedle(label, source, needle) {
  if (!source.includes(needle)) errors.push(`${label}: missing ${needle}`);
}

function requireOrder(label, source, first, second) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0) errors.push(`${label}: missing ${first}`);
  if (secondIndex < 0) errors.push(`${label}: missing ${second}`);
  if (firstIndex >= 0 && secondIndex >= 0 && firstIndex > secondIndex) {
    errors.push(`${label}: expected ${first} before ${second}`);
  }
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
const refreshRuntime = read('esm/native/services/cloud_sync_lifecycle_support_refresh.ts');
const attentionRuntime = read('esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.ts');
const pollingStartRuntime = read('esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts');
const pollingTickRuntime = read('esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts');
const realtimeStartRuntime = read('esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts');
const lifecycleRuntimeStart = read('esm/native/services/cloud_sync_lifecycle_runtime_start.ts');
const lifecycleRuntimeSetup = read('esm/native/services/cloud_sync_lifecycle_runtime_setup.ts');
const lifecycleRealtimeStartGuard = read(
  'esm/native/services/cloud_sync_lifecycle_runtime_realtime_start.ts'
);
const realtimeTransitionShared = read(
  'esm/native/services/cloud_sync_lifecycle_realtime_support_status_shared.ts'
);
const realtimeTransportCleanup = read(
  'esm/native/services/cloud_sync_lifecycle_realtime_transport_cleanup.ts'
);
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

requireNeedle('cloud_sync_lifecycle_support_refresh.ts', refreshRuntime, "'pull-error'");
requireNeedle(
  'cloud_sync_lifecycle_support_refresh.ts',
  refreshRuntime,
  'reportCloudSyncLifecycleRefreshError'
);
requireNeedle(
  'cloud_sync_lifecycle_support_refresh.ts',
  refreshRuntime,
  'observeCloudSyncLifecycleRefreshPullResult'
);
requireNeedle('cloud_sync_lifecycle_support_refresh.ts', refreshRuntime, 'Promise.resolve(pullResult).catch');
requireNeedle(
  'cloud_sync_lifecycle_support_refresh.ts',
  refreshRuntime,
  "reportOp = 'cloudSyncLifecycle.refreshPull'"
);
requireNeedle(
  'cloud_sync_lifecycle_attention_pulls_runtime.ts',
  attentionRuntime,
  'getCloudSyncAttentionPullReportOp(reason)'
);
requireNeedle(
  'cloud_sync_lifecycle_attention_pulls_runtime.ts',
  attentionRuntime,
  "if (reason === 'online') return 'onlineListener.callback';"
);

requireNeedle(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts',
  pollingStartRuntime,
  'cloudSyncPolling.realtimeRecoveryPull'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts',
  pollingStartRuntime,
  'cloudSyncPolling.realtimeRecoveryRestart'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts',
  pollingStartRuntime,
  'observeCloudSyncPollingRecoveryHook'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts',
  pollingStartRuntime,
  'Promise.resolve(hookResult).catch'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts',
  pollingStartRuntime,
  'intervalHandle = setIntervalFn(onPollTick, pollIntervalMs);'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts',
  pollingStartRuntime,
  'pollTimerRef.current = intervalHandle;'
);
requireOrder(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts polling start installs the owner timer before publishing active status',
  pollingStartRuntime,
  'pollTimerRef.current = intervalHandle;',
  'const pollingStatus = syncCloudSyncPollingStatusInPlace({'
);
requireOrder(
  'cloud_sync_lifecycle_support_polling_start_runtime.ts polling start publishes before diagnostics',
  pollingStartRuntime,
  'if (shouldPublish) publishStatus();',
  "diag('polling:start', pollingStatus);"
);

requireNeedle(
  'cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  pollingTickRuntime,
  'cloudSyncPolling.tickRealtimeRestart'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  pollingTickRuntime,
  'cloudSyncPolling.tickRefresh'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  pollingTickRuntime,
  'cloudSyncPolling.tickAutoStop'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  pollingTickRuntime,
  'observeCloudSyncPollingTickHook'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  pollingTickRuntime,
  'Promise.resolve(hookResult).catch'
);
requireNeedle(
  'cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  pollingTickRuntime,
  "reportOp: 'cloudSyncPolling.tickRefresh'"
);

requireNeedle('cloud_sync_lifecycle_realtime_runtime_start.ts', realtimeStartRuntime, 'realtime.startFlight');
requireNeedle(
  'cloud_sync_lifecycle_realtime_runtime_start.ts',
  realtimeStartRuntime,
  'realtime.startFlightFallback'
);
requireNeedle(
  'cloud_sync_lifecycle_realtime_runtime_start.ts',
  realtimeStartRuntime,
  'realtime:start-flight-error'
);
requireNeedle(
  'cloud_sync_lifecycle_runtime_start.ts',
  lifecycleRuntimeStart,
  'cloudSyncLifecycle.realtimeInitialStart'
);
requireNeedle('cloud_sync_lifecycle_runtime_start.ts', lifecycleRuntimeStart, 'realtime-owner-start-error');
requireNeedle(
  'cloud_sync_lifecycle_runtime_setup.ts',
  lifecycleRuntimeSetup,
  'cloudSyncLifecycle.realtimeRestart'
);
requireNeedle('cloud_sync_lifecycle_runtime_setup.ts', lifecycleRuntimeSetup, 'realtime-owner-restart-error');
requireNeedle(
  'cloud_sync_lifecycle_runtime_realtime_start.ts',
  lifecycleRealtimeStartGuard,
  'markCloudSyncRealtimeFailure'
);
requireNeedle(
  'cloud_sync_lifecycle_runtime_realtime_start.ts',
  lifecycleRealtimeStartGuard,
  '`${op}.recovery`'
);
requireNeedle(
  'cloud_sync_lifecycle_runtime_realtime_start.ts',
  lifecycleRealtimeStartGuard,
  'const startResult = cloudSyncRealtime.startRealtime();'
);
requireNeedle(
  'cloud_sync_lifecycle_realtime_support_status_shared.ts',
  realtimeTransitionShared,
  'if (hasPollingTransitionError) throw pollingTransitionError;'
);
requireNeedle('cloud_sync_lifecycle_realtime_transport_cleanup.ts', realtimeTransportCleanup, 'clearHints');

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
const pollingTickTest = read('tests/cloud_sync_lifecycle_polling_tick_recovery_runtime.test.ts');
const refreshRecoveryTest = read('tests/cloud_sync_lifecycle_refresh_async_recovery_runtime.test.ts');
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
requireNeedle(
  'tests/cloud_sync_lifecycle_support_runtime.test.ts',
  read('tests/cloud_sync_lifecycle_support_runtime.test.ts'),
  'realtime recovery reports pull and restart failures without breaking polling fallback'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts',
  read('tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts'),
  'reports unexpected setup failures and falls back to polling'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_realtime_transport_runtime.test.ts',
  read('tests/cloud_sync_lifecycle_realtime_transport_runtime.test.ts'),
  'reports hint clearing failures and still clears transport refs'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts',
  read('tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts'),
  'still binds browser recovery listeners'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts',
  read('tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts'),
  'reports recovery transition failures without rejecting'
);
requireNeedle(
  'tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js',
  read('tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js'),
  'stage 24 polling recovery publishes active state only after timer installation succeeds'
);
requireNeedle(
  'tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js',
  read('tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js'),
  'stage 26 lifecycle refresh and attention pulls report sync and async pull failures through one seam'
);
requireNeedle(
  'tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js',
  read('tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js'),
  'stage 27 polling recovery hooks observe async rejections without losing fallback polling'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_polling_tick_recovery_runtime.test.ts',
  pollingTickTest,
  'cloud sync polling tick reports restart and refresh failures without detaching later ticks'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_polling_tick_recovery_runtime.test.ts',
  pollingTickTest,
  'cloud sync polling tick reports async restart and refresh rejections without detaching later ticks'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_refresh_async_recovery_runtime.test.ts',
  refreshRecoveryTest,
  'cloud sync lifecycle refresh reports async pull rejections without detaching callers'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_refresh_async_recovery_runtime.test.ts',
  refreshRecoveryTest,
  'cloud sync attention pull uses lifecycle refresh recovery and remains eligible after sync failure'
);
requireNeedle(
  'tests/cloud_sync_lifecycle_refresh_async_recovery_runtime.test.ts',
  refreshRecoveryTest,
  'cloud sync polling start reports async recovery hook rejections without losing fallback polling'
);

if (errors.length) {
  console.error('[cloud-sync-race-contract] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[cloud-sync-race-contract] ok');
process.exit(0);
