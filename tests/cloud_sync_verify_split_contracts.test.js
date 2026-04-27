import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('cloud sync verify split keeps stable batch scripts', () => {
  const scripts = pkg.scripts;
  assert.equal(scripts['test:cloud-sync-surfaces'], 'node tools/wp_verify_cloud_sync_surfaces.cjs');
  const serialBatchScripts = [
    'test:cloud-sync-surfaces:lifecycle',
    'test:cloud-sync-surfaces:main-row',
    'test:cloud-sync-surfaces:sync-ops',
  ];
  for (const key of serialBatchScripts) {
    assert.equal(typeof scripts[key], 'string');
    assert.match(scripts[key], /wp_serial_tests\.mjs/);
  }
  const tsxBatchScripts = [
    'test:cloud-sync-surfaces:panel-install',
    'test:cloud-sync-surfaces:panel-controller',
    'test:cloud-sync-surfaces:panel-subscriptions',
    'test:cloud-sync-surfaces:panel-snapshots',
    'test:cloud-sync-surfaces:tabs-ui',
  ];
  for (const key of tsxBatchScripts) {
    assert.equal(typeof scripts[key], 'string');
    assert.match(scripts[key], /wp_run_tsx_tests\.mjs/);
  }
});
