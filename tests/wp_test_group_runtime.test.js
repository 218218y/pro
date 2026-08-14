import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  listTestGroupNames,
  readTestGroup,
  readTestGroupFiles,
  resolveTestGroupFiles,
  resolveTestGroupLeafNames,
  validateTestGroupCatalog,
} from '../tools/wp_test_group_catalog.mjs';
import { parseTestGroupArgs, resolveTestGroupPlan } from '../tools/wp_test_group.mjs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function assertCanonicalTsxPlan(plan, group) {
  const testArgIndex = plan.args.indexOf('--test');
  assert.notEqual(testArgIndex, -1, 'tsx test plans must include the --test boundary');
  assert.deepEqual(plan.args.slice(testArgIndex + 1), group.files);

  if (plan.command === process.execPath) {
    assert.deepEqual(plan.args.slice(0, testArgIndex + 1), ['--import', 'tsx', '--test']);
    return;
  }

  assert.match(path.basename(plan.command), /^npx(?:\.cmd)?$/u);
  assert.deepEqual(plan.args.slice(0, testArgIndex + 1), ['--yes', 'tsx', '--test']);
}

test('test group catalog owns focused runtime membership and metadata', () => {
  const group = readTestGroup('mirror-runtime');
  assert.equal(group.runner, 'tsx-test');
  assert.equal(group.environment, 'tsx');
  assert.equal(group.portfolioRole, 'focused');
  assert.equal(group.kind, 'runtime-integration');
  assert.deepEqual(group.owners, ['platform/render-loop', 'runtime/planar-reflector']);
  assert.ok(group.files.length >= 6);
  assert.equal(new Set(group.files).size, group.files.length);
  for (const file of group.files) assert.equal(fs.existsSync(file), true, `${file} should exist`);
});

test('test group reads return defensive owner, file, group, and serial-policy copies', () => {
  const first = readTestGroup('tab-surfaces');
  const second = readTestGroup('tab-surfaces');
  first.files.pop();
  first.owners.pop();
  first.groups.push('not-real');
  first.serialPolicy.batchSize = 99;
  assert.notEqual(first.files.length, second.files.length);
  assert.notEqual(first.owners.length, second.owners.length);
  assert.notEqual(first.groups.length, second.groups.length);
  assert.equal(second.serialPolicy.batchSize, 1);

  const firstFiles = readTestGroupFiles('mirror-runtime');
  const secondFiles = readTestGroupFiles('mirror-runtime');
  firstFiles.pop();
  assert.notEqual(firstFiles.length, secondFiles.length);
});

test('test group catalog validates runners, primary ownership, and sequence topology', () => {
  assert.deepEqual(validateTestGroupCatalog(), []);
  assert.ok(listTestGroupNames().length > 60);

  const invalidCatalog = {
    alpha: {
      description: 'alpha',
      kind: 'runtime-portfolio',
      owners: ['alpha'],
      environment: 'tsx',
      runner: 'tsx-test',
      portfolioRole: 'primary',
      files: ['tests/example_runtime.test.ts'],
      groups: [],
    },
    beta: {
      description: 'beta',
      kind: 'runtime-portfolio',
      owners: ['beta'],
      environment: 'tsx',
      runner: 'tsx-test',
      portfolioRole: 'primary',
      files: ['tests/example_runtime.test.ts'],
      groups: [],
    },
  };
  assert.ok(
    validateTestGroupCatalog(invalidCatalog).some(issue => issue.code === 'primary-portfolio-overlap')
  );

  const cyclicCatalog = {
    alpha: {
      description: 'alpha',
      kind: 'group-sequence',
      owners: ['alpha'],
      environment: 'tsx',
      runner: 'group-sequence',
      portfolioRole: 'focused',
      files: [],
      groups: ['beta'],
    },
    beta: {
      description: 'beta',
      kind: 'group-sequence',
      owners: ['beta'],
      environment: 'tsx',
      runner: 'group-sequence',
      portfolioRole: 'focused',
      files: [],
      groups: ['alpha'],
    },
  };
  assert.ok(validateTestGroupCatalog(cyclicCatalog).some(issue => issue.code === 'group-sequence-cycle'));
});

test('package.json exposes one generic catalog runner and no per-group package facades', () => {
  assert.equal(packageJson.scripts['test:group'], 'node tools/wp_test_group.mjs');
  const legacyFacades = Object.entries(packageJson.scripts).filter(
    ([script, command]) =>
      script !== 'test:group' && /^node tools\/wp_test_group\.mjs\s+\S+/u.test(String(command).trim())
  );
  assert.deepEqual(legacyFacades, []);
});

