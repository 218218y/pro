#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const SUPPORTED_COMPONENTS = Object.freeze(['esbuild', 'tsx', 'prettier', 'typescript', 'oxlint']);
const COMPONENT_SET = new Set(SUPPORTED_COMPONENTS);
const SUPPORTED_PROFILES = Object.freeze(['tsx-tests', 'vite-build', 'eslint-js-strict']);
const STANDARD_PACKAGE_PROFILES = Object.freeze(['tsx-tests', 'vite-build', 'eslint-js-strict']);
const PROFILE_SET = new Set(SUPPORTED_PROFILES);
const VITE_BUILD_ROOT_DEPENDENCIES = Object.freeze(['@vitejs/plugin-react', 'vite']);
const VITE_BUILD_EXCLUDED_OPTIONAL_DEPENDENCIES = new Set(['@rolldown/binding-wasm32-wasi']);
const ESLINT_JS_STRICT_ROOT_DEPENDENCIES = Object.freeze(['eslint']);
const LINUX_X64_GLIBC = Object.freeze({
  key: 'linux-x64',
  os: 'linux',
  cpu: 'x64',
  libc: 'glibc',
});

function fail(message) {
  throw new Error(`[offline-npm-vendor] ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalizeExecutable(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} has no executable`);
  return value.replace(/^\.\//u, '');
}

function packageBin(lockEntry, binName) {
  const bin = lockEntry.bin;
  if (typeof bin === 'string') return normalizeExecutable(bin, `${binName} package`);
  if (!bin || typeof bin !== 'object') fail(`${binName} package has no bin definition`);
  return normalizeExecutable(bin[binName], `${binName} package`);
}

function sha512Integrity(buffer) {
  return `sha512-${crypto.createHash('sha512').update(buffer).digest('base64')}`;
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function parseTarEntries(buffer) {
  if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
    fail('archive is not gzip-compressed');
  }
  const uncompressed = zlib.gunzipSync(buffer);
  const entries = new Map();
  let offset = 0;
  while (offset + 512 <= uncompressed.length) {
    const header = uncompressed.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/u, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/u, '');
    const fullName = prefix ? `${prefix}/${name}` : name;
    const sizeText = header.subarray(124, 136).toString('ascii').replace(/\0.*$/u, '').trim();
    const size = Number.parseInt(sizeText || '0', 8);
    if (!Number.isFinite(size) || size < 0) fail(`invalid tar entry size for ${fullName}`);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (contentEnd > uncompressed.length) fail(`truncated tar entry: ${fullName}`);
    entries.set(fullName, uncompressed.subarray(contentStart, contentEnd));
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function npmPackageJsonEntry(entries, target) {
  const canonical = entries.get('package/package.json');
  if (canonical) return canonical;

  const candidates = [...entries.entries()].filter(([entryName]) => {
    const parts = entryName.split('/').filter(Boolean);
    return parts.at(-1) === 'package.json' && parts.length <= 2;
  });
  if (candidates.length === 1) return candidates[0][1];
  if (candidates.length === 0) {
    fail(
      `${target.fileName} has no npm package.json at package/package.json ` +
        'or beneath a single top-level package directory'
    );
  }
  fail(
    `${target.fileName} has ambiguous top-level package.json entries: ${candidates
      .map(([entryName]) => entryName)
      .join(', ')}`
  );
}

function packageNameFromLockPath(lockPath) {
  const marker = 'node_modules/';
  const markerIndex = lockPath.lastIndexOf(marker);
  if (markerIndex < 0) fail(`invalid npm lock path: ${lockPath}`);
  return lockPath.slice(markerIndex + marker.length);
}

function targetFromLock(packages, lockPath, directory) {
  const lockEntry = packages[lockPath];
  if (!lockEntry) fail(`${lockPath} is missing from package-lock.json`);
  if (typeof lockEntry.version !== 'string' || lockEntry.version.length === 0) {
    fail(`${lockPath} has no version`);
  }
  if (!/^https:\/\/registry\.npmjs\.org\//u.test(lockEntry.resolved ?? '')) {
    fail(`${lockPath} does not use the official npm registry`);
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(lockEntry.integrity ?? '')) {
    fail(`${lockPath} has no valid SHA-512 integrity`);
  }
  const fileName = new URL(lockEntry.resolved).pathname.split('/').at(-1);
  if (!fileName?.endsWith('.tgz')) fail(`${lockPath} has an invalid tarball URL`);
  return {
    lockPath,
    installPath: lockPath,
    packageName: packageNameFromLockPath(lockPath),
    version: lockEntry.version,
    url: lockEntry.resolved,
    integrity: lockEntry.integrity,
    fileName,
    file: `vendor/offline/${directory}/${fileName}`,
    lockEntry,
  };
}

function platformConstraintAccepts(values, target) {
  if (!Array.isArray(values) || values.length === 0) return true;
  const allowed = values.filter(value => typeof value === 'string' && !value.startsWith('!'));
  const blocked = values
    .filter(value => typeof value === 'string' && value.startsWith('!'))
    .map(value => value.slice(1));
  return !blocked.includes(target) && (allowed.length === 0 || allowed.includes(target));
}

function supportsLinuxX64Glibc(lockEntry) {
  return (
    platformConstraintAccepts(lockEntry.os, LINUX_X64_GLIBC.os) &&
    platformConstraintAccepts(lockEntry.cpu, LINUX_X64_GLIBC.cpu) &&
    platformConstraintAccepts(lockEntry.libc, LINUX_X64_GLIBC.libc)
  );
}

function dependencyCandidates(lockPath, dependencyName) {
  const candidates = [];
  let current = lockPath;
  while (current) {
    candidates.push(`${current}/node_modules/${dependencyName}`);
    const markerIndex = current.lastIndexOf('/node_modules/');
    if (markerIndex < 0) break;
    current = current.slice(0, markerIndex);
  }
  candidates.push(`node_modules/${dependencyName}`);
  return [...new Set(candidates.filter(candidate => !candidate.startsWith('node_modules/node_modules/')))];
}

function resolveDependencyLockPath(packages, fromLockPath, dependencyName) {
  if (!fromLockPath) {
    const rootPath = `node_modules/${dependencyName}`;
    return packages[rootPath] ? rootPath : null;
  }
  return dependencyCandidates(fromLockPath, dependencyName).find(candidate => packages[candidate]) ?? null;
}

function profileArchiveFile(target, directory) {
  const safeName = target.packageName.replace(/^@/u, '').replaceAll('/', '__');
  return `vendor/offline/${directory}/${safeName}-${target.version}.tgz`;
}

function profileTargetFromLock(packages, lockPath, directory) {
  const target = targetFromLock(packages, lockPath, directory);
  return { ...target, file: profileArchiveFile(target, directory) };
}

function toManifestEntry(target) {
  return {
    lockPath: target.lockPath,
    installPath: target.installPath,
    file: target.file,
    url: target.url,
    integrity: target.integrity,
  };
}

function assertAlignedVersions(component, targets) {
  const versions = new Set(targets.map(target => target.version));
  if (versions.size !== 1) {
    fail(`${component} package versions are not aligned: ${[...versions].join(', ')}`);
  }
  return targets[0].version;
}

function tildeRangeAccepts(version, range) {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version ?? '');
  const rangeMatch = /^~(\d+)\.(\d+)\.(\d+)$/u.exec(range ?? '');
  if (!versionMatch || !rangeMatch) fail(`unsupported TSX/esbuild version pair: ${version} / ${range}`);
  const actual = versionMatch.slice(1).map(Number);
  const minimum = rangeMatch.slice(1).map(Number);
  return actual[0] === minimum[0] && actual[1] === minimum[1] && actual[2] >= minimum[2];
}

function minimumRangeAccepts(version, range) {
  const versionMatch = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version ?? '');
  const rangeMatch = /^>=(\d+)\.(\d+)\.(\d+)$/u.exec(range ?? '');
  if (!versionMatch || !rangeMatch) fail(`unsupported minimum version pair: ${version} / ${range}`);
  const actual = versionMatch.slice(1).map(Number);
  const minimum = rangeMatch.slice(1).map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] !== minimum[index]) return actual[index] > minimum[index];
  }
  return true;
}

