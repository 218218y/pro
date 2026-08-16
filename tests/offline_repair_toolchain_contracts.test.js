import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import {
  parseBoundedSemverRange,
  parseOxcManifestRange,
  resolveDependencyLockPath,
  resolveOxcLockGraph,
  versionSatisfiesBoundedRange,
} from '../tools/wp_oxc_version_policy.mjs';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

function writeTarOctal(header, offset, length, value) {
  const encoded = value.toString(8).padStart(length - 1, '0') + '\0';
  header.write(encoded, offset, length, 'ascii');
}

function createTarEntry(name, content) {
  const body = Buffer.from(content);
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  writeTarOctal(header, 100, 8, 0o644);
  writeTarOctal(header, 108, 8, 0);
  writeTarOctal(header, 116, 8, 0);
  writeTarOctal(header, 124, 12, body.length);
  writeTarOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header.write('0', 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([header, body, padding]);
}

function createNpmArchive(packageJson, files = {}, rootName = 'package') {
  const tar = Buffer.concat([
    createTarEntry(`${rootName}/package.json`, `${JSON.stringify(packageJson, null, 2)}\n`),
    ...Object.entries(files).map(([name, content]) => createTarEntry(`${rootName}/${name}`, content)),
    Buffer.alloc(1024),
  ]);
  return zlib.gzipSync(tar, { level: 9 });
}

function assertLockEntry(manifestEntry, expectedVersion, packages) {
  const lockEntry = packages[manifestEntry.lockPath];
  assert.ok(lockEntry, `${manifestEntry.lockPath} must exist in package-lock.json`);
  assert.equal(lockEntry.version, expectedVersion);
  assert.equal(lockEntry.resolved, manifestEntry.url);
  assert.equal(lockEntry.integrity, manifestEntry.integrity);
}

function isVersionInBoundedRange(version, range) {
  const match = /^>=(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)$/u.exec(range);
  if (!match) return false;
  const parse = value => value.split('.').map(Number);
  const compare = (left, right) => {
    for (let index = 0; index < 3; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  };
  const actual = parse(version);
  return compare(actual, parse(match[1])) >= 0 && compare(actual, parse(match[2])) < 0;
}

function platformConstraintAccepts(values, target) {
  if (!Array.isArray(values) || values.length === 0) return true;
  const allowed = values.filter(value => !value.startsWith('!'));
  const blocked = values.filter(value => value.startsWith('!')).map(value => value.slice(1));
  return !blocked.includes(target) && (allowed.length === 0 || allowed.includes(target));
}

function supportsLinuxX64Glibc(lockEntry) {
  return (
    platformConstraintAccepts(lockEntry.os, 'linux') &&
    platformConstraintAccepts(lockEntry.cpu, 'x64') &&
    platformConstraintAccepts(lockEntry.libc, 'glibc')
  );
}

test('offline TypeScript manifest is exact, native, and lockfile-backed', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const typescript = manifest.typescript;

  assert.equal(typescript.version, lock.packages['node_modules/typescript'].version);
  assert.equal(pkg.devDependencies.typescript, typescript.version);
  assert.equal(typescript.launcher, 'bin/tsc');
  assertLockEntry(typescript.package, typescript.version, lock.packages);

  const expected = {
    'linux-x64': ['node_modules/@typescript/typescript-linux-x64', 'lib/tsc'],
  };
  assert.deepEqual(Object.keys(typescript.platforms).sort(), Object.keys(expected).sort());
  for (const [platform, [lockPath, executable]] of Object.entries(expected)) {
    const entry = typescript.platforms[platform];
    assert.equal(entry.lockPath, lockPath);
    assert.equal(entry.installPath, lockPath);
    assert.equal(entry.executable, executable);
    assertLockEntry(entry, typescript.version, lock.packages);
  }
});

test('offline Oxlint manifest is exact, Linux-only, and includes the type-aware backend', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const oxlint = manifest.oxlint;
  const typeAware = oxlint.typeAware;

  assert.equal(oxlint.version, lock.packages['node_modules/oxlint'].version);
  assert.equal(pkg.devDependencies.oxlint, lock.packages[''].devDependencies.oxlint);
  assert.equal(oxlint.launcher, 'bin/oxlint');
  assertLockEntry(oxlint.package, oxlint.version, lock.packages);

  assert.deepEqual(Object.keys(oxlint.platforms), ['linux-x64']);
  const binding = oxlint.platforms['linux-x64'];
  assert.equal(binding.lockPath, 'node_modules/@oxlint/binding-linux-x64-gnu');
  assert.equal(binding.installPath, binding.lockPath);
  assert.equal(binding.runtime, 'gnu');
  assert.equal(supportsLinuxX64Glibc(lock.packages[binding.lockPath]), true);
  assertLockEntry(binding, oxlint.version, lock.packages);
  assert.equal(
    lock.packages['node_modules/oxlint'].optionalDependencies['@oxlint/binding-linux-x64-gnu'],
    oxlint.version
  );

  assert.equal(typeAware.version, lock.packages['node_modules/oxlint-tsgolint'].version);
  assert.equal(pkg.devDependencies['oxlint-tsgolint'], typeAware.version);
  assert.equal(typeAware.launcher, 'bin/tsgolint.js');
  assert.equal(typeAware.environmentVariable, 'OXLINT_TSGOLINT_PATH');
  assertLockEntry(typeAware.package, typeAware.version, lock.packages);
  assert.deepEqual(Object.keys(typeAware.platforms), ['linux-x64']);
  const typeAwareBinding = typeAware.platforms['linux-x64'];
  assert.equal(typeAwareBinding.lockPath, 'node_modules/@oxlint-tsgolint/linux-x64');
  assert.equal(typeAwareBinding.installPath, typeAwareBinding.lockPath);
  assert.equal(supportsLinuxX64Glibc(lock.packages[typeAwareBinding.lockPath]), true);
  assertLockEntry(typeAwareBinding, typeAware.version, lock.packages);
  assert.equal(
    lock.packages['node_modules/oxlint-tsgolint'].optionalDependencies['@oxlint-tsgolint/linux-x64'],
    typeAware.version
  );
  assert.equal(lock.packages['node_modules/oxlint'].peerDependencies['oxlint-tsgolint'], '>=7.0.2001');
});

test('offline esbuild manifest is exact, native, hashed, and lockfile-backed', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const esbuild = manifest.esbuild;

  assert.equal(esbuild.version, lock.packages['node_modules/esbuild'].version);
  assert.equal(pkg.devDependencies.esbuild, lock.packages[''].devDependencies.esbuild);
  assert.equal(esbuild.launcher, 'bin/esbuild');
  assertLockEntry(esbuild.package, esbuild.version, lock.packages);

  const expected = {
    'linux-x64': ['node_modules/@esbuild/linux-x64', 'bin/esbuild'],
  };
  assert.deepEqual(Object.keys(esbuild.platforms).sort(), Object.keys(expected).sort());
  for (const [platform, [lockPath, executable]] of Object.entries(expected)) {
    const entry = esbuild.platforms[platform];
    assert.equal(entry.lockPath, lockPath);
    assert.equal(entry.installPath, lockPath);
    assert.equal(entry.executable, executable);
    assert.match(entry.binarySha256, /^[a-f0-9]{64}$/u);
    assertLockEntry(entry, esbuild.version, lock.packages);
  }
});

