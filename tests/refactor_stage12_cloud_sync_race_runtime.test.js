import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function read(file) {
  return readFileSync(file, 'utf8');
}

test('stage 12 cloud sync race guard is wired into refactor guardrails', () => {
  execFileSync(process.execPath, ['tools/wp_cloud_sync_race_contract.mjs'], { stdio: 'pipe' });

  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:cloud-sync-races/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /refactor_stage12_cloud_sync_race_runtime\.test\.js/
  );
});

test('stage 12 cloud sync race fix resets stale in-flight follow-up queues', () => {
  const source = read('esm/native/services/cloud_sync_coalescer_queue_runtime.ts');
  assert.match(
    source,
    /context\.state\.queued && \(context\.deps\.isDisposed\(\) \|\| context\.deps\.isSuppressed\(\)\)/
  );
  assert.match(source, /resetPullCoalescerState\(context\.state\);/);
});