function verifyTsxEsbuildCompatibility(manifest) {
  const tsx = manifest.tsx;
  const esbuild = manifest.esbuild;
  if (!tsx || !esbuild) fail('manifest must define both TSX and esbuild');
  if (!tildeRangeAccepts(esbuild.version, tsx.esbuildRange)) {
    fail(`offline esbuild ${esbuild.version} does not satisfy TSX dependency ${tsx.esbuildRange}`);
  }
}

function buildComponent(lock, component) {
  const packages = lock.packages;
  if (!packages || typeof packages !== 'object') fail('package-lock.json has no packages map');

  if (component === 'tsx') {
    const packageTarget = targetFromLock(packages, 'node_modules/tsx', 'tsx');
    const esbuildRange = packageTarget.lockEntry.dependencies?.esbuild;
    if (typeof esbuildRange !== 'string' || esbuildRange.length === 0) {
      fail('node_modules/tsx has no esbuild dependency range');
    }
    const esbuildVersion = packages['node_modules/esbuild']?.version;
    if (!tildeRangeAccepts(esbuildVersion, esbuildRange)) {
      fail(`lockfile esbuild ${esbuildVersion} does not satisfy TSX dependency ${esbuildRange}`);
    }
    return {
      component,
      directory: 'tsx',
      version: packageTarget.version,
      targets: [packageTarget],
      createManifestEntry() {
        return {
          version: packageTarget.version,
          package: toManifestEntry(packageTarget),
          esbuildRange,
          executable: packageBin(packageTarget.lockEntry, 'tsx'),
        };
      },
    };
  }

  if (component === 'prettier') {
    const packageTarget = targetFromLock(packages, 'node_modules/prettier', 'prettier');
    return {
      component,
      directory: 'prettier',
      version: packageTarget.version,
      targets: [packageTarget],
      createManifestEntry() {
        return {
          version: packageTarget.version,
          package: toManifestEntry(packageTarget),
          executable: packageBin(packageTarget.lockEntry, 'prettier'),
        };
      },
    };
  }

  if (component === 'esbuild') {
    const packageTarget = targetFromLock(packages, 'node_modules/esbuild', 'esbuild');
    const platformTarget = targetFromLock(packages, 'node_modules/@esbuild/linux-x64', 'esbuild');
    const version = assertAlignedVersions(component, [packageTarget, platformTarget]);
    return {
      component,
      directory: 'esbuild',
      version,
      targets: [packageTarget, platformTarget],
      createManifestEntry(buffers) {
        const binary = parseTarEntries(buffers.get(platformTarget.lockPath)).get('package/bin/esbuild');
        if (!binary) fail(`${platformTarget.fileName} has no package/bin/esbuild`);
        return {
          version,
          package: toManifestEntry(packageTarget),
          platforms: {
            'linux-x64': {
              ...toManifestEntry(platformTarget),
              executable: 'bin/esbuild',
              binarySha256: sha256Hex(binary),
            },
          },
          launcher: packageBin(packageTarget.lockEntry, 'esbuild'),
        };
      },
    };
  }

  if (component === 'typescript') {
    const packageTarget = targetFromLock(packages, 'node_modules/typescript', 'typescript');
    const platformTarget = targetFromLock(
      packages,
      'node_modules/@typescript/typescript-linux-x64',
      'typescript'
    );
    const version = assertAlignedVersions(component, [packageTarget, platformTarget]);
    return {
      component,
      directory: 'typescript',
      version,
      targets: [packageTarget, platformTarget],
      createManifestEntry(buffers) {
        const compiler = parseTarEntries(buffers.get(platformTarget.lockPath)).get('package/lib/tsc');
        if (!compiler) fail(`${platformTarget.fileName} has no package/lib/tsc`);
        return {
          version,
          package: toManifestEntry(packageTarget),
          platforms: {
            'linux-x64': {
              ...toManifestEntry(platformTarget),
              executable: 'lib/tsc',
            },
          },
          launcher: packageBin(packageTarget.lockEntry, 'tsc'),
        };
      },
    };
  }

  if (component === 'oxlint') {
    const packageTarget = targetFromLock(packages, 'node_modules/oxlint', 'oxlint');
    const platformTarget = targetFromLock(packages, 'node_modules/@oxlint/binding-linux-x64-gnu', 'oxlint');
    const typeAwareTarget = targetFromLock(packages, 'node_modules/oxlint-tsgolint', 'oxlint');
    const typeAwarePlatformTarget = targetFromLock(
      packages,
      'node_modules/@oxlint-tsgolint/linux-x64',
      'oxlint'
    );
    const version = assertAlignedVersions(component, [packageTarget, platformTarget]);
    const typeAwareVersion = assertAlignedVersions('oxlint-tsgolint', [
      typeAwareTarget,
      typeAwarePlatformTarget,
    ]);
    if (!supportsLinuxX64Glibc(platformTarget.lockEntry)) {
      fail(`${platformTarget.lockPath} does not target Linux x64 glibc`);
    }
    if (!supportsLinuxX64Glibc(typeAwarePlatformTarget.lockEntry)) {
      fail(`${typeAwarePlatformTarget.lockPath} does not target Linux x64 glibc`);
    }
    const typeAwareRange = packageTarget.lockEntry.peerDependencies?.['oxlint-tsgolint'];
    if (typeof typeAwareRange !== 'string' || !minimumRangeAccepts(typeAwareVersion, typeAwareRange)) {
      fail(`oxlint-tsgolint ${typeAwareVersion} does not satisfy oxlint peer ${typeAwareRange}`);
    }
    if (packageTarget.lockEntry.optionalDependencies?.['@oxlint/binding-linux-x64-gnu'] !== version) {
      fail('oxlint Linux x64 glibc binding is not aligned with the common package');
    }
    if (typeAwareTarget.lockEntry.optionalDependencies?.['@oxlint-tsgolint/linux-x64'] !== typeAwareVersion) {
      fail('oxlint-tsgolint Linux x64 binding is not aligned with the common package');
    }
    return {
      component,
      directory: 'oxlint',
      version,
      targets: [packageTarget, platformTarget, typeAwareTarget, typeAwarePlatformTarget],
      createManifestEntry() {
        return {
          version,
          package: toManifestEntry(packageTarget),
          platforms: {
            'linux-x64': {
              ...toManifestEntry(platformTarget),
              runtime: 'gnu',
            },
          },
          launcher: packageBin(packageTarget.lockEntry, 'oxlint'),
          typeAware: {
            version: typeAwareVersion,
            package: toManifestEntry(typeAwareTarget),
            platforms: {
              'linux-x64': toManifestEntry(typeAwarePlatformTarget),
            },
            launcher: packageBin(typeAwareTarget.lockEntry, 'tsgolint'),
            environmentVariable: 'OXLINT_TSGOLINT_PATH',
          },
        };
      },
    };
  }

  fail(`unsupported component: ${component}`);
}