test('offline AST fallback is signed independently and compatible with the active parser', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const ast = manifest.ast;
  const activeParser = lock.packages['node_modules/oxc-parser'];
  const activeVersion = activeParser.version;

  const policy = parseOxcManifestRange(pkg.devDependencies['oxc-parser']);
  assert.ok(policy);
  const graph = resolveOxcLockGraph(lock);
  assert.equal(lock.packages[''].devDependencies['oxc-parser'], pkg.devDependencies['oxc-parser']);
  const compatibility = parseBoundedSemverRange(ast.compatibleProjectRange);
  assert.ok(compatibility);
  assert.equal(isVersionInBoundedRange(activeVersion, policy.boundedRange), true);
  assert.equal(compatibility.maxExclusiveVersion, policy.maxExclusiveVersion);
  assert.equal(versionSatisfiesBoundedRange(activeVersion, compatibility), true);
  assert.equal(versionSatisfiesBoundedRange(ast.version, compatibility), true);
  assert.equal(lock.packages[graph.typesPath].version, activeVersion);
  if (lock.packages['node_modules/@oxc-project/types']?.version !== activeVersion) {
    assert.notEqual(
      graph.typesPath,
      'node_modules/@oxc-project/types',
      'Oxc types must resolve from the parser nesting when the root package is a different version'
    );
  }
  assert.equal(activeParser.dependencies['@oxc-project/types'], `^${activeVersion}`);
  for (const [packageName, expectedVersion] of Object.entries(activeParser.optionalDependencies)) {
    assert.equal(expectedVersion, activeVersion, `${packageName} must match the active parser`);
    const resolvedPath = resolveDependencyLockPath(lock.packages, graph.parserPath, packageName);
    assert.equal(
      lock.packages[resolvedPath]?.version,
      activeVersion,
      `${packageName} resolved lock entry must match the active parser`
    );
  }

  const astEntries = [...ast.packages, ...Object.values(ast.bindings)];
  assert.deepEqual(
    astEntries
      .map(entry =>
        entry.lockPath.slice(entry.lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length)
      )
      .sort(),
    ['@oxc-parser/binding-linux-x64-gnu', '@oxc-project/types', 'oxc-parser'].sort()
  );
  if (ast.version === activeVersion) {
    assert.deepEqual(astEntries.map(entry => entry.lockPath).sort(), graph.lockPaths.toSorted());
    for (const entry of astEntries) assertLockEntry(entry, ast.version, lock.packages);
  }
  for (const entry of astEntries) {
    assert.match(entry.file, new RegExp(ast.version.replaceAll('.', '\\.'), 'u'));
    assert.match(entry.url, new RegExp(ast.version.replaceAll('.', '\\.'), 'u'));
    assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/u);
  }
});

test('offline Oxc vendor refresh command validates the checked-in bundle without network access', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['vendor:offline:oxc:refresh'], 'node tools/wp_refresh_offline_oxc_vendor.mjs');
  assert.equal(
    pkg.scripts['vendor:offline:oxc:adopt'],
    'node tools/wp_refresh_offline_oxc_vendor.mjs --adopt-existing'
  );
  assert.equal(
    pkg.scripts['vendor:offline:oxc:check'],
    'node tools/wp_refresh_offline_oxc_vendor.mjs --check'
  );

  const result = spawnSync(process.execPath, ['tools/wp_refresh_offline_oxc_vendor.mjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    result.stdout,
    new RegExp(
      `offline ${escapeRegex(readJson('vendor/offline/manifest.json').ast.version)}; active ${escapeRegex(readJson('package-lock.json').packages['node_modules/oxc-parser'].version)}`,
      'u'
    )
  );
});

