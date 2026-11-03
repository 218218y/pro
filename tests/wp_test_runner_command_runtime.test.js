import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

import { buildTsxTestRun, TEST_ISOLATION_NONE_ARGUMENT } from '../tools/wp_test_runner_command.mjs';
import { readNodeRuntimePolicy } from '../tools/wp_node_runtime_policy.mjs';

const projectRoot = process.cwd();
const canonicalResolverPath = path.join(projectRoot, 'tools', 'wp_test_runner_command.mjs');
const currentTestPath = path.join(projectRoot, 'tests', 'wp_test_runner_command_runtime.test.js');

function collectFiles(root, extensions) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath, extensions));
    else if (extensions.has(path.extname(entry.name))) files.push(entryPath);
  }
  return files;
}

test('supported Node executes the stable isolation flag before test files', () => {
  const testRun = buildTsxTestRun(projectRoot, ['tests/example.test.ts'], [TEST_ISOLATION_NONE_ARGUMENT]);
  assert.ok(
    testRun.args.indexOf(TEST_ISOLATION_NONE_ARGUMENT) < testRun.args.indexOf('tests/example.test.ts')
  );
  assert.equal(testRun.command.includes(TEST_ISOLATION_NONE_ARGUMENT), true);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'node24-isolation-'));
  try {
    const fixture = path.join(directory, 'isolation.test.mjs');
    fs.writeFileSync(fixture, "import test from 'node:test'; test('stable isolation', () => {});\n");
    const result = spawnSync(process.execPath, ['--test', TEST_ISOLATION_NONE_ARGUMENT, fixture], {
      cwd: projectRoot,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('serial runner accepts only the stable isolation argument', () => {
  const fixture = path.join(projectRoot, 'tests', 'fixtures', 'wp_signal_fixture.test.js');
  const result = spawnSync(
    process.execPath,
    [
      path.join(projectRoot, 'tools', 'wp_serial_tests.mjs'),
      '--test-runner-arg',
      '--trace-warnings',
      fixture,
    ],
    { cwd: projectRoot, encoding: 'utf8', windowsHide: true }
  );

  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(result.stderr, /Unsupported --test-runner-arg value: --trace-warnings/u);
});

test('test isolation flags stay out of NODE_OPTIONS and literals stay in the resolver', () => {
  const candidates = [
    ...collectFiles(path.join(projectRoot, 'tools'), new Set(['.mjs', '.js'])),
    ...collectFiles(path.join(projectRoot, 'tests'), new Set(['.js', '.mjs', '.ts', '.tsx'])),
  ];
  const literalPattern = /--test-isolation=none/u;
  const experimentalPattern = /--experimental-test-isolation/u;
  const nodeOptionsPattern = /NODE_OPTIONS[^\n\r]{0,240}test-isolation/u;

  for (const filePath of candidates) {
    const source = fs.readFileSync(filePath, 'utf8');
    if (filePath === currentTestPath) continue;
    assert.doesNotMatch(source, nodeOptionsPattern, `${filePath} puts test isolation in NODE_OPTIONS`);
    if (filePath === canonicalResolverPath) continue;
    assert.doesNotMatch(source, experimentalPattern, `${filePath} hard-codes the retired experimental flag`);
    assert.doesNotMatch(source, literalPattern, `${filePath} hard-codes a test isolation argument`);
  }
});

test('Node runtime policy supports only Node 24', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const policy = readNodeRuntimePolicy(projectRoot);
  assert.equal(policy.major, 24);
  assert.equal(packageJson.engines?.node, policy.engineRange);
  assert.deepEqual(packageJson.devEngines?.runtime, {
    name: 'node',
    version: policy.engineRange,
    onFail: 'error',
  });
});
