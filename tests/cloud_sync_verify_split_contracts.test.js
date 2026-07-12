import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { readTestGroup } from '../tools/wp_test_group_catalog.mjs';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('cloud sync verify split delegates stable batch scripts to canonical groups', () => {
  const scripts = pkg.scripts;
  assert.equal(
    scripts['test:cloud-sync-surfaces'],
    'npm run test:cloud-sync-surfaces:lifecycle && npm run test:cloud-sync-surfaces:main-row && npm run test:cloud-sync-surfaces:panel && npm run test:cloud-sync-surfaces:sync-ops && npm run test:cloud-sync-surfaces:tabs-ui'
  );
  const serialBatchScripts = [
    ['cloud-sync-lifecycle', 'test:cloud-sync-surfaces:lifecycle', 'lifecycle'],
    ['cloud-sync-main-row', 'test:cloud-sync-surfaces:main-row', 'main-row'],
    ['cloud-sync-sync-ops', 'test:cloud-sync-surfaces:sync-ops', 'sync-ops'],
  ];
  for (const [groupName, scriptName, artifactId] of serialBatchScripts) {
    assert.equal(scripts[scriptName], `node tools/wp_test_group.mjs ${groupName}`);
    const group = readTestGroup(groupName);
    assert.equal(group?.runner, 'serial-tsx');
    assert.deepEqual(group?.serialPolicy, {
      batchSize: 3,
      heartbeatMs: 10000,
      timeoutMs: 120000,
      failedFilesPath: `.artifacts/cloud-sync-surfaces.${artifactId}.failed.txt`,
      timingsPath: `.artifacts/cloud-sync-surfaces.${artifactId}.timings.json`,
    });
  }
  const tsxBatchGroups = [
    ['cloud-sync-panel-install', 'test:cloud-sync-surfaces:panel-install'],
    ['cloud-sync-panel-controller', 'test:cloud-sync-surfaces:panel-controller'],
    ['cloud-sync-panel-subscriptions', 'test:cloud-sync-surfaces:panel-subscriptions'],
    ['cloud-sync-panel-snapshots', 'test:cloud-sync-surfaces:panel-snapshots'],
    ['cloud-sync-tabs-ui', 'test:cloud-sync-surfaces:tabs-ui'],
  ];
  for (const [groupName, scriptName] of tsxBatchGroups) {
    assert.equal(scripts[scriptName], `node tools/wp_test_group.mjs ${groupName}`);
    assert.equal(readTestGroup(groupName)?.runner, 'tsx-test');
  }
});
