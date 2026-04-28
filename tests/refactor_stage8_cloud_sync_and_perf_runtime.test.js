import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function runNode(script) {
  return execFileSync(process.execPath, [script], { encoding: 'utf8' });
}

test('stage8 cloud sync and perf guard scripts pass and are part of refactor guardrails', () => {
  assert.match(runNode('tools/wp_cloud_sync_timer_contract.mjs'), /cloud-sync-timer-contract\] ok/);
  assert.match(runNode('tools/wp_perf_hotpath_contract.mjs'), /perf-hotpath-contract\] ok/);

  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(pkg.scripts['check:cloud-sync-timers'], 'node tools/wp_cloud_sync_timer_contract.mjs');
  assert.equal(pkg.scripts['check:perf-hotpaths'], 'node tools/wp_perf_hotpath_contract.mjs');
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:cloud-sync-timers/);
  assert.match(pkg.scripts['check:refactor-guardrails'], /check:perf-hotpaths/);
});

test('stage8 cloud sync panel snapshots use browser timer owner instead of direct global fallbacks', () => {
  const source = readFileSync('esm/native/services/cloud_sync_panel_api_snapshots_runtime.ts', 'utf8');
  assert.match(source, /import \{ getBrowserTimers \} from '\.\.\/runtime\/api\.js';/);
  assert.match(source, /const timers = getBrowserTimers\(deps\.App\);/);
  assert.doesNotMatch(source, /:\s*setTimeout\b/);
  assert.doesNotMatch(source, /:\s*clearTimeout\b/);
});

test('stage8 builder handles hotpath does not keep an unused timing probe', () => {
  const source = readFileSync('esm/native/builder/handles_apply.ts', 'utf8');
  assert.doesNotMatch(source, /performance\.now\s*\(/);
  assert.doesNotMatch(source, /Date\.now\s*\(/);
  assert.match(source, /runPlatformRenderFollowThrough\(App, \{ updateShadows: false \}\)/);
});
