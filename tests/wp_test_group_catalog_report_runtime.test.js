import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { TEST_GROUP_CATALOG } from '../tools/wp_test_group_catalog.mjs';
import {
  buildTestGroupCatalogReport,
  renderTestGroupCatalogMarkdown,
} from '../tools/wp_test_group_catalog_report.mjs';

function writeTempPackage(packageJson) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-group-report-'));
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  return root;
}

test('test-group catalog report exposes canonical ownership and one generic package runner', () => {
  const report = buildTestGroupCatalogReport();
  const catalogGroupCount = Object.keys(TEST_GROUP_CATALOG).length;
  assert.equal(report.summary.groups, catalogGroupCount);
  assert.equal(report.summary.genericRunnerScript, 'test:group');
  assert.equal(
    report.summary.catalogFileReferences,
    report.groups.reduce((total, group) => total + group.directFileCount, 0)
  );
  assert.ok(report.summary.sequenceResolvedFileReferences > 0);
  assert.ok(report.summary.catalogFileReferences > report.summary.directPackageTestReferences);
  assert.deepEqual(report.failures, {
    catalogIssues: [],
    runnerIssues: [],
    legacyFacadeIssues: [],
  });

  for (const groupName of [
    'order-pdf-overlay-core',
    'order-pdf-surfaces',
    'cloud-sync-surfaces',
    'sketch-surfaces',
    'verification-control-plane',
  ]) {
    assert.ok(
      report.groups.some(group => group.name === groupName),
      `${groupName} should stay cataloged`
    );
  }

  const verificationControlPlane = report.groups.find(group => group.name === 'verification-control-plane');
  assert.equal(verificationControlPlane.runner, 'node-test');
  assert.equal('environment' in verificationControlPlane, false);
  assert.equal(verificationControlPlane.portfolioRole, 'focused');
  assert.equal(verificationControlPlane.directFileCount, 4);

  const orderPdf = report.groups.find(group => group.name === 'order-pdf-surfaces');
  assert.equal(orderPdf.runner, 'group-sequence');
  assert.equal(orderPdf.directFileCount, 0);
  assert.equal(orderPdf.resolvedFileCount, 32);
  assert.equal(orderPdf.childGroups.length, 7);

  const tabSurfaces = report.groups.find(group => group.name === 'tab-surfaces');
  assert.equal(tabSurfaces.runner, 'serial-tsx');
  assert.equal(tabSurfaces.portfolioRole, 'primary');
  assert.deepEqual(tabSurfaces.serialPolicy, { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 });
  assert.ok(tabSurfaces.directFileCount > 50);

  const markdown = renderTestGroupCatalogMarkdown(report);
  assert.match(markdown, /Primary portfolio groups must not overlap/i);
  assert.match(markdown, /one generic `test:group` runner/i);
  assert.doesNotMatch(markdown, /\| Environment \|/);
  assert.doesNotMatch(markdown, /`test:tab-surfaces`/);
});

test('test-group catalog report fails closed when the generic runner drifts', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.scripts['test:group'] = 'node tools/other_runner.mjs';
  const report = buildTestGroupCatalogReport(writeTempPackage(packageJson));
  assert.equal(report.failures.catalogIssues.length, 0);
  assert.deepEqual(report.failures.runnerIssues, [
    {
      code: 'invalid-generic-test-group-runner',
      script: 'test:group',
      expectedCommand: 'node tools/wp_test_group.mjs',
      actualCommand: 'node tools/other_runner.mjs',
    },
  ]);
});

test('test-group catalog report rejects reintroduced per-group package facades', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.scripts['test:canvas-surfaces'] = 'node tools/wp_test_group.mjs canvas-surfaces';
  const report = buildTestGroupCatalogReport(writeTempPackage(packageJson));
  assert.deepEqual(report.failures.runnerIssues, []);
  assert.deepEqual(report.failures.legacyFacadeIssues, [
    {
      code: 'legacy-test-group-package-facade',
      script: 'test:canvas-surfaces',
      command: 'node tools/wp_test_group.mjs canvas-surfaces',
    },
  ]);
});