function buildWorkspaceProfile(
  lock,
  lockfileSha256,
  { profile, directory, rootDependencies, excludedOptionalDependencies = new Set() }
) {
  const packages = lock.packages;
  if (!packages || typeof packages !== 'object') fail('package-lock.json has no packages map');
  const rootPackage = packages[''];
  if (!rootPackage || typeof rootPackage !== 'object') {
    fail('package-lock.json has no root package entry');
  }

  const queue = [];
  for (const dependencyName of rootDependencies) {
    const lockPath = resolveDependencyLockPath(packages, '', dependencyName);
    if (!lockPath) fail(`profile root dependency is absent from package-lock.json: ${dependencyName}`);
    queue.push(lockPath);
  }

  const selected = new Set();
  while (queue.length > 0) {
    const lockPath = queue.shift();
    if (selected.has(lockPath)) continue;
    const lockEntry = packages[lockPath];
    if (!lockEntry || typeof lockEntry !== 'object') fail(`missing lock entry: ${lockPath}`);
    if (!supportsLinuxX64Glibc(lockEntry)) {
      fail(`required profile package is incompatible with Linux x64 glibc: ${lockPath}`);
    }
    selected.add(lockPath);

    for (const dependencyName of Object.keys(lockEntry.dependencies ?? {})) {
      const dependencyPath = resolveDependencyLockPath(packages, lockPath, dependencyName);
      if (!dependencyPath) {
        fail(`${lockPath} dependency is absent from package-lock.json: ${dependencyName}`);
      }
      const dependencyEntry = packages[dependencyPath];
      if (!supportsLinuxX64Glibc(dependencyEntry)) {
        fail(`${lockPath} requires an incompatible package: ${dependencyPath}`);
      }
      queue.push(dependencyPath);
    }

    for (const dependencyName of Object.keys(lockEntry.optionalDependencies ?? {})) {
      if (excludedOptionalDependencies.has(dependencyName)) continue;
      const dependencyPath = resolveDependencyLockPath(packages, lockPath, dependencyName);
      if (!dependencyPath) continue;
      const dependencyEntry = packages[dependencyPath];
      if (supportsLinuxX64Glibc(dependencyEntry)) queue.push(dependencyPath);
    }

    for (const dependencyName of Object.keys(lockEntry.peerDependencies ?? {})) {
      if (lockEntry.peerDependenciesMeta?.[dependencyName]?.optional) continue;
      const dependencyPath = resolveDependencyLockPath(packages, lockPath, dependencyName);
      if (!dependencyPath) continue;
      if (supportsLinuxX64Glibc(packages[dependencyPath])) queue.push(dependencyPath);
    }
  }

  const targets = [...selected]
    .sort((left, right) => left.localeCompare(right))
    .map(lockPath => profileTargetFromLock(packages, lockPath, directory));
  const archiveOwners = new Map();
  for (const target of targets) {
    const existing = archiveOwners.get(target.file);
    if (existing && (existing.url !== target.url || existing.integrity !== target.integrity)) {
      fail(`workspace archive path collision: ${existing.lockPath} and ${target.lockPath}`);
    }
    archiveOwners.set(target.file, target);
  }
  return {
    profile,
    directory,
    version: lock.lockfileVersion,
    lockfileSha256,
    rootDependencies,
    targets,
    createManifestEntry() {
      return {
        rootDependencies,
        packageCount: targets.length,
        packages: targets.map(target => ({
          name: target.packageName,
          version: target.version,
          ...toManifestEntry(target),
        })),
      };
    },
  };
}

