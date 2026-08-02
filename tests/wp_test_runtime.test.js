import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseTestArgs,
  parseShardValue,
  selectRunnableTests,
  selectShardFiles,
  createNoTestsMessage,
  createRunBanner,
} from '../tools/wp_test_state.js';
import {
  createBalancedTestShardPlan,
  estimateTestShardCost,
  KNOWN_SLOW_TEST_COSTS,
} from '../tools/wp_test_shard_policy.js';
import { getNodeArgs } from '../tools/wp_test_shared.js';
import { ensureDistBuilt, extractFailedTestNames, runTestFlow } from '../tools/wp_test_flow.js';
import { formatNodeTestOutputForConsole, isNodeTestSummaryDiagnosticLine } from '../tools/wp_test_console.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-'));
}

test('test arg parsing keeps tsx/no-build/pattern and parallel policy canonical', () => {
  assert.deepEqual(
    parseTestArgs([
      '--tsx',
      '--no-build',
      '--pattern',
      'door',
      '--batch-size',
      '32',
      '--jobs=3',
      '--shard=2/3',
    ]),
    {
      forceTsx: true,
      noBuild: true,
      pattern: 'door',
      serial: false,
      batchSize: 32,
      jobs: 3,
      shard: { index: 2, total: 3 },
    }
  );
  assert.deepEqual(parseTestArgs(['--serial']), {
    forceTsx: false,
    noBuild: false,
    pattern: '',
    serial: true,
    batchSize: null,
    jobs: null,
    shard: null,
  });
  assert.deepEqual(parseShardValue('1/2'), { index: 1, total: 2 });
  assert.throws(() => parseShardValue('0/2'), /invalid --shard value/);
  assert.throws(() => parseShardValue('3/2'), /invalid --shard value/);
});

test('test selection filters by pattern and skips playwright e2e specs', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests', 'unit'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'door_runtime.test.js'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'other_runtime.test.ts'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'smoke.spec.ts'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'ui_contract.test.cjs'), 'module.exports = {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'runtime_helpers.ts'), 'export {}\n', 'utf8');

  const selected = selectRunnableTests({ projectRoot: root, pattern: 'door' });
  assert.equal(selected.files.length, 1);
  assert.match(selected.files[0], /door_runtime\.test\.js$/);
  assert.equal(selected.skippedE2E, 0, 'pattern filtering happens before e2e skip accounting');

  const allSelected = selectRunnableTests({ projectRoot: root, pattern: '' });
  assert.equal(allSelected.files.length, 3);
  assert.ok(allSelected.files.some(file => file.endsWith('ui_contract.test.cjs')));
  assert.ok(allSelected.files.every(file => !file.endsWith('runtime_helpers.ts')));
  assert.equal(allSelected.skippedE2E, 1);
  assert.match(createNoTestsMessage({ skippedE2E: 1 }), /Playwright E2E specs are skipped/);
  assert.match(createRunBanner({ files: allSelected.files, flags: ['forced tsx'] }), /forced tsx/);
});

test('test selection cost-balances three shards without overlap', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests', 'unit'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true });
  for (const name of ['a.test.js', 'b.test.js', 'c.test.ts', 'd.test.js', 'e.test.ts']) {
    fs.writeFileSync(path.join(root, 'tests', 'unit', name), 'export {}\n', 'utf8');
  }
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'smoke.spec.ts'), 'export {}\n', 'utf8');

  const allSelected = selectRunnableTests({ projectRoot: root, pattern: '', shard: null });
  const shards = [1, 2, 3].map(index =>
    selectRunnableTests({ projectRoot: root, pattern: '', shard: { index, total: 3 } })
  );

  assert.equal(allSelected.files.length, 5);
  assert.equal(shards[0].skippedE2E, 1);
  assert.equal(shards[0].totalRunnableFiles, 5);
  assert.deepEqual(shards.flatMap(shard => shard.files).sort(), allSelected.files);
  assert.equal(new Set(shards.flatMap(shard => shard.files)).size, allSelected.files.length);
  assert.deepEqual(selectShardFiles(['a', 'b', 'c', 'd'], { index: 2, total: 2 }), ['b', 'd']);
});