test('offline npm vendor synchronizer adopts lockfile packages and cleans superseded archives', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');

  assert.equal(
    pkg.scripts['vendor:offline:packages:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all && npm run vendor:offline:oxc:refresh'
  );
  assert.equal(
    pkg.scripts['vendor:offline:packages:adopt'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --adopt-existing && npm run vendor:offline:oxc:adopt'
  );
  assert.equal(
    pkg.scripts['vendor:offline:packages:check'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --check && npm run vendor:offline:oxc:check'
  );
  assert.equal(
    pkg.scripts['vendor:offline:packages:downloads'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --all --print-downloads && node tools/wp_refresh_offline_oxc_vendor.mjs --print-downloads'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx:adopt'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --component tsx --adopt-existing'
  );
  assert.match(pkg.scripts['deps:update:sync-generated'], /vendor:offline:packages:refresh/u);
  assert.equal(
    pkg.scripts['deps:update:sync-generated'],
    'npm run vendor:offline:packages:refresh && npm run toolchain:version-policy:report'
  );
  assert.doesNotMatch(
    pkg.scripts['deps:update:sync-generated'],
    /vendor:offline:(?:tsx-tests|vite-build|eslint-js-strict):refresh/u
  );

  const checkedIn = spawnSync(
    process.execPath,
    [
      tool,
      '--component',
      'esbuild',
      '--component',
      'tsx',
      '--component',
      'prettier',
      '--component',
      'typescript',
      '--component',
      'oxlint',
      '--profile',
      'vite-build',
      '--check',
    ],
    {
      cwd: root,
      encoding: 'utf8',
    }
  );
  assert.equal(checkedIn.status, 0, checkedIn.stderr || checkedIn.stdout);
  for (const component of ['esbuild', 'tsx', 'prettier', 'typescript', 'oxlint']) {
    assert.match(checkedIn.stdout, new RegExp(`OK: ${component} `, 'u'));
  }
  assert.match(
    checkedIn.stdout,
    new RegExp(
      `OK: workspace vite-build \\(${manifest.workspace.profiles['vite-build'].packageCount} packages\\)`,
      'u'
    )
  );

  const eslintPlan = spawnSync(process.execPath, [tool, '--profile', 'eslint-js-strict', '--check-plan'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(eslintPlan.status, 0, eslintPlan.stderr || eslintPlan.stdout);
  assert.match(
    eslintPlan.stdout,
    new RegExp(
      `OK: workspace plan eslint-js-strict \\(${manifest.workspace.profiles['eslint-js-strict'].packageCount} packages\\)`,
      'u'
    )
  );

  const downloadPlan = spawnSync(process.execPath, [tool, '--all', '--print-downloads'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(downloadPlan.status, 0, downloadPlan.stderr || downloadPlan.stdout);
  for (const entry of [
    manifest.oxlint.package,
    manifest.oxlint.platforms['linux-x64'],
    manifest.oxlint.typeAware.package,
    manifest.oxlint.typeAware.platforms['linux-x64'],
  ]) {
    assert.match(downloadPlan.stdout, new RegExp(escapeRegex(entry.url), 'u'));
    assert.match(downloadPlan.stdout, new RegExp(escapeRegex(entry.file), 'u'));
  }
  for (const profileName of ['tsx-tests', 'vite-build', 'eslint-js-strict']) {
    const packageCount = manifest.workspace.profiles[profileName].packageCount;
    assert.match(
      downloadPlan.stdout,
      new RegExp(`workspace ${escapeRegex(profileName)} \\(${packageCount} packages\\)`, 'u')
    );
  }
  const eslintArchive = manifest.workspace.profiles['eslint-js-strict'].packages.find(
    entry => entry.name === 'eslint'
  );
  assert.ok(eslintArchive, 'ESLint profile must contain the eslint root package');
  assert.match(downloadPlan.stdout, new RegExp(escapeRegex(eslintArchive.file), 'u'));

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-npm-vendor-'));
  try {
    const fixtureVendor = path.join(fixtureRoot, 'vendor/offline/tsx');
    fs.mkdirSync(fixtureVendor, { recursive: true });
    fs.copyFileSync(path.join(root, 'package-lock.json'), path.join(fixtureRoot, 'package-lock.json'));
    fs.copyFileSync(
      path.join(root, manifest.tsx.package.file),
      path.join(fixtureVendor, path.basename(manifest.tsx.package.file))
    );
    fs.writeFileSync(path.join(fixtureVendor, 'tsx-0.0.0.tgz'), 'superseded');

    const staleManifest = structuredClone(manifest);
    staleManifest.tsx = {
      ...staleManifest.tsx,
      version: '0.0.0',
      package: {
        ...staleManifest.tsx.package,
        file: 'vendor/offline/tsx/tsx-0.0.0.tgz',
        url: 'https://registry.npmjs.org/tsx/-/tsx-0.0.0.tgz',
        integrity: `sha512-${'A'.repeat(86)}==`,
      },
    };
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(staleManifest, null, 2)}\n`
    );

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(adopt.stdout, /adopting vendor\/offline\/tsx\/tsx-/u);

    const synced = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    const lockEntry = lock.packages['node_modules/tsx'];
    assert.equal(synced.tsx.version, lockEntry.version);
    assert.equal(synced.tsx.package.url, lockEntry.resolved);
    assert.equal(synced.tsx.package.integrity, lockEntry.integrity);
    assert.equal(synced.tsx.esbuildRange, lockEntry.dependencies.esbuild);
    assert.equal(fs.existsSync(path.join(fixtureVendor, 'tsx-0.0.0.tgz')), false);

    const check = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(check.status, 0, check.stderr || check.stdout);

    const downloads = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--print-downloads'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(downloads.status, 0, downloads.stderr || downloads.stdout);
    assert.match(
      downloads.stdout,
      new RegExp(lockEntry.resolved.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u')
    );
    assert.match(downloads.stdout, /vendor\/offline\/tsx\/tsx-/u);

    const incompatibleManifest = structuredClone(synced);
    incompatibleManifest.esbuild.version = '0.29.0';
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(incompatibleManifest, null, 2)}\n`
    );
    const incompatible = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.notEqual(incompatible.status, 0);
    assert.match(incompatible.stderr, /does not satisfy TSX dependency/u);
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(synced, null, 2)}\n`
    );

    fs.appendFileSync(path.join(fixtureRoot, synced.tsx.package.file), 'tamper');
    const tampered = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'tsx', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.notEqual(tampered.status, 0);
    assert.match(tampered.stderr, /integrity mismatch/u);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline npm vendor synchronizer adopts the complete Oxlint Linux slice atomically', () => {
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-oxlint-vendor-'));
  const lockPaths = [
    'node_modules/oxlint',
    'node_modules/@oxlint/binding-linux-x64-gnu',
    'node_modules/oxlint-tsgolint',
    'node_modules/@oxlint-tsgolint/linux-x64',
  ];

  try {
    const fixtureLock = structuredClone(lock);
    const fixtureManifest = structuredClone(manifest);
    delete fixtureManifest.oxlint;
    fs.mkdirSync(path.join(fixtureRoot, 'vendor/offline/oxlint'), { recursive: true });

    for (const lockPath of lockPaths) {
      const lockEntry = fixtureLock.packages[lockPath];
      const packageName = lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
      const packageJson = { name: packageName, version: lockEntry.version };
      for (const constraint of ['os', 'cpu', 'libc']) {
        if (Array.isArray(lockEntry[constraint])) packageJson[constraint] = lockEntry[constraint];
      }
      const archive = createNpmArchive(packageJson);
      lockEntry.integrity = `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`;
      const fileName = new URL(lockEntry.resolved).pathname.split('/').at(-1);
      fs.writeFileSync(path.join(fixtureRoot, 'vendor/offline/oxlint', fileName), archive);
    }
    fs.writeFileSync(path.join(fixtureRoot, 'vendor/offline/oxlint/stale-0.0.0.tgz'), 'stale');
    fs.writeFileSync(
      path.join(fixtureRoot, 'package-lock.json'),
      `${JSON.stringify(fixtureLock, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(fixtureManifest, null, 2)}\n`
    );

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'oxlint', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(
      adopt.stdout,
      new RegExp(
        `OK: oxlint ${fixtureLock.packages['node_modules/oxlint'].version.replaceAll('.', '\\.')}\\b`,
        'u'
      )
    );

    const synced = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    assert.equal(synced.oxlint.version, fixtureLock.packages['node_modules/oxlint'].version);
    assert.equal(synced.oxlint.platforms['linux-x64'].lockPath, 'node_modules/@oxlint/binding-linux-x64-gnu');
    assert.equal(
      synced.oxlint.typeAware.version,
      fixtureLock.packages['node_modules/oxlint-tsgolint'].version
    );
    assert.equal(synced.oxlint.typeAware.environmentVariable, 'OXLINT_TSGOLINT_PATH');
    assert.equal(fs.existsSync(path.join(fixtureRoot, 'vendor/offline/oxlint/stale-0.0.0.tgz')), false);

    const check = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--component', 'oxlint', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(check.status, 0, check.stderr || check.stdout);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline TSX-test workspace profile is lock-derived and Linux x64 glibc only', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const profile = manifest.workspace.profiles['tsx-tests'];
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');

  assert.deepEqual(manifest.workspace.platform, {
    key: 'linux-x64',
    os: 'linux',
    cpu: 'x64',
    libc: 'glibc',
  });
  assert.equal(
    manifest.workspace.lockfileSha256,
    crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(root, 'package-lock.json')))
      .digest('hex')
  );
  assert.deepEqual(profile.rootDependencies, Object.keys(pkg.dependencies).sort());
  assert.equal(profile.packageCount, profile.packages.length);
  assert.ok(profile.packageCount > profile.rootDependencies.length);

  const names = new Set(profile.packages.map(entry => entry.name));
  for (const requiredName of [
    'react',
    'react-dom',
    'scheduler',
    'three',
    'zustand',
    'pdf-lib',
    'pdfjs-dist',
    '@supabase/supabase-js',
    '@napi-rs/canvas-linux-x64-gnu',
  ]) {
    assert.ok(names.has(requiredName), `${requiredName} must be present in the TSX-test profile`);
  }

  for (const entry of profile.packages) {
    assertLockEntry(entry, entry.version, lock.packages);
    assert.equal(entry.installPath, entry.lockPath);
    assert.equal(supportsLinuxX64Glibc(lock.packages[entry.lockPath]), true, entry.lockPath);
    assert.doesNotMatch(entry.lockPath, /darwin|win32|arm64|musl/u);
    assert.match(entry.file, /^vendor\/offline\/runtime\//u);
  }

  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:plan'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --sync-plan'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:check-plan'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --check-plan'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:downloads'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --print-downloads --missing-only'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:adopt'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --adopt-existing'
  );
  assert.equal(
    pkg.scripts['vendor:offline:tsx-tests:check'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --profile tsx-tests --check'
  );

  const planCheck = spawnSync(process.execPath, [tool, '--profile', 'tsx-tests', '--check-plan'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(planCheck.status, 0, planCheck.stderr || planCheck.stdout);
  assert.match(planCheck.stdout, /workspace plan tsx-tests/u);

  const downloads = spawnSync(process.execPath, [tool, '--profile', 'tsx-tests', '--print-downloads'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(downloads.status, 0, downloads.stderr || downloads.stdout);
  assert.match(downloads.stdout, /react-\d+\.\d+\.\d+\.tgz/u);
  assert.match(downloads.stdout, /vendor\/offline\/runtime\/react-/u);
  assert.doesNotMatch(downloads.stdout, /vendor\/offline\/(?:tsx|esbuild)\//u);

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-workspace-vendor-'));
  try {
    const fixtureLock = structuredClone(lock);
    fixtureLock.packages[''] = {
      ...fixtureLock.packages[''],
      dependencies: { tsx: pkg.devDependencies.tsx },
      devDependencies: {},
    };
    fs.mkdirSync(path.join(fixtureRoot, 'vendor/offline/runtime'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'package-lock.json'),
      `${JSON.stringify(fixtureLock, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    const fixtureArchives = [
      [manifest.tsx.package.file, `runtime/tsx-${manifest.tsx.version}.tgz`],
      [manifest.esbuild.package.file, `runtime/esbuild-${manifest.esbuild.version}.tgz`],
      [
        manifest.esbuild.platforms['linux-x64'].file,
        `runtime/esbuild__linux-x64-${manifest.esbuild.version}.tgz`,
      ],
    ];
    for (const [source, target] of fixtureArchives) {
      fs.copyFileSync(path.join(root, source), path.join(fixtureRoot, 'vendor/offline', target));
    }
    fs.writeFileSync(path.join(fixtureRoot, 'vendor/offline/runtime/stale-0.0.0.tgz'), 'stale');

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--profile', 'tsx-tests', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(adopt.stdout, /workspace tsx-tests \(\d+ packages\)/u);

    const fixtureManifest = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    assert.deepEqual(fixtureManifest.workspace.profiles['tsx-tests'].rootDependencies, ['tsx']);
    assert.equal(
      fixtureManifest.workspace.profiles['tsx-tests'].packageCount,
      fixtureManifest.workspace.profiles['tsx-tests'].packages.length
    );
    assert.equal(fs.existsSync(path.join(fixtureRoot, 'vendor/offline/runtime/stale-0.0.0.tgz')), false);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline Vite build profile is complete, Linux x64 glibc only, and manually adoptable', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const profile = manifest.workspace.profiles['vite-build'];
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');

  assert.equal(pkg.devDependencies.vite, lock.packages[''].devDependencies.vite);
  assert.equal(
    pkg.devDependencies['@vitejs/plugin-react'],
    lock.packages[''].devDependencies['@vitejs/plugin-react']
  );
  assert.deepEqual(profile.rootDependencies, ['@vitejs/plugin-react', 'vite']);
  assert.equal(profile.packageCount, profile.packages.length);
  assert.ok(profile.packageCount > profile.rootDependencies.length);

  const names = new Set(profile.packages.map(entry => entry.name));
  for (const requiredName of [
    'vite',
    '@vitejs/plugin-react',
    'rolldown',
    '@rolldown/binding-linux-x64-gnu',
    'lightningcss',
    'lightningcss-linux-x64-gnu',
    '@rolldown/pluginutils',
    'postcss',
  ]) {
    assert.ok(names.has(requiredName), `${requiredName} must be present in the Vite build profile`);
  }
  for (const excludedName of [
    'fsevents',
    '@rolldown/binding-wasm32-wasi',
    '@rolldown/binding-linux-x64-musl',
    'lightningcss-linux-x64-musl',
  ]) {
    assert.equal(names.has(excludedName), false, `${excludedName} must not enter the GNU/Linux profile`);
  }

  for (const entry of profile.packages) {
    assertLockEntry(entry, entry.version, lock.packages);
    assert.equal(entry.installPath, entry.lockPath);
    assert.equal(supportsLinuxX64Glibc(lock.packages[entry.lockPath]), true, entry.lockPath);
    assert.doesNotMatch(entry.lockPath, /darwin|win32|arm64|musl/u);
    assert.match(entry.file, /^vendor\/offline\/vite\//u);
  }

  const expectedScripts = {
    plan: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile vite-build --sync-plan',
    'check-plan': 'node tools/wp_refresh_offline_npm_vendor.mjs --profile vite-build --check-plan',
    downloads:
      'node tools/wp_refresh_offline_npm_vendor.mjs --profile vite-build --print-downloads --missing-only',
    refresh: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile vite-build',
    adopt: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile vite-build --adopt-existing',
    check: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile vite-build --check',
  };
  for (const [suffix, command] of Object.entries(expectedScripts)) {
    assert.equal(pkg.scripts[`vendor:offline:vite-build:${suffix}`], command);
  }
  assert.equal(pkg.scripts['setup:offline:vite'], 'python tools/bootstrap_offline_vite.py');
  assert.equal(
    pkg.scripts['verify:offline:vite'],
    'python tools/verify_offline_repair_vendor.py --vite-only'
  );
  assert.equal(pkg.scripts['run:offline:vite'], 'python tools/run_offline_vite.py');
  assert.equal(
    pkg.scripts['vite:build:offline'],
    'python tools/run_offline_vite.py --config vite.config.mjs build'
  );

  const planCheck = spawnSync(process.execPath, [tool, '--profile', 'vite-build', '--check-plan'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(planCheck.status, 0, planCheck.stderr || planCheck.stdout);
  assert.match(
    planCheck.stdout,
    new RegExp(`workspace plan vite-build \\(${profile.packageCount} packages\\)`, 'u')
  );

  const downloads = spawnSync(process.execPath, [tool, '--all', '--print-downloads'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(downloads.status, 0, downloads.stderr || downloads.stdout);
  assert.match(
    downloads.stdout,
    new RegExp(`workspace vite-build \\(${profile.packageCount} packages\\)`, 'u')
  );
  for (const rootDependency of profile.rootDependencies) {
    const entry = profile.packages.find(candidate => candidate.name === rootDependency);
    assert.ok(entry, `${rootDependency} must be present in the Vite build profile`);
    assert.match(downloads.stdout, new RegExp(escapeRegex(entry.file), 'u'));
  }
  for (const nativeName of ['@rolldown/binding-linux-x64-gnu', 'lightningcss-linux-x64-gnu']) {
    const entry = profile.packages.find(candidate => candidate.name === nativeName);
    assert.ok(entry, `${nativeName} must be present in the Vite build profile`);
    assert.match(downloads.stdout, new RegExp(escapeRegex(entry.file), 'u'));
  }
  assert.doesNotMatch(downloads.stdout, /wasm32|darwin|win32|musl|arm64/u);

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-vite-vendor-'));
  try {
    const fixtureLock = structuredClone(lock);
    const fixtureManifest = structuredClone(manifest);
    delete fixtureManifest.workspace.profiles['vite-build'];
    const fixtureVendor = path.join(fixtureRoot, 'vendor/offline/vite');
    fs.mkdirSync(fixtureVendor, { recursive: true });

    for (const entry of profile.packages) {
      const lockEntry = fixtureLock.packages[entry.lockPath];
      const packageJson = { name: entry.name, version: entry.version };
      for (const constraint of ['os', 'cpu', 'libc']) {
        if (Array.isArray(lockEntry[constraint])) packageJson[constraint] = lockEntry[constraint];
      }
      const archive = createNpmArchive(packageJson);
      lockEntry.integrity = `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`;
      fs.writeFileSync(path.join(fixtureRoot, entry.file), archive);
    }
    fs.writeFileSync(path.join(fixtureVendor, 'stale-0.0.0.tgz'), 'stale');
    fs.writeFileSync(
      path.join(fixtureRoot, 'package-lock.json'),
      `${JSON.stringify(fixtureLock, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(fixtureManifest, null, 2)}\n`
    );

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--profile', 'vite-build', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(
      adopt.stdout,
      new RegExp(`workspace vite-build \\(${profile.packageCount} packages\\)`, 'u')
    );

    const synced = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    assert.deepEqual(synced.workspace.profiles['vite-build'].rootDependencies, [
      '@vitejs/plugin-react',
      'vite',
    ]);
    assert.equal(synced.workspace.profiles['vite-build'].packageCount, profile.packageCount);
    assert.equal(fs.existsSync(path.join(fixtureVendor, 'stale-0.0.0.tgz')), false);

    const check = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--profile', 'vite-build', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(check.status, 0, check.stderr || check.stdout);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline ESLint strict-JS profile is lock-derived, included in standard refresh, and manually adoptable', () => {
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const manifest = readJson('vendor/offline/manifest.json');
  const profile = manifest.workspace.profiles['eslint-js-strict'];
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');

  assert.equal(pkg.devDependencies.eslint, lock.packages[''].devDependencies.eslint);
  assert.deepEqual(profile.rootDependencies, ['eslint']);
  assert.equal(profile.packageCount, profile.packages.length);
  assert.ok(profile.packageCount > profile.rootDependencies.length);

  const names = new Set(profile.packages.map(entry => entry.name));
  for (const requiredName of [
    'eslint',
    '@eslint/config-array',
    '@eslint/core',
    '@eslint/plugin-kit',
    'espree',
    'eslint-scope',
    'eslint-visitor-keys',
    'ajv',
    'minimatch',
  ]) {
    assert.ok(names.has(requiredName), `${requiredName} must be present in the ESLint profile`);
  }
  assert.equal(names.has('jiti'), false, 'optional ESLint peer jiti must not enter the profile');

  for (const entry of profile.packages) {
    assertLockEntry(entry, entry.version, lock.packages);
    assert.equal(entry.installPath, entry.lockPath);
    assert.equal(supportsLinuxX64Glibc(lock.packages[entry.lockPath]), true, entry.lockPath);
    assert.match(entry.file, /^vendor\/offline\/eslint\//u);
  }

  const expectedScripts = {
    plan: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile eslint-js-strict --sync-plan',
    'check-plan': 'node tools/wp_refresh_offline_npm_vendor.mjs --profile eslint-js-strict --check-plan',
    downloads:
      'node tools/wp_refresh_offline_npm_vendor.mjs --profile eslint-js-strict --print-downloads --missing-only',
    refresh: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile eslint-js-strict',
    adopt: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile eslint-js-strict --adopt-existing',
    check: 'node tools/wp_refresh_offline_npm_vendor.mjs --profile eslint-js-strict --check',
  };
  for (const [suffix, command] of Object.entries(expectedScripts)) {
    assert.equal(pkg.scripts[`vendor:offline:eslint-js-strict:${suffix}`], command);
  }
  assert.equal(pkg.scripts['setup:offline:eslint'], 'python tools/bootstrap_offline_eslint.py');
  assert.equal(
    pkg.scripts['verify:offline:eslint'],
    'python tools/verify_offline_repair_vendor.py --eslint-only'
  );
  assert.equal(pkg.scripts['run:offline:eslint'], 'python tools/run_offline_eslint.py');
  assert.equal(
    pkg.scripts['lint:js:strict:offline'],
    'python tools/run_offline_eslint.py --profile js-only --strict'
  );

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_eslint.py'), 'utf8');
  const runner = fs.readFileSync(path.join(root, 'tools/run_offline_eslint.py'), 'utf8');
  assert.match(bootstrap, /ESLINT_PROFILE = "eslint-js-strict"/u);
  assert.match(bootstrap, /install_workspace_profile/u);
  assert.match(runner, /tools" \/ "wp_lint\.js"/u);
  assert.match(runner, /process_runner\.run_isolated/u);
  assert.doesNotMatch(runner, /(?:npm|npx|node_modules\/eslint\/bin\/eslint\.js)/u);

  const planCheck = spawnSync(process.execPath, [tool, '--profile', 'eslint-js-strict', '--check-plan'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(planCheck.status, 0, planCheck.stderr || planCheck.stdout);
  assert.match(
    planCheck.stdout,
    new RegExp(`workspace plan eslint-js-strict \\(${profile.packageCount} packages\\)`, 'u')
  );

  const downloads = spawnSync(process.execPath, [tool, '--all', '--print-downloads'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(downloads.status, 0, downloads.stderr || downloads.stdout);
  assert.match(
    downloads.stdout,
    new RegExp(`workspace eslint-js-strict \\(${profile.packageCount} packages\\)`, 'u')
  );
  const eslintEntry = profile.packages.find(entry => entry.name === 'eslint');
  assert.ok(eslintEntry, 'ESLint profile must contain the eslint root package');
  assert.match(downloads.stdout, new RegExp(escapeRegex(eslintEntry.file), 'u'));

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-eslint-vendor-'));
  try {
    const fixtureLock = structuredClone(lock);
    const fixtureManifest = structuredClone(manifest);
    delete fixtureManifest.workspace.profiles['eslint-js-strict'];
    const fixtureVendor = path.join(fixtureRoot, 'vendor/offline/eslint');
    fs.mkdirSync(fixtureVendor, { recursive: true });

    for (const entry of profile.packages) {
      const lockEntry = fixtureLock.packages[entry.lockPath];
      const packageJson = { name: entry.name, version: entry.version };
      for (const constraint of ['os', 'cpu', 'libc']) {
        if (Array.isArray(lockEntry[constraint])) packageJson[constraint] = lockEntry[constraint];
      }
      const archive = createNpmArchive(
        packageJson,
        entry.name === 'eslint'
          ? { 'bin/eslint.js': `#!/usr/bin/env node\nconsole.log('v${entry.version}');\n` }
          : {},
        entry.name === '@types/esrecurse' ? 'esrecurse' : 'package'
      );
      lockEntry.integrity = `sha512-${crypto.createHash('sha512').update(archive).digest('base64')}`;
      fs.mkdirSync(path.dirname(path.join(fixtureRoot, entry.file)), { recursive: true });
      fs.writeFileSync(path.join(fixtureRoot, entry.file), archive);
    }
    fs.writeFileSync(path.join(fixtureVendor, 'stale-0.0.0.tgz'), 'stale');
    fs.writeFileSync(
      path.join(fixtureRoot, 'package-lock.json'),
      `${JSON.stringify(fixtureLock, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(fixtureManifest, null, 2)}\n`
    );

    const adopt = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--profile', 'eslint-js-strict', '--adopt-existing'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(adopt.status, 0, adopt.stderr || adopt.stdout);
    assert.match(
      adopt.stdout,
      new RegExp(`workspace eslint-js-strict \\(${profile.packageCount} packages\\)`, 'u')
    );

    const synced = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'vendor/offline/manifest.json'), 'utf8')
    );
    assert.deepEqual(synced.workspace.profiles['eslint-js-strict'].rootDependencies, ['eslint']);
    assert.equal(synced.workspace.profiles['eslint-js-strict'].packageCount, profile.packageCount);
    assert.equal(fs.existsSync(path.join(fixtureVendor, 'stale-0.0.0.tgz')), false);

    const check = spawnSync(
      process.execPath,
      [tool, '--root', fixtureRoot, '--profile', 'eslint-js-strict', '--check'],
      { cwd: root, encoding: 'utf8' }
    );
    assert.equal(check.status, 0, check.stderr || check.stdout);

    const installProbe = String.raw`
from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core

fixture = Path(sys.argv[1]).resolve()
core.ROOT = fixture
core.MANIFEST_PATH = fixture / "vendor" / "offline" / "manifest.json"
core.LOCK_PATH = fixture / "package-lock.json"
manifest = core.load_manifest()
platform_definition = manifest.get("workspace", {}).get("platform", {})
key = platform_definition.get("key")
assert key == "linux-x64"
core.install_workspace_profile(
    manifest,
    key,
    Path(sys.argv[2]),
    "eslint-js-strict",
    force=True,
)
stamp = json.loads(
    (fixture / "node_modules" / ".offline-workspace-eslint-js-strict.json").read_text(
        encoding="utf-8"
    )
)
assert stamp["packageCount"] == len(manifest["workspace"]["profiles"]["eslint-js-strict"]["packages"])
assert (fixture / "node_modules" / "eslint" / "bin" / "eslint.js").is_file()
`;
    const install = spawnSync('python', ['-c', installProbe, fixtureRoot, process.execPath], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(install.status, 0, install.stderr || install.stdout);
    assert.equal(
      fs.existsSync(path.join(fixtureRoot, 'node_modules/@types/esrecurse/package.json')),
      true,
      'DefinitelyTyped-style tarball roots must install under the lockfile path'
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline npm refresh keeps each verified download so a later failure can resume', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const lock = readJson('package-lock.json');
  const tool = path.join(root, 'tools/wp_refresh_offline_npm_vendor.mjs');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'offline-vendor-resume-'));
  try {
    const fixtureLock = structuredClone(lock);
    const fixtureManifest = structuredClone(manifest);
    const common = fixtureLock.packages['node_modules/esbuild'];
    const platform = fixtureLock.packages['node_modules/@esbuild/linux-x64'];
    const commonArchive = createNpmArchive({ name: 'esbuild', version: common.version });
    const platformArchive = createNpmArchive(
      {
        name: '@esbuild/linux-x64',
        version: platform.version,
        os: platform.os,
        cpu: platform.cpu,
      },
      { 'bin/esbuild': '#!/bin/sh\nexit 0\n' }
    );
    common.integrity = `sha512-${crypto.createHash('sha512').update(commonArchive).digest('base64')}`;
    platform.integrity = `sha512-${crypto.createHash('sha512').update(platformArchive).digest('base64')}`;

    fs.mkdirSync(path.join(fixtureRoot, 'vendor/offline'), { recursive: true });
    fs.writeFileSync(
      path.join(fixtureRoot, 'package-lock.json'),
      `${JSON.stringify(fixtureLock, null, 2)}\n`
    );
    fs.writeFileSync(
      path.join(fixtureRoot, 'vendor/offline/manifest.json'),
      `${JSON.stringify(fixtureManifest, null, 2)}\n`
    );

    const preload = path.join(fixtureRoot, 'mock-https.cjs');
    fs.writeFileSync(
      preload,
      String.raw`
const https = require('node:https');
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');
const fixtures = JSON.parse(process.env.OFFLINE_VENDOR_DOWNLOAD_FIXTURES || '{}');
https.get = (url, options, callback) => {
  const request = new EventEmitter();
  request.setTimeout = () => request;
  request.destroy = error => {
    if (error) process.nextTick(() => request.emit('error', error));
  };
  process.nextTick(() => {
    const encoded = fixtures[String(url)];
    const response = Readable.from(encoded ? [Buffer.from(encoded, 'base64')] : []);
    response.statusCode = encoded ? 200 : 404;
    response.headers = {};
    callback(response);
  });
  return request;
};
`
    );

    const runRefresh = fixtures =>
      spawnSync(process.execPath, [tool, '--root', fixtureRoot, '--component', 'esbuild'], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${JSON.stringify(preload)}`.trim(),
          OFFLINE_VENDOR_DOWNLOAD_FIXTURES: JSON.stringify(fixtures),
        },
      });

    const failed = runRefresh({
      [common.resolved]: commonArchive.toString('base64'),
      [platform.resolved]: Buffer.from('not-the-pinned-platform-archive').toString('base64'),
    });
    assert.equal(failed.status, 1, failed.stderr || failed.stdout);
    assert.match(failed.stdout, /cached vendor\/offline\/esbuild\/esbuild-/u);
    assert.match(failed.stderr, /integrity mismatch/u);
    const cachedCommon = path.join(
      fixtureRoot,
      `vendor/offline/esbuild/${new URL(common.resolved).pathname.split('/').at(-1)}`
    );
    assert.equal(fs.readFileSync(cachedCommon).equals(commonArchive), true);
    assert.equal(
      fs.existsSync(
        path.join(
          fixtureRoot,
          `vendor/offline/esbuild/${new URL(platform.resolved).pathname.split('/').at(-1)}`
        )
      ),
      false
    );

    const resumed = runRefresh({
      [common.resolved]: commonArchive.toString('base64'),
      [platform.resolved]: platformArchive.toString('base64'),
    });
    assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
    assert.match(resumed.stdout, /adopting vendor\/offline\/esbuild\/esbuild-/u);
    assert.match(resumed.stdout, /cached vendor\/offline\/esbuild\/linux-x64-/u);
    assert.match(resumed.stdout, /OK: esbuild/u);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('offline AST compatibility window validates fallback and active parser boundaries independently', () => {
  const probe = String.raw`
from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core

assert core._bounded_range_accepts("0.144.0", ">=0.144.0 <0.145.0")
assert core._bounded_range_accepts("0.144.9", ">=0.144.0 <0.145.0")
assert not core._bounded_range_accepts("0.145.0", ">=0.144.0 <0.145.0")

manifest = core.load_manifest()
upper_boundary = manifest["ast"]["compatibleProjectRange"].split(" <", 1)[1]
offline_boundary_manifest = deepcopy(manifest)
offline_boundary_manifest["ast"]["version"] = upper_boundary
try:
    core.validate_manifest_against_project(offline_boundary_manifest)
except core.OfflineCoreError as error:
    assert f"Offline AST version {upper_boundary}" in str(error)
else:
    raise AssertionError("incompatible offline fallback was accepted")

lock = json.loads(core.LOCK_PATH.read_text(encoding="utf-8"))
lock["packages"]["node_modules/oxc-parser"]["version"] = upper_boundary
with tempfile.TemporaryDirectory() as temp_dir:
    original_lock_path = core.LOCK_PATH
    test_lock_path = Path(temp_dir) / "package-lock.json"
    test_lock_path.write_text(json.dumps(lock), encoding="utf-8")
    core.LOCK_PATH = test_lock_path
    try:
        core.validate_manifest_against_project(manifest)
    except core.OfflineCoreError as error:
        assert f"Project oxc-parser {upper_boundary}" in str(error)
    else:
        raise AssertionError("incompatible active parser was accepted")
    finally:
        core.LOCK_PATH = original_lock_path

print("ast-window-ok")
`;
  const result = spawnSync(process.env.PYTHON ?? 'python', ['-c', probe], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'ast-window-ok');
});

test('offline native manifests and archives are scoped to Linux x64 glibc', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const nativePlatformMaps = [
    manifest.node.platforms,
    manifest.ast.bindings,
    manifest.esbuild.platforms,
    manifest.typescript.platforms,
    manifest.oxlint.platforms,
    manifest.oxlint.typeAware.platforms,
  ];

  for (const platforms of nativePlatformMaps) {
    assert.deepEqual(Object.keys(platforms), ['linux-x64']);
  }

  const manifestText = JSON.stringify(manifest);
  assert.doesNotMatch(manifestText, /win32-x64|linux-arm64|win-x64|msvc/u);

  const archiveNames = fs.readdirSync(path.join(root, 'vendor/offline'), { recursive: true });
  assert.deepEqual(
    archiveNames.filter(name => /win32|win-x64|windows|arm64/iu.test(name)),
    []
  );

  for (const wrapper of [
    'bootstrap_offline_repair_core.bat',
    'bootstrap_offline_prettier.bat',
    'bootstrap_offline_typescript.bat',
    'bootstrap_offline_esbuild.bat',
    'bootstrap_offline_tsx.bat',
    'bootstrap_offline_oxlint.bat',
  ]) {
    assert.equal(fs.existsSync(path.join(root, 'tools', wrapper)), false);
  }
});

test('offline Oxlint scripts install and run both syntax and type-aware lint without npm', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['setup:offline:oxlint'], 'python tools/bootstrap_offline_oxlint.py');
  assert.equal(
    pkg.scripts['verify:offline:oxlint'],
    'python tools/verify_offline_repair_vendor.py --oxlint-only'
  );
  assert.equal(pkg.scripts['run:offline:oxlint'], 'python tools/run_offline_oxlint.py');
  assert.equal(
    pkg.scripts['lint:ts-modern:syntax:offline'],
    'python tools/run_offline_node24.py --node-only --with-oxlint tools/wp_oxlint_audit.mjs --mode syntax --fail-on-diagnostics'
  );
  assert.equal(
    pkg.scripts['lint:ts-modern:type-aware:offline'],
    'python tools/run_offline_node24.py --node-only --with-oxlint tools/wp_oxlint_audit.mjs --mode type-aware --fail-on-diagnostics'
  );
  assert.equal(
    pkg.scripts['vendor:offline:oxlint:refresh'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --component oxlint'
  );
  assert.equal(
    pkg.scripts['vendor:offline:oxlint:downloads'],
    'node tools/wp_refresh_offline_npm_vendor.mjs --component oxlint --print-downloads --missing-only'
  );

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  const nodeRunner = fs.readFileSync(path.join(root, 'tools/run_offline_node24.py'), 'utf8');
  const directRunner = fs.readFileSync(path.join(root, 'tools/run_offline_oxlint.py'), 'utf8');
  const processRunner = fs.readFileSync(path.join(root, 'tools/offline_process_runner.py'), 'utf8');
  assert.match(bootstrap, /def install_oxlint\(/u);
  assert.match(bootstrap, /OXLINT_TSGOLINT_PATH/u);
  assert.match(bootstrap, /npm run vendor:offline:oxlint:refresh/u);
  assert.doesNotMatch(bootstrap, /subprocess\.(?:run|Popen)\(\s*\[\s*['"]npm/u);
  assert.match(nodeRunner, /--with-oxlint/u);
  assert.match(nodeRunner, /core\.install_oxlint/u);
  assert.match(directRunner, /process_runner\.run_isolated/u);
  assert.match(directRunner, /environmentVariable/u);
  assert.match(processRunner, /env: Mapping\[str, str\] \| None = None/u);
  assert.match(processRunner, /env=None if env is None else dict\(env\)/u);
});

test('offline platform selection rejects Windows before archive lookup or download guidance', () => {
  const probe = String.raw`
from pathlib import Path
import sys
from unittest.mock import patch

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core
import verify_offline_repair_vendor as verify

cases = (
    ("linux", "x86_64", True, "linux-x64"),
    ("linux", "aarch64", True, core.UNSUPPORTED_PLATFORM_MESSAGE),
    ("linux", "x86_64", False, core.UNSUPPORTED_PLATFORM_MESSAGE),
    ("win32", "AMD64", False, core.UNSUPPORTED_PLATFORM_MESSAGE),
    ("darwin", "x86_64", False, core.UNSUPPORTED_PLATFORM_MESSAGE),
)
for system, machine, glibc, expected in cases:
    with (
        patch.object(core.sys, "platform", system),
        patch.object(core.platform, "machine", return_value=machine),
        patch.object(core, "_is_glibc_linux", return_value=glibc),
    ):
        try:
            actual = core.platform_key()
        except core.OfflineCoreError as error:
            actual = str(error)
        if actual != expected:
            raise AssertionError(f"{system}/{machine}/glibc={glibc}: {actual!r}")

with (
    patch.object(core.sys, "platform", "win32"),
    patch.object(core.platform, "machine", return_value="AMD64"),
    patch.object(core, "_require_file", side_effect=AssertionError("archive lookup attempted")),
):
    result = verify.main([])
if result != 2:
    raise AssertionError(f"unexpected verifier status: {result}")
print("platform-matrix-ok")
`;
  const result = spawnSync(process.env.PYTHON ?? 'python', ['-c', probe], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'platform-matrix-ok');
  assert.equal(
    result.stderr.trim(),
    'offline vendor verification error: Offline repair vendor supports Linux x64 glibc only'
  );
  assert.doesNotMatch(result.stderr, /https?:\/\/|archive|download/iu);
});

test('generated report checks can install their formatter through the offline Node runner', () => {
  const pkg = readJson('package.json');
  assert.equal(
    pkg.scripts['check:generated-reports:offline'],
    'python tools/run_offline_node24.py --with-prettier tools/wp_generated_report_contract.mjs --check'
  );
  assert.equal(
    pkg.scripts['report:generated:offline'],
    'python tools/run_offline_node24.py --with-prettier tools/wp_generated_report_contract.mjs --write'
  );

  const nodeRunner = fs.readFileSync(path.join(root, 'tools/run_offline_node24.py'), 'utf8');
  assert.match(nodeRunner, /--with-prettier/u);
  assert.match(nodeRunner, /prettier=args\.with_prettier/u);
  assert.match(nodeRunner, /core\.install_prettier\(manifest, executable\)/u);
});

test('offline TypeScript scripts use the pinned compiler and preserve declaration snapshots', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['setup:offline:typescript'], 'python tools/bootstrap_offline_typescript.py');
  assert.match(pkg.scripts['typecheck:offline'], /--node-only --with-typescript/);
  assert.match(pkg.scripts['typecheck:offline:all'], /--node-only --with-typescript/);
  assert.equal(pkg.scripts['typecheck:offline:dist'], undefined);
  assert.match(pkg.scripts['test:offline:declaration-snapshot'], /--with-typescript --with-esbuild/);
  assert.doesNotMatch(pkg.scripts['test:offline:declaration-snapshot'], /--node-only/);
  assert.match(
    pkg.scripts['test:offline:declaration-snapshot'],
    /wardrobe_dimension_runtime_public_surface_contract\.test\.js/
  );

  const resolver = fs.readFileSync(path.join(root, 'tools/wp_typescript_resolver.js'), 'utf8');
  assert.match(resolver, /Local TypeScript version mismatch/);
  assert.match(resolver, /do not regenerate declarations or snapshots with the wrong compiler/);
});

test('offline esbuild scripts install the focused runtime without npm', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.scripts['setup:offline:esbuild'], 'python tools/bootstrap_offline_esbuild.py');
  assert.equal(
    pkg.scripts['verify:offline:esbuild'],
    'python tools/verify_offline_repair_vendor.py --esbuild-only'
  );
  assert.equal(pkg.scripts['test:offline:esbuild'], 'python tools/selftest_offline_esbuild.py');

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  assert.match(bootstrap, /def install_esbuild\(/);
  assert.match(bootstrap, /esbuild binary SHA-256 mismatch/);
  assert.match(bootstrap, /transformSync/);
  assert.doesNotMatch(bootstrap, /subprocess\.(?:run|Popen)\(\s*\[\s*['"]npm/u);
});

test('offline TSX manifest is exact, lockfile-backed, and reuses pinned esbuild', () => {
  const manifest = readJson('vendor/offline/manifest.json');
  const pkg = readJson('package.json');
  const lock = readJson('package-lock.json');
  const tsx = manifest.tsx;
  const lockEntry = lock.packages[tsx.package.lockPath];

  assert.equal(tsx.version, lockEntry.version);
  assert.equal(pkg.devDependencies.tsx, lock.packages[''].devDependencies.tsx);
  assert.equal(tsx.executable, 'dist/cli.mjs');
  assert.equal(tsx.esbuildRange, '~0.28.0');
  assertLockEntry(tsx.package, tsx.version, lock.packages);
  assert.equal(lockEntry.dependencies.esbuild, tsx.esbuildRange);
  assert.equal(manifest.esbuild.version, lock.packages['node_modules/esbuild'].version);
  assert.equal(lock.packages['node_modules/esbuild'].version, manifest.esbuild.version);
});

test('offline TSX scripts install the lock-derived runtime profile without npx or npm', () => {
  const pkg = readJson('package.json');
  const manifest = readJson('vendor/offline/manifest.json');
  assert.equal(pkg.scripts['setup:offline:tsx'], 'python tools/bootstrap_offline_tsx.py');
  assert.equal(
    pkg.scripts['setup:offline:tsx:engine'],
    'python tools/bootstrap_offline_tsx.py --engine-only'
  );
  assert.equal(pkg.scripts['verify:offline:tsx'], 'python tools/verify_offline_repair_vendor.py --tsx-only');
  assert.equal(
    pkg.scripts['verify:offline:tsx:engine'],
    'python tools/verify_offline_repair_vendor.py --tsx-engine-only'
  );
  assert.equal(pkg.scripts['test:offline:tsx'], 'python tools/selftest_offline_tsx.py');
  assert.match(
    pkg.scripts['test:offline:dimension-composition-runtime'],
    /run_offline_tsx_tests\.py tests\/dimension_composition_runtime\.test\.ts/u
  );

  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  const selfTest = fs.readFileSync(path.join(root, 'tools/selftest_offline_tsx.py'), 'utf8');
  const runner = fs.readFileSync(path.join(root, 'tools/run_offline_tsx_tests.py'), 'utf8');
  const nodeRunner = fs.readFileSync(path.join(root, 'tools/run_offline_node24.py'), 'utf8');
  const processRunner = fs.readFileSync(path.join(root, 'tools/offline_process_runner.py'), 'utf8');
  assert.match(bootstrap, /def install_tsx\(/u);
  assert.match(bootstrap, /def install_workspace_profile\(/u);
  assert.match(bootstrap, /workspace-runtime-ok/u);
  assert.match(bootstrap, /def _tilde_range_accepts\(/u);
  assert.match(bootstrap, /--import", "tsx"/u);
  assert.match(selfTest, /offline_tsx_runtime_smoke\.test\.tsx/u);
  assert.match(selfTest, /"--import",\s*"tsx",\s*"--test"/u);
  assert.match(selfTest, /process_runner\.run_isolated/u);
  assert.doesNotMatch(selfTest, /tools\/wp_run_tsx_tests\.mjs/u);
  assert.doesNotMatch(selfTest, /install_(?:tsx|workspace_profile)\([^\n]*force=True/u);
  assert.doesNotMatch(selfTest, /\["\/bin\/sh"/u);
  assert.match(runner, /tools\/wp_run_tsx_tests\.mjs/u);
  assert.match(runner, /install_workspace_profile/u);
  assert.match(runner, /process_runner\.run_isolated/u);
  assert.match(nodeRunner, /--with-runtime/u);
  assert.match(nodeRunner, /install_workspace_profile/u);
  assert.match(nodeRunner, /process_runner\.run_isolated/u);
  assert.match(processRunner, /_PR_SET_CHILD_SUBREAPER = 36/u);
  assert.match(processRunner, /libc\.prctl\(_PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0\)/u);
  assert.match(processRunner, /start_new_session=True/u);
  assert.match(processRunner, /os\.killpg\(process_group_id, signal\.SIGTERM\)/u);
  assert.match(processRunner, /os\.killpg\(process_group_id, signal\.SIGKILL\)/u);
  assert.match(processRunner, /os\.waitpid\(-1, os\.WNOHANG\)/u);
  assert.match(processRunner, /finally:\s*terminate_process_group\(process\.pid\)\s*reap_descendants\(\)/u);
  assert.equal(
    pkg.scripts['test:offline:tsx-runtime-smoke'],
    'python tools/run_offline_tsx_tests.py tests/offline_tsx_runtime_smoke.test.tsx'
  );
  assert.equal(
    pkg.scripts['test:offline:order-pdf-diagnostic'],
    'python tools/run_offline_tsx_tests.py tests/order_pdf_diagnostic_classifier_runtime.test.ts'
  );

  const runtimeSmoke = fs.readFileSync(path.join(root, 'tests/offline_tsx_runtime_smoke.test.tsx'), 'utf8');
  for (const packageName of [
    '@pdf-lib/fontkit',
    '@supabase/supabase-js',
    'pdf-lib',
    'pdfjs-dist/legacy/build/pdf.mjs',
    'react',
    'react-dom/server',
    'three',
    'zustand/vanilla',
  ]) {
    assert.match(runtimeSmoke, new RegExp(`from ['"]${packageName.replaceAll('/', '\\/')}['"]`, 'u'));
  }
  assert.doesNotMatch(runtimeSmoke, /@playwright\/test/u);

  const classifier = fs.readFileSync(
    path.join(root, 'tests/support/order_pdf_diagnostic_classifier.ts'),
    'utf8'
  );
  const classifierTest = fs.readFileSync(
    path.join(root, 'tests/order_pdf_diagnostic_classifier_runtime.test.ts'),
    'utf8'
  );
  const e2eHelper = fs.readFileSync(path.join(root, 'tests/e2e/helpers/project_flows.ts'), 'utf8');
  assert.doesNotMatch(classifier, /@playwright\/test/u);
  assert.doesNotMatch(classifierTest, /@playwright\/test/u);
  assert.match(classifierTest, /support\/order_pdf_diagnostic_classifier\.js/u);
  assert.match(e2eHelper, /support\/order_pdf_diagnostic_classifier\.js/u);
  assert.doesNotMatch(
    manifest.workspace.profiles['tsx-tests'].packages.map(entry => entry.name).join('\n'),
    /^(?:@playwright\/test|playwright|playwright-core)$/mu
  );
  assert.doesNotMatch(bootstrap, /subprocess\.(?:run|Popen)\(\s*\[\s*['"](?:npm|npx)/u);
});

test('offline npm extraction recreates npm-style bin links and repairs missing links', () => {
  const probe = String.raw`
from pathlib import Path
import json
import sys
import tarfile
import tempfile

sys.path.insert(0, str(Path.cwd() / "tools"))
import bootstrap_offline_repair_core as core

fixture = Path(tempfile.mkdtemp(prefix="offline-bin-links-"))
source = fixture / "source" / "package"
(source / "bin").mkdir(parents=True)
(source / "package.json").write_text(json.dumps({
    "name": "offline-bin-fixture",
    "version": "1.0.0",
    "bin": {"offline-bin-fixture": "bin/cli.js"},
}), encoding="utf-8")
(source / "bin" / "cli.js").write_text("#!/usr/bin/env node\\n", encoding="utf-8")
archive = fixture / "vendor" / "offline" / "fixture.tgz"
archive.parent.mkdir(parents=True)
with tarfile.open(archive, "w:gz") as bundle:
    bundle.add(source, arcname="package")

original_root = core.ROOT
core.ROOT = fixture
try:
    entry = {
        "file": "vendor/offline/fixture.tgz",
        "installPath": "node_modules/offline-bin-fixture",
    }
    destination = core._install_npm_entry(entry, "1.0.0")
    link = fixture / "node_modules" / ".bin" / "offline-bin-fixture"
    target = destination / "bin" / "cli.js"
    if not link.is_symlink() or link.resolve() != target.resolve():
        raise AssertionError("initial npm bin link was not created")

    link.unlink()
    core._install_npm_entry(entry, "1.0.0")
    if not link.is_symlink() or link.resolve() != target.resolve():
        raise AssertionError("matching installed package did not repair its missing npm bin link")

    core._remove_npm_bin_links(destination)
    if link.exists() or link.is_symlink():
        raise AssertionError("owned npm bin link was not cleaned before package removal")
finally:
    core.ROOT = original_root

print("npm-bin-links-ok")
`;
  const result = spawnSync(process.env.PYTHON ?? 'python', ['-c', probe], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), 'npm-bin-links-ok');
});

test('offline toolchain exposes one-shot chat setup and full unit-test commands', () => {
  const pkg = readJson('package.json');
  assert.equal(
    pkg.scripts['setup:offline:toolchain'],
    'python tools/bootstrap_offline_repair_core.py --with-tsx --with-prettier --with-typescript --with-oxlint && python tools/bootstrap_offline_vite.py && python tools/bootstrap_offline_eslint.py'
  );
  assert.equal(
    pkg.scripts['test:offline'],
    'python tools/run_offline_node24.py --with-typescript --with-prettier --with-tsx --with-runtime --with-oxlint --with-vite tools/wp_test.js'
  );

  const coreBootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  const nodeRunner = fs.readFileSync(path.join(root, 'tools/run_offline_node24.py'), 'utf8');
  assert.match(coreBootstrap, /def _extract_node_package_manager\(/u);
  assert.match(coreBootstrap, /def create_offline_environment\(/u);
  assert.match(coreBootstrap, /node_modules.*\.bin/u);
  assert.match(nodeRunner, /--with-vite/u);
  assert.match(nodeRunner, /--with-eslint/u);
  assert.match(nodeRunner, /create_offline_environment/u);
});

test('offline Python caches are ignored and bootstrap JSON parsing stays single-read', () => {
  const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(gitignore, /(?:^|\n)__pycache__\/(?:\n|$)/u);
  assert.match(gitignore, /(?:^|\n)\*\.py\[cod\](?:\n|$)/u);
  const bootstrap = fs.readFileSync(path.join(root, 'tools/bootstrap_offline_repair_core.py'), 'utf8');
  assert.equal((bootstrap.match(/json\.loads\(package_json\.read_text/gu) ?? []).length, 1);
  assert.equal(
    (bootstrap.match(/platform_entry = typescript\.get\("platforms", \{\}\)\.get\(key\)/gu) ?? []).length,
    1
  );
});
