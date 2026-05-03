import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  parseTestArgs,
  selectRunnableTests,
  createNoTestsMessage,
  createRunBanner,
} from '../tools/wp_test_state.js';
import { getNodeArgs } from '../tools/wp_test_shared.js';
import { ensureDistBuilt, extractFailedTestNames, runTestFlow } from '../tools/wp_test_flow.js';
import { formatNodeTestOutputForConsole, isNodeTestSummaryDiagnosticLine } from '../tools/wp_test_console.js';

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-test-'));
}

test('test arg parsing keeps tsx/no-build/pattern policy canonical', () => {
  assert.deepEqual(parseTestArgs(['--tsx', '--no-build', '--pattern', 'door']), {
    forceTsx: true,
    noBuild: true,
    pattern: 'door',
  });
  assert.deepEqual(parseTestArgs([]), {
    forceTsx: false,
    noBuild: false,
    pattern: '',
  });
});

test('test selection filters by pattern and skips playwright e2e specs', () => {
  const root = tempDir();
  fs.mkdirSync(path.join(root, 'tests', 'unit'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests', 'e2e'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'door_runtime.test.js'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'unit', 'other_runtime.test.ts'), 'export {}\n', 'utf8');
  fs.writeFileSync(path.join(root, 'tests', 'e2e', 'smoke.spec.ts'), 'export {}\n', 'utf8');

  const selected = selectRunnableTests({ projectRoot: root, pattern: 'door' });
  assert.equal(selected.files.length, 1);
  assert.match(selected.files[0], /door_runtime\.test\.js$/);
  assert.equal(selected.skippedE2E, 0, 'pattern filtering happens before e2e skip accounting');

  const allSelected = selectRunnableTests({ projectRoot: root, pattern: '' });
  assert.equal(allSelected.files.length, 2);
  assert.equal(allSelected.skippedE2E, 1);
  assert.match(createNoTestsMessage({ skippedE2E: 1 }), /Playwright E2E specs are skipped/);
  assert.match(createRunBanner({ files: allSelected.files, flags: ['forced tsx'] }), /forced tsx/);
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
