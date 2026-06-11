import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 13 cloud sync push race guard is wired into refactor guardrails', () => {
  execFileSync(process.execPath, ['tools/wp_cloud_sync_race_contract.mjs'], { stdio: 'pipe' });

  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:cloud-sync-races/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage13_cloud_sync_push_race_runtime\.test\.js/
  );
});

test('stage 13 cloud sync push flow clears stale pending follow-up push on suppression', () => {
  const runtimeSource = read('esm/native/services/cloud_sync_main_row_push_runtime.ts');
  const sharedSource = read('esm/native/services/cloud_sync_main_row_push_shared.ts');
  const runtimeTest = read('tests/cloud_sync_main_row_push_flow_runtime.test.ts');

  assert.match(runtimeSource, /if \(args\.suppressRef\.v\) \{\s*resetPendingPushAfterFlights\(\);\s*return;/);
  assert.match(sharedSource, /resetCloudSyncMainRowPendingPushAfterFlights/);
  assert.match(runtimeTest, /drops pending follow-up push when suppression starts during an in-flight push/);
  assert.match(runtimeTest, /assert\.equal\(pushCalls, 2\)/);
});
