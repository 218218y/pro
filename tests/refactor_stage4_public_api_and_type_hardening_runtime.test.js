import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function runNodeScript(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(
    result.status,
    0,
    `${script} ${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}

test('feature imports outside features use only the public manifest surface', () => {
  runNodeScript('tools/wp_features_public_api_contract.mjs');
});

test('production source does not use unsafe any casts', () => {
  runNodeScript('tools/wp_type_hardening_audit.mjs');
});

test('cloud sync lifecycle pull helper uses the runtime status contract without any-cast bypass', () => {
  const source = readFileSync('esm/native/services/cloud_sync_lifecycle_bindings.ts', 'utf8');
  assert.match(source, /CloudSyncRuntimeStatus/);
  assert.doesNotMatch(source, /as any/);
  assert.match(source, /runtimeStatus,\n\s+minGapMs/);
});

test('interior layout preset custom seeding is exposed through the family API entry', () => {
  const api = readFileSync('esm/native/features/interior_layout_presets/api.ts', 'utf8');
  const custom = readFileSync('esm/native/features/interior_layout_presets/custom_from_preset.ts', 'utf8');
  const manualOps = readFileSync(
    'esm/native/services/canvas_picking_manual_layout_config_ops_shared.ts',
    'utf8'
  );
  const directHitRecords = readFileSync(
    'esm/native/services/canvas_picking_sketch_direct_hit_workflow_records.ts',
    'utf8'
  );

  assert.match(api, /buildPresetBackedCustomData/);
  assert.match(api, /computeInteriorPresetOps/);
  assert.match(custom, /from '\.\/ops\.js'/);
  assert.match(manualOps, /features\/interior_layout_presets\/api\.js/);
  assert.match(directHitRecords, /features\/interior_layout_presets\/api\.js/);
  assert.doesNotMatch(manualOps, /custom_from_preset/);
  assert.doesNotMatch(directHitRecords, /custom_from_preset/);
});
