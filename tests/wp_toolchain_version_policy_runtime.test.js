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
  isCaretManifestRangeWithinBounds,
  isTsgolintVersionAlignedWithTypeScript,
  isVersionWithinBounds,
} from '../tools/wp_toolchain_version_policy.mjs';
import {
  parseBoundedSemverRange,
  parseOxcManifestRange,
  versionSatisfiesBoundedRange,
  versionSatisfiesOxcPolicy,
} from '../tools/wp_oxc_version_policy.mjs';

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

  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const activeOxcPolicy = parseOxcManifestRange(pkg.devDependencies['oxc-parser']);
  assert.ok(activeOxcPolicy);
  const baselineRanges = {
    typescript: '7.0.2',
    '@types/node': '^22.20.1',
    eslint: '^10.8.0',
    oxlint: '^1.75.0',
    'oxlint-tsgolint': '7.0.2001',
    'oxc-parser': pkg.devDependencies['oxc-parser'],
  };
  const activeRanges = {
    ...baselineRanges,
    '@types/node': pkg.devDependencies['@types/node'],
    eslint: pkg.devDependencies.eslint,
    oxlint: pkg.devDependencies.oxlint,
  };
  assert.deepEqual(APPROVED_DEV_DEP_RANGES, baselineRanges);
  assert.deepEqual(
    Object.fromEntries([...byName].map(([name, row]) => [name, row.packageJsonRange])),
    activeRanges
  );
  assert.deepEqual(
    Object.fromEntries([...byName].map(([name, row]) => [name, row.approvedRange])),
    activeRanges
  );
  assert.equal(policy.tsgolintTypeScriptAligned, true);
  assert.equal(
    Number.parseInt(byName.get('@types/node').resolvedVersion.split('.')[0], 10),
    policy.nodeRuntimePolicy.typeBaselineMajor
  );
  const offlineManifest = JSON.parse(fs.readFileSync('vendor/offline/manifest.json', 'utf8'));
  const activeOxcVersion = byName.get('oxc-parser').resolvedVersion;
  assert.equal(versionSatisfiesOxcPolicy(activeOxcVersion, activeOxcPolicy), true);
  const offlineCompatibility = parseBoundedSemverRange(offlineManifest.ast.compatibleProjectRange);
  assert.ok(offlineCompatibility);
  assert.equal(offlineCompatibility.maxExclusiveVersion, activeOxcPolicy.maxExclusiveVersion);
  assert.equal(versionSatisfiesBoundedRange(activeOxcVersion, offlineCompatibility), true);
  assert.equal(versionSatisfiesBoundedRange(offlineManifest.ast.version, offlineCompatibility), true);
});

test('Oxc policy derives each 0.x patch line without a hard-coded minor', () => {
  assert.deepEqual(parseOxcManifestRange('^0.145.3'), {
    manifestRange: '^0.145.3',
    minVersion: '0.145.3',
    maxExclusiveVersion: '0.146.0',
    boundedRange: '>=0.145.3 <0.146.0',
  });
  assert.deepEqual(parseOxcManifestRange('>=0.146.0 <0.147.0'), {
    manifestRange: '>=0.146.0 <0.147.0',
    minVersion: '0.146.0',
    maxExclusiveVersion: '0.147.0',
    boundedRange: '>=0.146.0 <0.147.0',
  });
  assert.equal(parseOxcManifestRange('^1.0.0'), null);
  assert.equal(parseOxcManifestRange('^0.145'), null);
  assert.equal(parseOxcManifestRange('>=0.145.0 <0.147.0'), null);
});

test('bounded caret manifest ranges can advance inside reviewed toolchain windows', () => {
  assert.equal(isCaretManifestRangeWithinBounds('^1.79.0', '1.75.0', '2.0.0'), true);
  assert.equal(isCaretManifestRangeWithinBounds('^1.99.9', '1.75.0', '2.0.0'), true);
  assert.equal(isCaretManifestRangeWithinBounds('^1.74.9', '1.75.0', '2.0.0'), false);
  assert.equal(isCaretManifestRangeWithinBounds('^2.0.0', '1.75.0', '2.0.0'), false);
  assert.equal(isCaretManifestRangeWithinBounds('>=1.79.0 <2.0.0', '1.75.0', '2.0.0'), false);
  assert.equal(isCaretManifestRangeWithinBounds('^22.21.0', '22.20.1', '23.0.0'), true);
  assert.equal(isCaretManifestRangeWithinBounds('^23.0.0', '22.20.1', '23.0.0'), false);
});

test('bounded toolchain windows accept reviewed updates and reject boundary crossings', () => {
  assert.equal(isVersionWithinBounds('7.0.2', '7.0.2', '7.1.0'), true);
  assert.equal(isVersionWithinBounds('7.0.99', '7.0.2', '7.1.0'), true);
  assert.equal(isVersionWithinBounds('7.1.0', '7.0.2', '7.1.0'), false);
  assert.equal(isVersionWithinBounds('0.144.0', '0.144.0', '0.145.0'), true);
  assert.equal(isVersionWithinBounds('0.144.9', '0.144.0', '0.145.0'), true);
  assert.equal(isVersionWithinBounds('0.145.0', '0.144.0', '0.145.0'), false);
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
    'npm run vendor:offline:packages:refresh && npm run lint:rule-matrix && npm run toolchain:version-policy:report'
  );
  assert.equal(
    scripts['vendor:offline:packages:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all && npm run vendor:offline:oxc:refresh'
  );
  assert.equal(
    scripts['vendor:offline:packages:check'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --check && npm run vendor:offline:oxc:check'
  );
  assert.equal(
    scripts['vendor:offline:tsx-tests:check-plan'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --check-plan'
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
    'npm install --save-dev oxc-parser@0 && npm run deps:update:sync-generated && npm run deps:update:oxc:verify'
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
