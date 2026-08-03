#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const SUPPORTED_COMPONENTS = Object.freeze(['esbuild', 'tsx', 'prettier', 'typescript']);
const COMPONENT_SET = new Set(SUPPORTED_COMPONENTS);

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
    packageName: lockPath.slice('node_modules/'.length),
    version: lockEntry.version,
    url: lockEntry.resolved,
    integrity: lockEntry.integrity,
    fileName,
    file: `vendor/offline/${directory}/${fileName}`,
    lockEntry,
  };
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

  fail(`unsupported component: ${component}`);
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
  const packageJsonBuffer = parseTarEntries(buffer).get('package/package.json');
  if (!packageJsonBuffer) fail(`${target.fileName} has no package/package.json`);
  const packageJson = JSON.parse(packageJsonBuffer.toString('utf8'));
  if (packageJson.name !== target.packageName || packageJson.version !== target.version) {
    fail(
      `${target.fileName} package metadata mismatch: expected ${target.packageName}@${target.version}, ` +
        `received ${packageJson.name}@${packageJson.version}`
    );
  }
}

function manifestEntriesFor(component, entry) {
  if (component === 'tsx' || component === 'prettier') return [entry.package];
  if (component === 'esbuild' || component === 'typescript') {
    return [entry.package, entry.platforms?.['linux-x64']];
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

function writeManifestAtomically(manifestPath, manifest) {
  const temporary = `${manifestPath}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.renameSync(temporary, manifestPath);
}

function removeSupersededArchives(root, definition) {
  for (const archivePath of staleArchives(root, definition)) fs.rmSync(archivePath, { force: true });
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

function parseArguments(argv) {
  const selected = [];
  let mode = 'refresh';
  let root = process.cwd();
  const setMode = next => {
    if (mode !== 'refresh' && mode !== next) fail('choose only one mode');
    mode = next;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--all') {
      selected.push(...SUPPORTED_COMPONENTS);
    } else if (argument === '--component') {
      const component = argv[++index];
      if (!component) fail('--component requires a value');
      selected.push(component);
    } else if (argument.startsWith('--component=')) {
      selected.push(argument.slice('--component='.length));
    } else if (argument === '--check') {
      setMode('check');
    } else if (argument === '--adopt-existing') {
      setMode('adopt');
    } else if (argument === '--print-downloads') {
      setMode('downloads');
    } else if (argument === '--root') {
      const value = argv[++index];
      if (!value) fail('--root requires a value');
      root = path.resolve(value);
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  if (selected.length === 0) fail('select --all or at least one --component');
  const components = [...new Set(selected)];
  for (const component of components) {
    if (!COMPONENT_SET.has(component)) {
      fail(`unsupported component ${component}; choose ${SUPPORTED_COMPONENTS.join(', ')}`);
    }
  }
  return { components, mode, root };
}

async function main() {
  const { components, mode, root } = parseArguments(process.argv.slice(2));
  const manifestPath = path.join(root, 'vendor', 'offline', 'manifest.json');
  const lockPath = path.join(root, 'package-lock.json');
  const manifest = readJson(manifestPath);
  const lock = readJson(lockPath);
  const definitions = components.map(component => buildComponent(lock, component));

  if (mode === 'downloads') {
    for (const definition of definitions) {
      console.log(`[offline-npm-vendor] ${definition.component} ${definition.version}`);
      for (const target of definition.targets) console.log(`${target.url} -> ${target.file}`);
    }
    return;
  }
  if (mode === 'check') {
    verifyTsxEsbuildCompatibility(manifest);
    for (const definition of definitions) checkComponent(root, manifest, definition);
    return;
  }
  await refresh(root, manifestPath, manifest, definitions, { adoptExisting: mode === 'adopt' });
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