function buildTsxTestsProfile(lock, lockfileSha256) {
  const rootDependencies = Object.keys(lock.packages?.['']?.dependencies ?? {}).sort();
  return buildWorkspaceProfile(lock, lockfileSha256, {
    profile: 'tsx-tests',
    directory: 'runtime',
    rootDependencies,
  });
}

function buildViteBuildProfile(lock, lockfileSha256) {
  const rootPackage = lock.packages?.[''];
  if (!rootPackage || typeof rootPackage !== 'object') {
    fail('package-lock.json has no root package entry');
  }
  for (const dependencyName of VITE_BUILD_ROOT_DEPENDENCIES) {
    if (!Object.hasOwn(rootPackage.devDependencies ?? {}, dependencyName)) {
      fail(`Vite build root is not a project devDependency: ${dependencyName}`);
    }
  }
  return buildWorkspaceProfile(lock, lockfileSha256, {
    profile: 'vite-build',
    directory: 'vite',
    rootDependencies: [...VITE_BUILD_ROOT_DEPENDENCIES],
    excludedOptionalDependencies: VITE_BUILD_EXCLUDED_OPTIONAL_DEPENDENCIES,
  });
}

function buildEslintJsStrictProfile(lock, lockfileSha256) {
  const rootPackage = lock.packages?.[''];
  if (!rootPackage || typeof rootPackage !== 'object') {
    fail('package-lock.json has no root package entry');
  }
  for (const dependencyName of ESLINT_JS_STRICT_ROOT_DEPENDENCIES) {
    if (!Object.hasOwn(rootPackage.devDependencies ?? {}, dependencyName)) {
      fail(`ESLint strict root is not a project devDependency: ${dependencyName}`);
    }
  }
  return buildWorkspaceProfile(lock, lockfileSha256, {
    profile: 'eslint-js-strict',
    directory: 'eslint',
    rootDependencies: [...ESLINT_JS_STRICT_ROOT_DEPENDENCIES],
  });
}

