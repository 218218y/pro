import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 21 cloud sync realtime start recovery guard is wired into refactor guardrails', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(
    pkg.scripts['test:cloud-sync-surfaces:lifecycle'],
    /cloud_sync_lifecycle_realtime_start_recovery_runtime\.test\.ts/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage21_cloud_sync_realtime_start_recovery_runtime\.test\.js/
  );
});

test('stage 21 realtime start/restart failures stay non-fatal and keep polling fallback reachable', () => {
  const startRuntime = read('esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts');
  const cleanupRuntime = read('esm/native/services/cloud_sync_lifecycle_realtime_transport_cleanup.ts');
  const startTest = read('tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts');
  const transportTest = read('tests/cloud_sync_lifecycle_realtime_transport_runtime.test.ts');
  const raceContract = read('tools/wp_cloud_sync_race_contract.mjs');

  assert.match(startRuntime, /realtime\.startFlight/);
  assert.match(startRuntime, /realtime\.startFlightFallback/);
  assert.match(startRuntime, /realtime:start-flight-error/);
  assert.match(startRuntime, /transport\.setRealtimeFailure\(/);
  assert.match(cleanupRuntime, /`\$\{op\}\.clearHints`/);
  assert.match(cleanupRuntime, /mutableState\.sentAtByKey\.clear\(\)/);
  assert.match(startTest, /reports unexpected setup failures and falls back to polling/);
  assert.match(startTest, /reports fallback transition failures without rejecting/);
  assert.match(transportTest, /reports hint clearing failures and still clears transport refs/);
  assert.match(raceContract, /realtime\.startFlightFallback/);
});
