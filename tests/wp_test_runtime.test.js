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
import { ensureDistBuilt, runTestFlow } from '../tools/wp_test_flow.js';

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