function buildProfile(lock, profile, lockfileSha256) {
  if (profile === 'tsx-tests') return buildTsxTestsProfile(lock, lockfileSha256);
  if (profile === 'vite-build') return buildViteBuildProfile(lock, lockfileSha256);
  if (profile === 'eslint-js-strict') return buildEslintJsStrictProfile(lock, lockfileSha256);
  fail(`unsupported profile: ${profile}`);
}

function download(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'wardrobe-offline-npm-vendor-refresh/1',
        },
      },
      response => {
        const status = response.statusCode ?? 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          if (redirectsLeft <= 0) return reject(new Error(`too many redirects for ${url}`));
          return resolve(download(new URL(response.headers.location, url).href, redirectsLeft - 1));
        }
        if (status !== 200) {
          response.resume();
          return reject(new Error(`HTTP ${status} for ${url}`));
        }
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }
    );
    request.setTimeout(60_000, () => request.destroy(new Error(`download timed out: ${url}`)));
    request.on('error', reject);
  });
}

function verifyArchive(buffer, target) {
  const actualIntegrity = sha512Integrity(buffer);
  if (actualIntegrity !== target.integrity) {
    fail(`${target.fileName} integrity mismatch\nexpected ${target.integrity}\nactual   ${actualIntegrity}`);
  }
  const packageJsonBuffer = npmPackageJsonEntry(parseTarEntries(buffer), target);
  const packageJson = JSON.parse(packageJsonBuffer.toString('utf8'));
  if (packageJson.name !== target.packageName || packageJson.version !== target.version) {
    fail(
      `${target.fileName} package metadata mismatch: expected ${target.packageName}@${target.version}, ` +
        `received ${packageJson.name}@${packageJson.version}`
    );
  }
  for (const constraint of ['os', 'cpu', 'libc']) {
    if (
      Array.isArray(target.lockEntry[constraint]) &&
      JSON.stringify(packageJson[constraint]) !== JSON.stringify(target.lockEntry[constraint])
    ) {
      fail(`${target.fileName} ${constraint} metadata does not match package-lock.json`);
    }
  }
}

