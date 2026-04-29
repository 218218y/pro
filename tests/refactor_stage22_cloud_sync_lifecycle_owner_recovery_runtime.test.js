import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

test('stage 22 owner-level realtime start/restart failures stay non-fatal and use polling fallback', () => {
  const ownerStart = read('esm/native/services/cloud_sync_lifecycle_runtime_start.ts');
  const runtimeSetup = read('esm/native/services/cloud_sync_lifecycle_runtime_setup.ts');
  const guardSource = read('esm/native/services/cloud_sync_lifecycle_runtime_realtime_start.ts');
  const ownerTest = read('tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(ownerStart, /startCloudSyncRealtimeWithLifecycleFallback\(/);
  assert.match(ownerStart, /cloudSyncLifecycle\.realtimeInitialStart/);
  assert.match(ownerStart, /realtime-owner-start-error/);
  assert.match(runtimeSetup, /cloudSyncLifecycle\.realtimeRestart/);
  assert.match(runtimeSetup, /realtime-owner-restart-error/);
  assert.match(guardSource, /markCloudSyncRealtimeFailure\(/);
  assert.match(guardSource, /`\$\{op\}\.fallback`/);
  assert.match(ownerTest, /still binds browser recovery listeners/);
  assert.match(ownerTest, /reports fallback failures without rejecting/);
  assert.match(raceContract, /cloudSyncLifecycle\.realtimeInitialStart/);
  assert.match(raceContract, /cloudSyncLifecycle\.realtimeRestart/);
  assert.match(progressDoc, /Stage 22/);
});

test('stage 24 polling fallback publishes active state only after timer installation succeeds', () => {
  const pollingStart = read('esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  const newOwnerBranch = pollingStart.slice(pollingStart.indexOf('let intervalHandle:'));
  const setIntervalIndex = newOwnerBranch.indexOf('intervalHandle = setIntervalFn(onPollTick, pollIntervalMs);');
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

test('stage 25 polling tick recovery keeps timer callbacks non-fatal and reusable', () => {
  const pollingTick = read('esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts');
  const tickTest = read('tests/cloud_sync_lifecycle_polling_tick_recovery_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(pollingTick, /cloudSyncPolling\.tickRealtimeRestart/);
  assert.match(pollingTick, /cloudSyncPolling\.tickRefresh/);
  assert.match(pollingTick, /cloudSyncPolling\.tickAutoStop/);
  assert.match(pollingTick, /requestCloudSyncLifecycleRefresh\(/);
  assert.match(tickTest, /reports restart and refresh failures without detaching later ticks/);
  assert.match(tickTest, /reports auto-stop failures without throwing from the timer callback/);
  assert.match(raceContract, /cloud sync polling tick callback failures stay non-fatal and reusable/);
  assert.match(progressDoc, /Stage 25/);
});
