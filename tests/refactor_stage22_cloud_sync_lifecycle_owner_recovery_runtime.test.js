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
  const transitionSource = read('esm/native/services/cloud_sync_lifecycle_realtime_support_status_shared.ts');
  const ownerTest = read('tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');
  const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');

  assert.match(ownerStart, /startCloudSyncRealtimeWithLifecycleFallback\(/);
  assert.match(ownerStart, /cloudSyncLifecycle\.realtimeInitialStart/);
  assert.match(ownerStart, /realtime-owner-start-error/);
  assert.match(runtimeSetup, /cloudSyncLifecycle\.realtimeRestart/);
  assert.match(runtimeSetup, /realtime-owner-restart-error/);
  assert.match(guardSource, /handleRealtimeStartFailure/);
  assert.match(guardSource, /const startResult = cloudSyncRealtime\.startRealtime\(\)/);
  assert.match(guardSource, /Promise\.resolve\(startResult\)\.catch\(handleRealtimeStartFailure\)/);
  assert.match(guardSource, /markCloudSyncRealtimeFailure\(/);
  assert.match(guardSource, /`\$\{op\}\.fallback`/);
  assert.match(transitionSource, /hasPollingTransitionError/);
  assert.match(transitionSource, /throw pollingTransitionError/);
  assert.match(ownerTest, /still binds browser recovery listeners/);
  assert.match(ownerTest, /reports fallback failures without rejecting/);
  assert.match(ownerTest, /assert\.equal\(publishCount, 1\)/);
  assert.match(ownerTest, /realtime:owner-restart-error/);
  assert.match(raceContract, /cloudSyncLifecycle\.realtimeInitialStart/);
  assert.match(raceContract, /cloudSyncLifecycle\.realtimeRestart/);
  assert.match(progressDoc, /Stage 22/);
  assert.match(progressDoc, /Stage 23/);
});
