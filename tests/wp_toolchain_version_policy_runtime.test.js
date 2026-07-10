import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  collectToolchainVersionPolicy,
  createFormattedToolchainVersionPolicyMarkdown,
} from '../tools/wp_toolchain_version_policy.mjs';

test('toolchain version policy exact-pins core lint and TypeScript tools', () => {
  const policy = collectToolchainVersionPolicy();
  assert.deepEqual(policy.violations, []);

  const byName = new Map(policy.rows.map(row => [row.name, row]));
  for (const name of ['typescript', 'eslint', 'oxlint', 'oxlint-tsgolint', 'oxc-parser']) {
    const row = byName.get(name);
    assert.ok(row, `${name} should be tracked`);
    assert.match(row.packageJsonVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(row.packageJsonVersion, row.lockRootVersion);
    assert.equal(row.packageJsonVersion, row.installedVersion);
  }

  assert.equal(byName.get('typescript').packageJsonVersion, '7.0.2');
  assert.equal(byName.get('eslint').packageJsonVersion, '10.6.0');
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
