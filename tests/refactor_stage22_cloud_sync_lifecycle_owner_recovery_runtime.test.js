import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { REFACTOR_COMPLETED_STAGE_LABELS } from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 22 cloud sync lifecycle owner recovery guard is wired into refactor guardrails', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(
    pkg.scripts['test:cloud-sync-surfaces:lifecycle'],
    /cloud_sync_lifecycle_owner_realtime_start_runtime\.test\.ts/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime\.test\.js/
  );
});

test('stage 22 owner-level realtime start/restart failures stay non-fatal and use polling recovery', () => {
  const ownerStart = read('esm/native/services/cloud_sync_lifecycle_runtime_start.ts');
  const runtimeSetup = read('esm/native/services/cloud_sync_lifecycle_runtime_setup.ts');
  const guardSource = read('esm/native/services/cloud_sync_lifecycle_runtime_realtime_start.ts');
  const ownerTest = read('tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(ownerStart, /startCloudSyncRealtimeWithLifecycleRecovery\(/);
  assert.match(ownerStart, /cloudSyncLifecycle\.realtimeInitialStart/);
  assert.match(ownerStart, /realtime-owner-start-error/);
  assert.match(runtimeSetup, /cloudSyncLifecycle\.realtimeRestart/);
  assert.match(runtimeSetup, /realtime-owner-restart-error/);
  assert.match(guardSource, /markCloudSyncRealtimeFailure\(/);
  assert.match(guardSource, /`\$\{op\}\.recovery`/);
  assert.match(ownerTest, /still binds browser recovery listeners/);
  assert.match(ownerTest, /reports recovery transition failures without rejecting/);
  assert.match(raceContract, /cloudSyncLifecycle\.realtimeInitialStart/);
  assert.match(raceContract, /cloudSyncLifecycle\.realtimeRestart/);
  assert.match(progressDoc, /Stage 22/);
});

test('stage 24 polling recovery publishes active state only after timer installation succeeds', () => {
  const pollingStart = read('esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  const newOwnerBranch = pollingStart.slice(pollingStart.indexOf('let intervalHandle:'));
  const setIntervalIndex = newOwnerBranch.indexOf(
    'intervalHandle = setIntervalFn(onPollTick, pollIntervalMs);'
  );
  const timerRefIndex = newOwnerBranch.indexOf('pollTimerRef.current = intervalHandle;');
  const syncIndex = newOwnerBranch.indexOf('const pollingStatus = syncCloudSyncPollingStatusInPlace({');
  const publishIndex = newOwnerBranch.indexOf('if (shouldPublish) publishStatus();');
  const diagIndex = newOwnerBranch.indexOf("diag('polling:start', pollingStatus);");

  assert.ok(setIntervalIndex >= 0, 'new polling owner branch must install the timer');
  assert.ok(timerRefIndex > setIntervalIndex, 'timer ref must be recorded after timer installation');
  assert.ok(syncIndex > timerRefIndex, 'polling status must not become active before timer install succeeds');
  assert.ok(publishIndex > syncIndex, 'publication must follow the canonical active polling status');
  assert.ok(diagIndex > publishIndex, 'polling:start diagnostics must describe the published active timer');
  assert.match(raceContract, /polling start installs the owner timer before publishing active status/);
  assert.match(progressDoc, /Stage 24/);
});

test('stage 25 polling tick callback failures are non-fatal and keep later ticks reachable', () => {
  const pollingTick = read('esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts');
  const tickTest = read('tests/cloud_sync_lifecycle_polling_tick_recovery_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(pollingTick, /cloudSyncPolling\.tickRealtimeRestart/);
  assert.match(pollingTick, /cloudSyncPolling\.tickRefresh/);
  assert.match(pollingTick, /cloudSyncPolling\.tickAutoStop/);
  assert.match(tickTest, /without detaching later ticks/);
  assert.match(tickTest, /auto-stop failures without throwing from the timer callback/);
  assert.match(
    raceContract,
    /cloud sync polling tick reports restart and refresh failures without detaching later ticks/
  );
  assert.match(progressDoc, /Stage 25/);
});

test('stage 26 lifecycle refresh and attention pulls report sync and async pull failures through one seam', () => {
  const refresh = read('esm/native/services/cloud_sync_lifecycle_support_refresh.ts');
  const attentionRuntime = read('esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.ts');
  const refreshTest = read('tests/cloud_sync_lifecycle_refresh_async_recovery_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(refresh, /blockedBy:\s*[\s\S]*'pull-error'[\s\S]*\| null/);
  assert.match(refresh, /Promise\.resolve\(pullResult\)\.catch/);
  assert.match(refresh, /reportOp = 'cloudSyncLifecycle\.refreshPull'/);
  assert.match(attentionRuntime, /getCloudSyncAttentionPullReportOp\(reason\)/);
  assert.match(attentionRuntime, /onlineListener\.callback/);
  assert.match(refreshTest, /reports synchronous pull failures as pull-error without throwing/);
  assert.match(refreshTest, /reports async pull rejections without detaching callers/);
  assert.match(
    raceContract,
    /cloud sync lifecycle refresh reports async pull rejections without detaching callers/
  );
  assert.match(progressDoc, /Stage 26/);
});

test('stage 27 polling recovery hooks observe async rejections without losing fallback polling', () => {
  const pollingStart = read('esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts');
  const pollingTick = read('esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts');
  const tickTest = read('tests/cloud_sync_lifecycle_polling_tick_recovery_runtime.test.ts');
  const refreshTest = read('tests/cloud_sync_lifecycle_refresh_async_recovery_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(pollingStart, /observeCloudSyncPollingRecoveryHook/);
  assert.match(pollingStart, /Promise\.resolve\(hookResult\)\.catch/);
  assert.match(pollingTick, /observeCloudSyncPollingTickHook/);
  assert.match(pollingTick, /Promise\.resolve\(hookResult\)\.catch/);
  assert.match(tickTest, /reports async restart and refresh rejections without detaching later ticks/);
  assert.match(refreshTest, /reports async recovery hook rejections without losing fallback polling/);
  assert.match(
    raceContract,
    /cloud sync polling start reports async recovery hook rejections without losing fallback polling/
  );
  assert.match(progressDoc, /Stage 27/);
});

test('stage 28 cloud sync async recovery implementation stays aligned with the documented closeout', () => {
  const refresh = read('esm/native/services/cloud_sync_lifecycle_support_refresh.ts');
  const attentionRuntime = read('esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.ts');
  const pollingTick = read('esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');

  assert.match(refresh, /return \{ accepted: false, blockedBy: 'pull-error' \}/);
  assert.match(refresh, /observeCloudSyncLifecycleRefreshPullResult/);
  assert.match(attentionRuntime, /reportOp: getCloudSyncAttentionPullReportOp\(reason\)/);
  assert.match(pollingTick, /reportOp: 'cloudSyncPolling\.tickRefresh'/);
  assert.match(pollingTick, /observeCloudSyncPollingTickHook/);
  assert.match(progressDoc, /Stage 28/);
  assert.ok(REFACTOR_COMPLETED_STAGE_LABELS.includes('Stage 28'), 'catalog must include Stage 28');
  assert.match(integrationAudit, /REFACTOR_COMPLETED_STAGE_LABELS/);
});
