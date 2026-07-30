import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  collectNodeRuntimePolicyViolations,
  parsePinnedNodeVersion,
  readNodeRuntimePolicy,
} from '../tools/wp_node_runtime_policy.mjs';
import {
  APPROVED_DEV_DEP_VERSIONS,
  collectToolchainVersionPolicy,
  createFormattedToolchainVersionPolicyMarkdown,
  isTsgolintVersionAlignedWithTypeScript,
} from '../tools/wp_toolchain_version_policy.mjs';

test('Node runtime policy is exact, aligned, and clean on the active toolchain', () => {
  const pinned = parsePinnedNodeVersion(fs.readFileSync('.node-version', 'utf8'));
  const compatibility = parsePinnedNodeVersion(
    fs.readFileSync('.node-version-compat', 'utf8'),
    '.node-version-compat'
  );
  const policy = readNodeRuntimePolicy();
  assert.equal(pinned.major, 24);
  assert.equal(compatibility.major, 22);
  assert.equal(policy.version, pinned.version);
  assert.equal(policy.versionFile, '.node-version');
  assert.equal(policy.compatibilityVersion, compatibility.version);
  assert.equal(policy.compatibilityVersionFile, '.node-version-compat');
  assert.deepEqual(policy.supportedMajors, [22, 24]);
  assert.equal(policy.typeBaselineMajor, 22);
  assert.equal(policy.engineRange, '>=22.16.0 <23 || >=24.0.0 <25');
  assert.deepEqual(collectNodeRuntimePolicyViolations(), []);
});

test('Node runtime policy accepts supported lines and rejects loose or unsupported versions', () => {
  assert.throws(() => parsePinnedNodeVersion('24'), /exact Node version/u);
  assert.throws(() => parsePinnedNodeVersion('24.18'), /exact Node version/u);
  assert.deepEqual(collectNodeRuntimePolicyViolations({ currentNodeVersion: '22.16.0' }), []);
  assert.deepEqual(collectNodeRuntimePolicyViolations({ currentNodeVersion: '24.18.0' }), []);
  assert.match(
    collectNodeRuntimePolicyViolations({ currentNodeVersion: '22.15.0' }).join('\n'),
    /outside supported range/u
  );
  assert.match(
    collectNodeRuntimePolicyViolations({ currentNodeVersion: '23.0.0' }).join('\n'),
    /outside supported range/u
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

  const expectedVersions = {
    typescript: '7.0.2',
    '@types/node': '22.20.1',
    eslint: '10.8.0',
    oxlint: '1.75.0',
    'oxlint-tsgolint': '7.0.2001',
    'oxc-parser': '0.141.0',
  };
  assert.deepEqual(APPROVED_DEV_DEP_VERSIONS, expectedVersions);
  assert.deepEqual(
    Object.fromEntries([...byName].map(([name, row]) => [name, row.packageJsonVersion])),
    expectedVersions
  );
  assert.deepEqual(
    Object.fromEntries([...byName].map(([name, row]) => [name, row.approvedVersion])),
    expectedVersions
  );
  assert.equal(policy.tsgolintTypeScriptAligned, true);
  assert.equal(
    byName.get('@types/node').packageJsonVersion.split('.')[0],
    String(policy.nodeRuntimePolicy.typeBaselineMajor)
  );
});

test('oxlint-tsgolint version encoding stays aligned with the pinned TypeScript release', () => {
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '7.0.2000'), true);
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '7.0.2001'), true);
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '7.0.2999'), true);

  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '0.25.0'), false);
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '7.0.3001'), false);
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '7.1.2001'), false);
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2', '7.0.2'), false);
  assert.equal(isTsgolintVersionAlignedWithTypeScript('7.0.2-beta.1', '7.0.2001'), false);
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
