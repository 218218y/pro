import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  collectNodeRuntimePolicyViolations,
  parsePinnedNodeVersion,
  readNodeRuntimePolicy,
} from '../tools/wp_node_runtime_policy.mjs';
import {
  APPROVED_DEV_DEP_RANGES,
  collectToolchainVersionPolicy,
  createFormattedToolchainVersionPolicyMarkdown,
  isTsgolintVersionAlignedWithTypeScript,
  isVersionWithinBounds,
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

test('toolchain version policy allows bounded compatible updates', () => {
  const policy = collectToolchainVersionPolicy();
  assert.deepEqual(policy.violations, []);

  const byName = new Map(policy.rows.map(row => [row.name, row]));
  for (const name of ['typescript', '@types/node', 'eslint', 'oxlint', 'oxlint-tsgolint', 'oxc-parser']) {
    const row = byName.get(name);
    assert.ok(row, `${name} should be tracked`);
    assert.equal(row.packageJsonRange, row.approvedRange);
    assert.equal(row.lockRootRange, row.packageJsonRange);
    assert.match(row.resolvedVersion, /^\d+\.\d+\.\d+$/);
    assert.equal(row.resolvedWithinApprovedRange, true);
  }

  const expectedRanges = {
    typescript: '7.0.2',
    '@types/node': '^22.20.1',
    eslint: '^10.8.0',
    oxlint: '^1.75.0',
    'oxlint-tsgolint': '7.0.2001',
    'oxc-parser': '>=0.142.0 <0.143.0',
  };
  assert.deepEqual(APPROVED_DEV_DEP_RANGES, expectedRanges);
  assert.deepEqual(
    Object.fromEntries([...byName].map(([name, row]) => [name, row.packageJsonRange])),
    expectedRanges
  );
  assert.deepEqual(
    Object.fromEntries([...byName].map(([name, row]) => [name, row.approvedRange])),
    expectedRanges
  );
  assert.equal(policy.tsgolintTypeScriptAligned, true);
  assert.equal(
    Number.parseInt(byName.get('@types/node').resolvedVersion.split('.')[0], 10),
    policy.nodeRuntimePolicy.typeBaselineMajor
  );
  const offlineManifest = JSON.parse(fs.readFileSync('vendor/offline/manifest.json', 'utf8'));
  const activeOxcVersion = byName.get('oxc-parser').resolvedVersion;
  assert.equal(isVersionWithinBounds(activeOxcVersion, '0.142.0', '0.143.0'), true);
  assert.match(offlineManifest.ast.version, /^0\.(?:141|142)\.\d+$/u);
  assert.equal(offlineManifest.ast.compatibleProjectRange, '>=0.141.0 <0.143.0');
  assert.equal(isVersionWithinBounds(activeOxcVersion, '0.141.0', '0.143.0'), true);
  assert.equal(isVersionWithinBounds(offlineManifest.ast.version, '0.141.0', '0.143.0'), true);
});

test('bounded toolchain windows accept reviewed updates and reject boundary crossings', () => {
  assert.equal(isVersionWithinBounds('7.0.2', '7.0.2', '7.1.0'), true);
  assert.equal(isVersionWithinBounds('7.0.99', '7.0.2', '7.1.0'), true);
  assert.equal(isVersionWithinBounds('7.1.0', '7.0.2', '7.1.0'), false);
  assert.equal(isVersionWithinBounds('0.142.0', '0.141.0', '0.143.0'), true);
  assert.equal(isVersionWithinBounds('0.143.0', '0.141.0', '0.143.0'), false);
  assert.equal(isVersionWithinBounds('latest', '1.0.0', '2.0.0'), false);
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

test('dependency refresh scripts synchronize policy docs and offline package vendors', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = pkg.scripts || {};

  assert.equal(
    scripts['deps:update:sync-generated'],
    'npm run toolchain:version-policy:report && npm run vendor:offline:packages:refresh'
  );
  assert.equal(
    scripts['vendor:offline:packages:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all'
  );
  assert.equal(
    scripts['vendor:offline:packages:check'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --check'
  );
  for (const scriptName of ['deps:update:safe', 'deps:update:recommended']) {
    assert.match(
      scripts[scriptName] || '',
      /&& npm run deps:update:sync-generated$/u,
      `${scriptName} must refresh generated dependency policy docs`
    );
  }
  assert.match(scripts['deps:update:recommended'] || '', /npm update .*oxc-parser/u);
  assert.equal(
    scripts['deps:update:oxc'],
    'npm update oxc-parser && npm run deps:update:sync-generated && npm run deps:update:oxc:verify'
  );
  assert.match(scripts['deps:update:oxc:verify'] || '', /wp_ast_adapter_runtime\.test\.js/u);
  assert.match(scripts['deps:update:oxc:verify'] || '', /offline_repair_toolchain_contracts\.test\.js/u);
});

test('toolchain version policy generated docs are current', async () => {
  const policy = collectToolchainVersionPolicy();
  const expected = await createFormattedToolchainVersionPolicyMarkdown(policy);
  const current = fs.readFileSync('docs/TOOLCHAIN_VERSION_POLICY.md', 'utf8');
  assert.equal(current, expected);
});
