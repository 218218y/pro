import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  collectNodeRuntimePolicyViolations,
  parsePinnedNodeVersion,
  readNodeRuntimePolicy,
} from '../tools/wp_node_runtime_policy.mjs';
import {
  collectToolchainVersionPolicy,
  createFormattedToolchainVersionPolicyMarkdown,
} from '../tools/wp_toolchain_version_policy.mjs';

test('Node runtime policy is exact, aligned, and clean on the active toolchain', () => {
  const pinned = parsePinnedNodeVersion(fs.readFileSync('.node-version', 'utf8'));
  const policy = readNodeRuntimePolicy();
  assert.equal(pinned.major, 24);
  assert.deepEqual(policy, {
    ...pinned,
    versionFile: '.node-version',
    engineRange: '>=24 <25',
  });
  assert.deepEqual(collectNodeRuntimePolicyViolations(), []);
});

test('Node runtime policy rejects loose pins and the wrong runtime major', () => {
  assert.throws(() => parsePinnedNodeVersion('24'), /exact Node version/u);
  assert.throws(() => parsePinnedNodeVersion('24.18'), /exact Node version/u);
  assert.match(
    collectNodeRuntimePolicyViolations({ currentNodeVersion: '22.12.0' }).join('\n'),
    /does not match \.node-version major 24/u
  );
});

test('toolchain version policy exact-pins core lint and TypeScript tools', () => {
  const policy = collectToolchainVersionPolicy();
  assert.deepEqual(policy.violations, []);

  const byName = new Map(policy.rows.map(row => [row.name, row]));
  for (const name of ['typescript', '@types/node', 'eslint', 'oxlint', 'oxlint-tsgolint', 'oxc-parser']) {
    const row = byName.get(name);
    assert.ok(row, `${name} should be tracked`);
    assert.match(row.packageJsonVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(row.packageJsonVersion, row.lockRootVersion);
    assert.equal(row.packageJsonVersion, row.installedVersion);
  }

  assert.deepEqual(Object.fromEntries([...byName].map(([name, row]) => [name, row.packageJsonVersion])), {
    typescript: '7.0.2',
    '@types/node': '24.13.3',
    eslint: '10.7.0',
    oxlint: '1.74.0',
    'oxlint-tsgolint': '0.25.0',
    'oxc-parser': '0.140.0',
  });
  assert.equal(
    byName.get('@types/node').packageJsonVersion.split('.')[0],
    String(policy.nodeRuntimePolicy.major)
  );
});

test('toolchain version policy keeps removed TypeScript ESLint packages absent', () => {
  const policy = collectToolchainVersionPolicy();
  assert.deepEqual(policy.forbiddenPackageLabels, [
    'TS ESLint parser package',
    'TS ESLint plugin package',
    'TypeScript 6 compatibility package',
  ]);
  assert.equal(policy.forbiddenPackages.length, 3);
});

test('toolchain version policy generated docs are current', async () => {
  const policy = collectToolchainVersionPolicy();
  const expected = await createFormattedToolchainVersionPolicyMarkdown(policy);
  const current = fs.readFileSync('docs/TOOLCHAIN_VERSION_POLICY.md', 'utf8');
  assert.equal(current, expected);
});
