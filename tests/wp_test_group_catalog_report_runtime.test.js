import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildTestGroupCatalogReport,
  renderTestGroupCatalogMarkdown,
} from '../tools/wp_test_group_catalog_report.mjs';

test('test-group catalog report exposes execution ownership and package bindings', () => {
  const report = buildTestGroupCatalogReport();
  assert.equal(report.summary.groups, 10);
  assert.equal(report.summary.scriptBindings, 10);
  assert.ok(report.summary.catalogFileReferences > 240);
  assert.ok(report.summary.directPackageTestReferences < 300);
  assert.deepEqual(report.failures, { catalogIssues: [], bindingIssues: [] });

  const tabSurfaces = report.groups.find(group => group.name === 'tab-surfaces');
  assert.equal(tabSurfaces.runner, 'serial-tsx');
  assert.equal(tabSurfaces.portfolioRole, 'primary');
  assert.deepEqual(tabSurfaces.serialPolicy, { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 });
  assert.ok(tabSurfaces.fileCount > 50);

  const markdown = renderTestGroupCatalogMarkdown(report);
  assert.match(markdown, /Primary portfolio groups must not overlap/i);
  assert.match(markdown, /`test:tab-surfaces`/);
});

test('test-group catalog report fails closed when a package facade drifts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-group-report-'));
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.scripts['test:canvas-surfaces'] = 'node --test tests/other.test.js';
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);

  const report = buildTestGroupCatalogReport(root);
  assert.equal(report.failures.catalogIssues.length, 0);
  assert.deepEqual(report.failures.bindingIssues, [
    {
      code: 'stale-package-script-binding',
      group: 'canvas-surfaces',
      script: 'test:canvas-surfaces',
      expectedCommand: 'node tools/wp_test_group.mjs canvas-surfaces',
      actualCommand: 'node --test tests/other.test.js',
    },
  ]);
});