function persistVerifiedArchive(root, target, buffer) {
  const archivePath = path.join(root, target.file);
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  const temporaryPath = `${archivePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    fs.writeFileSync(temporaryPath, buffer);
    try {
      fs.renameSync(temporaryPath, archivePath);
    } catch (error) {
      if (!['EACCES', 'EEXIST', 'EPERM'].includes(error?.code)) throw error;
      fs.rmSync(archivePath, { force: true });
      fs.renameSync(temporaryPath, archivePath);
    }
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
  console.log(`[offline-npm-vendor] cached ${target.file}`);
}

function manifestEntriesFor(component, entry) {
  if (component === 'tsx' || component === 'prettier') return [entry.package];
  if (component === 'esbuild' || component === 'typescript') {
    return [entry.package, entry.platforms?.['linux-x64']];
  }
  if (component === 'oxlint') {
    return [
      entry.package,
      entry.platforms?.['linux-x64'],
      entry.typeAware?.package,
      entry.typeAware?.platforms?.['linux-x64'],
    ];
  }
  return [];
}

function compareManifestEntry(actual, expected, label) {
  if (!actual || typeof actual !== 'object') fail(`manifest is missing ${label}`);
  for (const key of ['lockPath', 'installPath', 'file', 'url', 'integrity']) {
    if (actual[key] !== expected[key]) {
      fail(`manifest ${label}.${key} is stale: expected ${expected[key]}, received ${actual[key]}`);
    }
  }
}

function verifyComponentManifest(manifest, definition, buffers) {
  const actual = manifest[definition.component];
  if (!actual || typeof actual !== 'object') fail(`manifest has no ${definition.component} definition`);
  const expected = definition.createManifestEntry(buffers);
  if (actual.version !== expected.version) {
    fail(
      `manifest ${definition.component}.version is stale: expected ${expected.version}, ` +
        `received ${actual.version}`
    );
  }
  const actualEntries = manifestEntriesFor(definition.component, actual);
  const expectedEntries = manifestEntriesFor(definition.component, expected);
  expectedEntries.forEach((entry, index) => {
    compareManifestEntry(actualEntries[index], entry, `${definition.component} package ${index + 1}`);
  });

  if (definition.component === 'tsx') {
    if (actual.esbuildRange !== expected.esbuildRange) fail('manifest tsx.esbuildRange is stale');
    if (actual.executable !== expected.executable) fail('manifest tsx.executable is stale');
  } else if (definition.component === 'prettier') {
    if (actual.executable !== expected.executable) fail('manifest prettier.executable is stale');
  } else if (definition.component === 'esbuild') {
    if (actual.launcher !== expected.launcher) fail('manifest esbuild.launcher is stale');
    const actualPlatform = actual.platforms?.['linux-x64'];
    const expectedPlatform = expected.platforms['linux-x64'];
    if (actualPlatform?.executable !== expectedPlatform.executable) {
      fail('manifest esbuild platform executable is stale');
    }
    if (actualPlatform?.binarySha256 !== expectedPlatform.binarySha256) {
      fail('manifest esbuild binarySha256 is stale');
    }
  } else if (definition.component === 'typescript') {
    if (actual.launcher !== expected.launcher) fail('manifest typescript.launcher is stale');
    if (actual.platforms?.['linux-x64']?.executable !== 'lib/tsc') {
      fail('manifest TypeScript platform executable is stale');
    }
  } else if (definition.component === 'oxlint') {
    if (actual.launcher !== expected.launcher) fail('manifest oxlint.launcher is stale');
    if (actual.platforms?.['linux-x64']?.runtime !== 'gnu') {
      fail('manifest oxlint Linux platform runtime is stale');
    }
    if (actual.typeAware?.version !== expected.typeAware.version) {
      fail('manifest oxlint.typeAware.version is stale');
    }
    if (actual.typeAware?.launcher !== expected.typeAware.launcher) {
      fail('manifest oxlint.typeAware.launcher is stale');
    }
    if (actual.typeAware?.environmentVariable !== expected.typeAware.environmentVariable) {
      fail('manifest oxlint.typeAware.environmentVariable is stale');
    }
  }
}

function expectedWorkspaceManifest(manifest, definition) {
  const workspace = structuredClone(manifest.workspace ?? {});
  workspace.platform = { ...LINUX_X64_GLIBC };
  workspace.lockfileSha256 = definition.lockfileSha256;
  workspace.profiles = { ...(workspace.profiles ?? {}) };
  workspace.profiles[definition.profile] = definition.createManifestEntry();
  return workspace;
}

function verifyProfileManifest(manifest, definition) {
  const workspace = manifest.workspace;
  if (!workspace || typeof workspace !== 'object') fail('manifest has no workspace definition');
  if (JSON.stringify(workspace.platform) !== JSON.stringify(LINUX_X64_GLIBC)) {
    fail('manifest workspace platform must be Linux x64 glibc only');
  }
  if (workspace.lockfileSha256 !== definition.lockfileSha256) {
    fail('manifest workspace lockfileSha256 is stale; run --sync-plan');
  }
  const actual = workspace.profiles?.[definition.profile];
  if (!actual || typeof actual !== 'object') {
    fail(`manifest has no workspace profile ${definition.profile}`);
  }
  const expected = definition.createManifestEntry();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`manifest workspace profile ${definition.profile} is stale; run --sync-plan`);
  }
}

function staleArchives(root, definition) {
  const directory = path.join(root, 'vendor', 'offline', definition.directory);
  if (!fs.existsSync(directory)) return [];
  const keep = new Set(definition.targets.map(target => target.fileName));
  return fs
    .readdirSync(directory)
    .filter(name => name.endsWith('.tgz') && !keep.has(name))
    .map(name => path.join(directory, name));
}

function staleProfileArchives(root, definition) {
  const directory = path.join(root, 'vendor', 'offline', definition.directory);
  if (!fs.existsSync(directory)) return [];
  const keep = new Set(
    definition.targets
      .filter(target => target.file.startsWith(`vendor/offline/${definition.directory}/`))
      .map(target => path.basename(target.file))
  );
  return fs
    .readdirSync(directory)
    .filter(name => name.endsWith('.tgz') && !keep.has(name))
    .map(name => path.join(directory, name));
}

function readAndVerifyArchives(root, definition) {
  const buffers = new Map();
  for (const target of definition.targets) {
    const archivePath = path.join(root, target.file);
    if (!fs.existsSync(archivePath)) {
      fail(`missing archive: ${target.file}\ndownload: ${target.url}`);
    }
    const buffer = fs.readFileSync(archivePath);
    verifyArchive(buffer, target);
    buffers.set(target.lockPath, buffer);
  }
  return buffers;
}

function checkComponent(root, manifest, definition) {
  const buffers = readAndVerifyArchives(root, definition);
  verifyComponentManifest(manifest, definition, buffers);
  console.log(`[offline-npm-vendor] OK: ${definition.component} ${definition.version}`);
}

function checkProfile(root, manifest, definition) {
  verifyProfileManifest(manifest, definition);
  readAndVerifyArchives(root, definition);
  console.log(
    `[offline-npm-vendor] OK: workspace ${definition.profile} (${definition.targets.length} packages)`
  );
}

function writeManifestAtomically(manifestPath, manifest) {
  const temporary = `${manifestPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.renameSync(temporary, manifestPath);
}

function removeSupersededArchives(root, definition) {
  for (const archivePath of staleArchives(root, definition)) fs.rmSync(archivePath, { force: true });
}

function removeSupersededProfileArchives(root, definition) {
  for (const archivePath of staleProfileArchives(root, definition)) {
    fs.rmSync(archivePath, { force: true });
  }
}

async function acquireArchive(root, target, { adoptExisting }) {
  const archivePath = path.join(root, target.file);
  if (fs.existsSync(archivePath)) {
    const buffer = fs.readFileSync(archivePath);
    try {
      verifyArchive(buffer, target);
      console.log(`[offline-npm-vendor] adopting ${target.file}`);
      return buffer;
    } catch (error) {
      if (adoptExisting) throw error;
      console.log(`[offline-npm-vendor] replacing invalid ${target.file}`);
    }
  }
  if (adoptExisting) {
    fail(`manual archive is missing: ${target.file}\ndownload: ${target.url}`);
  }
  console.log(`[offline-npm-vendor] downloading ${target.packageName}@${target.version}`);
  const buffer = await download(target.url);
  verifyArchive(buffer, target);
  persistVerifiedArchive(root, target, buffer);
  return buffer;
}

async function refresh(root, manifestPath, manifest, definitions, { adoptExisting }) {
  const offlineRoot = path.join(root, 'vendor', 'offline');
  fs.mkdirSync(offlineRoot, { recursive: true });
  const staging = fs.mkdtempSync(path.join(offlineRoot, '.npm-vendor-refresh-'));
  const nextManifest = structuredClone(manifest);
  const componentBuffers = new Map();
  try {
    for (const definition of definitions) {
      const buffers = new Map();
      for (const target of definition.targets) {
        const buffer = await acquireArchive(root, target, { adoptExisting });
        buffers.set(target.lockPath, buffer);
        const stagedPath = path.join(staging, definition.directory, target.fileName);
        fs.mkdirSync(path.dirname(stagedPath), { recursive: true });
        fs.writeFileSync(stagedPath, buffer);
      }
      componentBuffers.set(definition.component, buffers);
      nextManifest[definition.component] = definition.createManifestEntry(buffers);
    }
    verifyTsxEsbuildCompatibility(nextManifest);
    for (const definition of definitions) {
      verifyComponentManifest(nextManifest, definition, componentBuffers.get(definition.component));
    }

    for (const definition of definitions) {
      for (const target of definition.targets) {
        const targetPath = path.join(root, target.file);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(path.join(staging, definition.directory, target.fileName), targetPath);
      }
    }
    writeManifestAtomically(manifestPath, nextManifest);
    for (const definition of definitions) removeSupersededArchives(root, definition);
    for (const definition of definitions) checkComponent(root, nextManifest, definition);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function syncProfilePlans(manifestPath, manifest, definitions) {
  const nextManifest = structuredClone(manifest);
  for (const definition of definitions) {
    nextManifest.workspace = expectedWorkspaceManifest(nextManifest, definition);
    verifyProfileManifest(nextManifest, definition);
  }
  writeManifestAtomically(manifestPath, nextManifest);
  for (const definition of definitions) {
    console.log(
      `[offline-npm-vendor] planned workspace ${definition.profile} (${definition.targets.length} packages)`
    );
  }
}

async function refreshProfiles(root, manifestPath, manifest, definitions, { adoptExisting }) {
  const offlineRoot = path.join(root, 'vendor', 'offline');
  fs.mkdirSync(offlineRoot, { recursive: true });
  const staging = fs.mkdtempSync(path.join(offlineRoot, '.workspace-vendor-refresh-'));
  const nextManifest = structuredClone(manifest);
  try {
    for (const definition of definitions) {
      for (const target of definition.targets) {
        const buffer = await acquireArchive(root, target, { adoptExisting });
        const stagedPath = path.join(staging, target.file);
        fs.mkdirSync(path.dirname(stagedPath), { recursive: true });
        fs.writeFileSync(stagedPath, buffer);
      }
      nextManifest.workspace = expectedWorkspaceManifest(nextManifest, definition);
      verifyProfileManifest(nextManifest, definition);
    }

    for (const definition of definitions) {
      for (const target of definition.targets) {
        const targetPath = path.join(root, target.file);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.copyFileSync(path.join(staging, target.file), targetPath);
      }
    }
    writeManifestAtomically(manifestPath, nextManifest);
    for (const definition of definitions) removeSupersededProfileArchives(root, definition);
    for (const definition of definitions) checkProfile(root, nextManifest, definition);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const selectedComponents = [];
  const selectedProfiles = [];
  let mode = 'refresh';
  let root = process.cwd();
  let missingOnly = false;
  const setMode = next => {
    if (mode !== 'refresh' && mode !== next) fail('choose only one mode');
    mode = next;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--all') {
      selectedComponents.push(...SUPPORTED_COMPONENTS);
      selectedProfiles.push(...STANDARD_PACKAGE_PROFILES);
    } else if (argument === '--component') {
      const component = argv[++index];
      if (!component) fail('--component requires a value');
      selectedComponents.push(component);
    } else if (argument.startsWith('--component=')) {
      selectedComponents.push(argument.slice('--component='.length));
    } else if (argument === '--profile') {
      const profile = argv[++index];
      if (!profile) fail('--profile requires a value');
      selectedProfiles.push(profile);
    } else if (argument.startsWith('--profile=')) {
      selectedProfiles.push(argument.slice('--profile='.length));
    } else if (argument === '--check') {
      setMode('check');
    } else if (argument === '--check-plan') {
      setMode('check-plan');
    } else if (argument === '--sync-plan') {
      setMode('sync-plan');
    } else if (argument === '--adopt-existing') {
      setMode('adopt');
    } else if (argument === '--print-downloads') {
      setMode('downloads');
    } else if (argument === '--missing-only') {
      missingOnly = true;
    } else if (argument === '--root') {
      const value = argv[++index];
      if (!value) fail('--root requires a value');
      root = path.resolve(value);
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  if (selectedComponents.length === 0 && selectedProfiles.length === 0) {
    fail('select --all, at least one --component, or at least one --profile');
  }
  const components = [...new Set(selectedComponents)];
  for (const component of components) {
    if (!COMPONENT_SET.has(component)) {
      fail(`unsupported component ${component}; choose ${SUPPORTED_COMPONENTS.join(', ')}`);
    }
  }
  const profiles = [...new Set(selectedProfiles)];
  for (const profile of profiles) {
    if (!PROFILE_SET.has(profile)) {
      fail(`unsupported profile ${profile}; choose ${SUPPORTED_PROFILES.join(', ')}`);
    }
  }
  if ((mode === 'check-plan' || mode === 'sync-plan') && components.length > 0) {
    fail(`${mode} supports workspace profiles only`);
  }
  if (missingOnly && mode !== 'downloads') fail('--missing-only requires --print-downloads');
  return { components, profiles, mode, root, missingOnly };
}

function archiveIsCurrent(root, target) {
  const archivePath = path.join(root, target.file);
  if (!fs.existsSync(archivePath)) return false;
  try {
    verifyArchive(fs.readFileSync(archivePath), target);
    return true;
  } catch {
    return false;
  }
}

function printDownloads(root, definitions, { missingOnly }) {
  for (const definition of definitions) {
    const label = definition.component
      ? `${definition.component} ${definition.version}`
      : `workspace ${definition.profile} (${definition.targets.length} packages)`;
    console.log(`[offline-npm-vendor] ${label}`);
    for (const target of definition.targets) {
      if (missingOnly && archiveIsCurrent(root, target)) continue;
      console.log(`${target.url} -> ${target.file}`);
    }
  }
}

async function main() {
  const { components, profiles, mode, root, missingOnly } = parseArguments(process.argv.slice(2));
  const manifestPath = path.join(root, 'vendor', 'offline', 'manifest.json');
  const lockPath = path.join(root, 'package-lock.json');
  const manifest = readJson(manifestPath);
  const lockBuffer = fs.readFileSync(lockPath);
  const lock = JSON.parse(lockBuffer.toString('utf8'));
  const lockfileSha256 = sha256Hex(lockBuffer);
  const componentDefinitions = components.map(component => buildComponent(lock, component));
  const profileDefinitions = profiles.map(profile => buildProfile(lock, profile, lockfileSha256));
  const allDefinitions = [...componentDefinitions, ...profileDefinitions];

  if (mode === 'downloads') {
    printDownloads(root, allDefinitions, { missingOnly });
    return;
  }
  if (mode === 'check-plan') {
    for (const definition of profileDefinitions) verifyProfileManifest(manifest, definition);
    for (const definition of profileDefinitions) {
      console.log(
        `[offline-npm-vendor] OK: workspace plan ${definition.profile} (${definition.targets.length} packages)`
      );
    }
    return;
  }
  if (mode === 'sync-plan') {
    syncProfilePlans(manifestPath, manifest, profileDefinitions);
    return;
  }
  if (mode === 'check') {
    verifyTsxEsbuildCompatibility(manifest);
    for (const definition of componentDefinitions) checkComponent(root, manifest, definition);
    for (const definition of profileDefinitions) checkProfile(root, manifest, definition);
    return;
  }
  if (componentDefinitions.length > 0) {
    await refresh(root, manifestPath, manifest, componentDefinitions, {
      adoptExisting: mode === 'adopt',
    });
  }
  if (profileDefinitions.length > 0) {
    const currentManifest = readJson(manifestPath);
    await refreshProfiles(root, manifestPath, currentManifest, profileDefinitions, {
      adoptExisting: mode === 'adopt',
    });
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
