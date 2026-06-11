import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 20 cloud sync polling recovery guard is wired into refactor guardrails', () => {
  execFileSync(process.execPath, ['tools/wp_cloud_sync_race_contract.mjs'], { stdio: 'pipe' });

  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:cloud-sync-races/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage20_cloud_sync_polling_recovery_runtime\.test\.js/
  );
});

test('stage 20 cloud sync polling recovery errors stay non-fatal', () => {
  const runtimeSource = read('esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts');
  const supportTest = read('tests/cloud_sync_lifecycle_support_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');

  assert.match(runtimeSource, /cloudSyncPolling\.realtimeRecoveryPull/);
  assert.match(runtimeSource, /cloudSyncPolling\.realtimeRecoveryRestart/);
  assert.match(runtimeSource, /reportCloudSyncPollingRecoveryFailure/);
  assert.match(runtimeSource, /observeCloudSyncPollingRecoveryHook/);
  assert.match(runtimeSource, /Promise\.resolve\(hookResult\)\.catch/);
  assert.match(runtimeSource, /const pullResult = pullAllNow\(\{ reason: `\$\{reason\}\.recover` \}\);/);
  assert.match(runtimeSource, /hookResult: pullResult/);
  assert.match(runtimeSource, /const restartResult = restartRealtime\?\.\(\);/);
  assert.match(runtimeSource, /hookResult: restartResult/);
  assert.match(
    supportTest,
    /realtime recovery reports pull and restart failures without breaking polling fallback/
  );
  assert.match(raceContract, /cloudSyncPolling\.realtimeRecoveryPull/);
  assert.match(raceContract, /cloudSyncPolling\.realtimeRecoveryRestart/);
});