test('test shard planner uses measured costs instead of file count or alphabetical position', () => {
  const files = ['heavy-a', 'heavy-b', 'heavy-c', 'light-a', 'light-b', 'light-c'];
  const costs = new Map([
    ['heavy-a', 10],
    ['heavy-b', 9],
    ['heavy-c', 8],
    ['light-a', 1],
    ['light-b', 1],
    ['light-c', 1],
  ]);
  const plan = createBalancedTestShardPlan(files, 3, {
    costForFile: file => costs.get(file),
  });

  assert.deepEqual(
    plan.map(shard => shard.estimatedCost),
    [10, 10, 10]
  );
  assert.ok(plan.every(shard => shard.files.some(file => file.startsWith('heavy-'))));
  assert.deepEqual(plan.flatMap(shard => shard.files).sort(), files.slice().sort());
  assert.throws(
    () => createBalancedTestShardPlan(['invalid'], 1, { costForFile: () => 0 }),
    /invalid test shard cost/
  );
});

test('measured slow-test shard costs reference live canonical tests', () => {
  const projectRoot = fileURLToPath(new URL('..', import.meta.url));
  for (const [relativePath, expectedCost] of Object.entries(KNOWN_SLOW_TEST_COSTS)) {
    const absolutePath = path.resolve(projectRoot, relativePath);
    assert.equal(fs.existsSync(absolutePath), true, `${relativePath} is missing`);
    assert.equal(estimateTestShardCost(absolutePath, projectRoot), expectedCost);
  }
});

test('test flow derives tsx loader when ts tests exist and dist build is missing', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'runtime.test.ts'), 'export {}\n', 'utf8');
  fs.mkdirSync(path.join(root, 'node_modules', 'tsx'), { recursive: true });
  fs.writeFileSync(path.join(root, 'node_modules', 'tsx', 'package.json'), '{"name":"tsx"}\n', 'utf8');

  const buildCalls = [];
  const runCalls = [];
  const result = runTestFlow({
    projectRoot: root,
    childEnv: process.env,
    flags: { forceTsx: false, noBuild: false, pattern: '' },
    runners: {
      runCmd({ args }) {
        buildCalls.push(args);
        fs.mkdirSync(path.join(root, 'dist', 'esm'), { recursive: true });
        fs.writeFileSync(path.join(root, 'dist', 'esm', 'main.js'), 'export {}\n', 'utf8');
        return { status: 0 };
      },
      runOne({ filePath, nodeArgs }) {
        runCalls.push({ filePath, nodeArgs });
        return { status: 0 };
      },
    },
  });

  assert.equal(buildCalls.length, 1);
  assert.deepEqual(buildCalls[0], ['tools/wp_build_dist.js', '--no-assets']);
  assert.equal(runCalls.length, 1);
  assert.deepEqual(runCalls[0].nodeArgs, ['--import', 'tsx']);
  assert.equal(result.ok, true);
});