test('test group runner validates args and missing files before spawning', () => {
  assert.deepEqual(parseTestGroupArgs(['mirror-runtime', '--print', '--dry-run']), {
    groupName: 'mirror-runtime',
    list: false,
    print: true,
    dryRun: true,
  });
  assert.throws(() => parseTestGroupArgs(['mirror-runtime', '--unknown']), /unknown test-group/);
  assert.throws(() => resolveTestGroupPlan({ groupName: 'missing' }), /unknown test group/);
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-group-'));
  assert.throws(
    () => resolveTestGroupPlan({ projectRoot, groupName: 'mirror-runtime' }),
    /references missing file/
  );
});

test('mirror runtime group owns the typed mirror verification lane', () => {
  const group = readTestGroup('mirror-runtime');
  assert.equal(group.kind, 'runtime-integration');
  assert.equal(group.runner, 'tsx-test');
  assert.deepEqual(group.owners, ['platform/render-loop', 'runtime/planar-reflector']);
  assert.ok(group.files.includes('tests/render_loop_mirror_driver_runtime.test.ts'));
  assert.ok(group.files.includes('tests/planar_reflector_render_pass_runtime.test.ts'));
  const plan = resolveTestGroupPlan({ groupName: 'mirror-runtime' });
  assertCanonicalTsxPlan(plan, group);
  assert.equal(plan.kind, 'runtime-integration');
});

test('order PDF overlay core uses the central catalog instead of a package file list', () => {
  const group = readTestGroup('order-pdf-overlay-core');
  assert.equal(group.kind, 'ui-runtime-integration');
  assert.equal(group.runner, 'tsx-test');
  assert.deepEqual(group.owners, ['ui/order-pdf']);
  assert.ok(group.files.includes('tests/order_pdf_overlay_editor_mode_state_runtime.test.ts'));
  const plan = resolveTestGroupPlan({ groupName: 'order-pdf-overlay-core' });
  assertCanonicalTsxPlan(plan, group);
  assert.equal(plan.files.length, 10);
});

test('aggregate suites compose canonical child groups without duplicating file inventories', () => {
  const expected = {
    'order-pdf-surfaces': [
      'order-pdf-overlay-core',
      'order-pdf-pdf-render',
      'order-pdf-sketch',
      'order-pdf-export-overlay',
      'order-pdf-export-builders',
      'order-pdf-export-capture',
      'order-pdf-export-text',
    ],
    'sketch-surfaces': [
      'sketch-manual-hover',
      'sketch-box-hover',
      'sketch-free-boxes',
      'sketch-render-visuals',
    ],
    'cloud-sync-panel': [
      'cloud-sync-panel-install',
      'cloud-sync-panel-controller',
      'cloud-sync-panel-subscriptions',
      'cloud-sync-panel-snapshots',
    ],
    'cloud-sync-surfaces': [
      'cloud-sync-lifecycle',
      'cloud-sync-main-row',
      'cloud-sync-panel',
      'cloud-sync-sync-ops',
      'cloud-sync-tabs-ui',
    ],
  };

  for (const [groupName, childGroups] of Object.entries(expected)) {
    const group = readTestGroup(groupName);
    assert.equal(group.runner, 'group-sequence');
    assert.deepEqual(group.files, []);
    assert.deepEqual(group.groups, childGroups);
    assert.ok(resolveTestGroupLeafNames(groupName).length >= childGroups.length);
    assert.ok(resolveTestGroupFiles(groupName).length > 0);
    const plan = resolveTestGroupPlan({ groupName });
    assert.equal(plan.command, null);
    assert.deepEqual(plan.groups, childGroups);
  }
});

test('major portfolio lanes remain catalog-owned without package-script mirrors', () => {
  for (const groupName of [
    'tab-surfaces',
    'canvas-surfaces',
    'structure-tab-family-core',
    'project-surfaces',
    'toolchain-surfaces',
    'public-surfaces',
  ]) {
    const group = readTestGroup(groupName);
    assert.ok(group.files.length >= 14, `${groupName} should own a meaningful lane`);
  }
});

test('serial portfolio groups resolve through the canonical serial runner policy', () => {
  const plan = resolveTestGroupPlan({ groupName: 'tab-surfaces' });
  assert.equal(plan.runner, 'serial-tsx');
  assert.equal(plan.environment, 'tsx');
  assert.equal(plan.command, process.execPath);
  assert.deepEqual(plan.args.slice(0, 7), [
    'tools/wp_serial_tests.mjs',
    '--batch-size',
    '1',
    '--heartbeat-ms',
    '0',
    '--timeout-ms',
    '0',
  ]);
  assert.equal(plan.files.length, 51);
});
