import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  listTestGroupScriptBindings,
  readTestGroup,
  readTestGroupFiles,
  validateTestGroupCatalog,
} from '../tools/wp_test_group_catalog.mjs';
import { parseTestGroupArgs, resolveTestGroupPlan } from '../tools/wp_test_group.mjs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('test group catalog owns refactor-stage guard membership and metadata', () => {
  const group = readTestGroup('refactor-stage-guards');
  assert.equal(group.runner, 'node-test');
  assert.equal(group.environment, 'node');
  assert.equal(group.portfolioRole, 'architecture');
  assert.equal(group.kind, 'architecture-guard');
  assert.deepEqual(group.owners, ['architecture/control-plane']);
  assert.ok(group.files.length > 50);
  assert.equal(new Set(group.files).size, group.files.length);
  for (const file of group.files) assert.equal(fs.existsSync(file), true, `${file} should exist`);
});

test('test group reads return defensive owner, file, and serial-policy copies', () => {
  const first = readTestGroup('tab-surfaces');
  const second = readTestGroup('tab-surfaces');
  first.files.pop();
  first.owners.pop();
  first.serialPolicy.batchSize = 99;
  assert.notEqual(first.files.length, second.files.length);
  assert.notEqual(first.owners.length, second.owners.length);
  assert.equal(second.serialPolicy.batchSize, 1);
  const firstFiles = readTestGroupFiles('refactor-stage-guards');
  const secondFiles = readTestGroupFiles('refactor-stage-guards');
  firstFiles.pop();
  assert.notEqual(firstFiles.length, secondFiles.length);
});

test('test group catalog validates runners, primary ownership, and unique script bindings', () => {
  assert.deepEqual(validateTestGroupCatalog(), []);
  const bindings = listTestGroupScriptBindings();
  assert.equal(bindings.length, 10);
  assert.equal(new Set(bindings.map(binding => binding.script)).size, bindings.length);

  const invalidCatalog = {
    alpha: {
      script: 'test:alpha',
      description: 'alpha',
      kind: 'runtime-portfolio',
      owners: ['alpha'],
      environment: 'tsx',
      runner: 'tsx-test',
      portfolioRole: 'primary',
      files: ['tests/example_runtime.test.ts'],
    },
    beta: {
      script: 'test:beta',
      description: 'beta',
      kind: 'runtime-portfolio',
      owners: ['beta'],
      environment: 'tsx',
      runner: 'tsx-test',
      portfolioRole: 'primary',
      files: ['tests/example_runtime.test.ts'],
    },
  };
  assert.ok(
    validateTestGroupCatalog(invalidCatalog).some(issue => issue.code === 'primary-portfolio-overlap')
  );
});

test('test group runner validates args and missing files before spawning', () => {
  assert.deepEqual(parseTestGroupArgs(['refactor-stage-guards', '--print', '--dry-run']), {
    groupName: 'refactor-stage-guards',
    list: false,
    print: true,
    dryRun: true,
  });
  assert.throws(() => parseTestGroupArgs(['refactor-stage-guards', '--unknown']), /unknown test-group/);
  assert.throws(() => resolveTestGroupPlan({ groupName: 'missing' }), /unknown test group/);
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-group-'));
  assert.throws(
    () => resolveTestGroupPlan({ projectRoot, groupName: 'refactor-stage-guards' }),
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
  assert.equal(packageJson.scripts['test:mirror-runtime'], 'node tools/wp_test_group.mjs mirror-runtime');
  const plan = resolveTestGroupPlan({ groupName: 'mirror-runtime' });
  assert.deepEqual(plan.args.slice(0, 3), ['--import', 'tsx', '--test']);
  assert.equal(plan.kind, 'runtime-integration');
});

test('order PDF overlay core uses the central catalog instead of a package file list', () => {
  const group = readTestGroup('order-pdf-overlay-core');
  assert.equal(group.kind, 'ui-runtime-integration');
  assert.equal(group.runner, 'tsx-test');
  assert.deepEqual(group.owners, ['ui/order-pdf']);
  assert.ok(group.files.includes('tests/order_pdf_overlay_editor_mode_state_runtime.test.ts'));
  assert.equal(
    packageJson.scripts['test:order-pdf-surfaces:overlay-core'],
    'node tools/wp_test_group.mjs order-pdf-overlay-core'
  );
  const plan = resolveTestGroupPlan({ groupName: 'order-pdf-overlay-core' });
  assert.deepEqual(plan.args.slice(0, 3), ['--import', 'tsx', '--test']);
  assert.equal(plan.files.length, 10);
});

test('major portfolio lanes are short package facades backed by one catalog', () => {
  const expected = {
    'tab-surfaces': 'test:tab-surfaces',
    'canvas-surfaces': 'test:canvas-surfaces',
    'structure-tab-family-core': 'test:structure-tab-family-core',
    'project-surfaces': 'test:project-surfaces',
    'toolchain-surfaces': 'test:toolchain-surfaces',
    'public-surfaces': 'test:public-surfaces',
  };
  for (const [groupName, scriptName] of Object.entries(expected)) {
    const group = readTestGroup(groupName);
    assert.equal(group.script, scriptName);
    assert.equal(packageJson.scripts[scriptName], `node tools/wp_test_group.mjs ${groupName}`);
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