test('test flow batches files by default and keeps serial fallback opt-in', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist', 'esm'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'esm', 'main.js'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'a_runtime.test.js'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'b_runtime.test.js'), 'export {}\n', 'utf8');

  const batchCalls = [];
  const runCalls = [];
  const result = runTestFlow({
    projectRoot: root,
    childEnv: { ...process.env, WP_TEST_BATCH_SIZE: '1', WP_TEST_JOBS: '2' },
    flags: { forceTsx: false, noBuild: true, pattern: '', serial: false, batchSize: null, jobs: null },
    runners: {
      runBatch({ batch, jobs }) {
        batchCalls.push({ batch, jobs });
        return { status: 0 };
      },
      runOne({ filePath }) {
        runCalls.push(filePath);
        return { status: 0 };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(batchCalls.length, 0, 'custom runOne keeps legacy serial unit-test path');
  assert.equal(runCalls.length, 2);

  const realBatchCalls = [];
  const batched = runTestFlow({
    projectRoot: root,
    childEnv: { ...process.env, WP_TEST_BATCH_SIZE: '1', WP_TEST_JOBS: '2' },
    flags: { forceTsx: false, noBuild: true, pattern: '', serial: false, batchSize: null, jobs: null },
    runners: {
      runBatch({ batch, jobs }) {
        realBatchCalls.push({ batch, jobs });
        return { status: 0 };
      },
    },
  });

  assert.equal(batched.ok, true);
  assert.equal(realBatchCalls.length, 2);
  assert.deepEqual(
    realBatchCalls.map(call => call.jobs),
    [2, 2]
  );
});

test('test flow writes failure diagnostics with parsed test names and junit output', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.mkdirSync(path.join(root, 'dist', 'esm'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'esm', 'main.js'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'failing_runtime.test.js'), 'export {}\n', 'utf8');

  const reportDir = path.join(root, '.artifacts', 'test-report');
  const output = [
    'TAP version 13',
    '# Subtest: keeps saved model payload stable',
    'not ok 1 - keeps saved model payload stable',
    '  ---',
    '  error: expected payload to be stable',
    '  ...',
  ].join('\n');

  const result = runTestFlow({
    projectRoot: root,
    childEnv: { ...process.env, WP_TEST_REPORT_DIR: reportDir },
    flags: { forceTsx: false, noBuild: true, pattern: '' },
    runners: {
      runOne() {
        return { status: 1, stdout: output, stderr: 'AssertionError: expected payload to be stable\n' };
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.fail, 1);
  assert.deepEqual(result.failures[0].failedTests, ['keeps saved model payload stable']);

  const markdown = fs.readFileSync(path.join(reportDir, 'failed-tests.md'), 'utf8');
  const junit = fs.readFileSync(path.join(reportDir, 'junit', 'wp-tests.xml'), 'utf8');
  const summary = JSON.parse(fs.readFileSync(path.join(reportDir, 'failure-summary.json'), 'utf8'));

  assert.match(markdown, /keeps saved model payload stable/);
  assert.match(markdown, /tests\/failing_runtime\.test\.js/);
  assert.match(junit, /keeps saved model payload stable/);
  assert.equal(summary.failedFiles[0].file, 'tests/failing_runtime.test.js');
  assert.ok(fs.existsSync(path.join(reportDir, 'logs', 'tests_failing_runtime.test.js.log')));
});

test('test console formatter removes node:test blue info summary diagnostics only', () => {
  assert.equal(isNodeTestSummaryDiagnosticLine('ℹ tests 4'), true);
  assert.equal(isNodeTestSummaryDiagnosticLine('\u001b[34mℹ tests 4\u001b[39m'), true);
  assert.equal(isNodeTestSummaryDiagnosticLine('# pass 3'), true);
  assert.equal(isNodeTestSummaryDiagnosticLine('✔ keeps saved swatches stable (1.2ms)'), false);
  assert.equal(isNodeTestSummaryDiagnosticLine('✖ fails with useful assertion (1.2ms)'), false);

  const formatted = formatNodeTestOutputForConsole(
    [
      '✔ keeps saved swatches stable (1.2ms)',
      'ℹ tests 1',
      'ℹ suites 0',
      'ℹ pass 1',
      'ℹ fail 0',
      'ℹ duration_ms 12.5',
      '',
    ].join('\n')
  );
  assert.equal(formatted, '✔ keeps saved swatches stable (1.2ms)\n');
});

test('failed test parser supports TAP and spec-style failure lines', () => {
  assert.deepEqual(
    extractFailedTestNames('not ok 12 - applies material safely\n✖ renders saved swatch row (3.2ms)\n'),
    ['applies material safely', 'renders saved swatch row']
  );
});

test('ensureDistBuilt fails in no-build mode when dist is missing', () => {
  const root = tempDir();
  assert.throws(
    () => ensureDistBuilt({ projectRoot: root, childEnv: process.env, noBuild: true }),
    /dist is missing/
  );
});

test('getNodeArgs stays empty when only js tests exist', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'runtime.test.js'), 'export {}\n', 'utf8');
  assert.deepEqual(getNodeArgs({ projectRoot: root, forceTsx: false }), []);
});

test('canonical test discovery accepts test/spec extensions and rejects helpers and fixtures', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests', 'nested'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests', 'e2e', 'helpers'), { recursive: true });
  for (const name of ['a.test.js', 'b.test.cjs', 'c.test.mjs', 'd.test.ts', 'e.test.tsx', 'f.spec.js']) {
    fs.writeFileSync(path.join(root, 'tests', 'nested', name), '', 'utf8');
  }
  fs.writeFileSync(path.join(root, 'tests', 'nested', 'runtime_helpers.ts'), '', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'smoke.spec.ts'), '', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'helpers', 'fixture.ts'), '', 'utf8');

  const selected = selectRunnableTests({ projectRoot: root, pattern: '', shard: null });
  assert.equal(selected.allFiles.length, 7);
  assert.equal(selected.files.length, 6);
  assert.equal(selected.skippedE2E, 1);
  assert.ok(selected.files.some(file => file.endsWith('b.test.cjs')));
  assert.ok(selected.files.every(file => !file.includes('helpers')));
});
