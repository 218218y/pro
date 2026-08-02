#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'vendor', 'offline', 'manifest.json');
const AST_DIR = path.join(ROOT, 'vendor', 'offline', 'ast');
const CHECK_ONLY = process.argv.includes('--check');
const ADOPT_EXISTING = process.argv.includes('--adopt-existing');
if (CHECK_ONLY && ADOPT_EXISTING) fail('use either --check or --adopt-existing, not both');
const EXPECTED_LOCK_PATHS = Object.freeze([
  'node_modules/oxc-parser',
  'node_modules/@oxc-project/types',
  'node_modules/@oxc-parser/binding-linux-x64-gnu',
]);

function fail(message) {
  throw new Error(`[offline-oxc-vendor] ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseBoundedRange(range) {
  const match = /^>=(\d+\.\d+\.\d+) <(\d+\.\d+\.\d+)$/u.exec(range);
  if (!match) fail(`unsupported compatibility range: ${range}`);
  return { min: match[1], maxExclusive: match[2] };
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number);
  const rightParts = right.split('.').map(Number);
  if (leftParts.length !== 3 || rightParts.length !== 3) fail('versions must use x.y.z');
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function rangeAccepts(version, range) {
  const bounds = parseBoundedRange(range);
  return compareVersions(version, bounds.min) >= 0 && compareVersions(version, bounds.maxExclusive) < 0;
}

function sha512Integrity(buffer) {
  return `sha512-${crypto.createHash('sha512').update(buffer).digest('base64')}`;
}

function readTarPackageJson(buffer) {
  const uncompressed = zlib.gunzipSync(buffer);
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
    if (fullName === 'package/package.json') {
      return JSON.parse(uncompressed.subarray(contentStart, contentEnd).toString('utf8'));
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  fail('archive does not contain package/package.json');
}

function targetFromLock(packages, lockPath) {
  const entry = packages[lockPath];
  if (!entry) fail(`${lockPath} is missing from package-lock.json`);
  if (!/^\d+\.\d+\.\d+$/u.test(entry.version ?? '')) fail(`${lockPath} has an invalid version`);
  if (!/^https:\/\/registry\.npmjs\.org\//u.test(entry.resolved ?? '')) {
    fail(`${lockPath} does not use the official npm registry`);
  }
  if (!/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(entry.integrity ?? '')) {
    fail(`${lockPath} has no valid SHA-512 integrity`);
  }
  const fileName = new URL(entry.resolved).pathname.split('/').at(-1);
  if (!fileName?.endsWith('.tgz')) fail(`${lockPath} has an invalid tarball URL`);
  const packageName = lockPath.slice('node_modules/'.length);
  return {
    lockPath,
    installPath: lockPath,
    packageName,
    version: entry.version,
    url: entry.resolved,
    integrity: entry.integrity,
    fileName,
    file: `vendor/offline/ast/${fileName}`,
  };
}

function buildTargets(lock) {
  const targets = EXPECTED_LOCK_PATHS.map(lockPath => targetFromLock(lock.packages, lockPath));
  const versions = new Set(targets.map(target => target.version));
  if (versions.size !== 1) fail(`Oxc package versions are not aligned: ${[...versions].join(', ')}`);
  return { version: targets[0].version, targets };
}

function download(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/octet-stream',
          'User-Agent': 'wardrobe-offline-oxc-vendor-refresh/1',
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
  if (buffer.length < 2 || buffer[0] !== 0x1f || buffer[1] !== 0x8b) {
    fail(`${target.fileName} is not a gzip archive`);
  }
  const actualIntegrity = sha512Integrity(buffer);
  if (actualIntegrity !== target.integrity) {
    fail(`${target.fileName} integrity mismatch\nexpected ${target.integrity}\nactual   ${actualIntegrity}`);
  }
  const packageJson = readTarPackageJson(buffer);
  if (packageJson.name !== target.packageName || packageJson.version !== target.version) {
    fail(
      `${target.fileName} package metadata mismatch: expected ${target.packageName}@${target.version}, ` +
        `received ${packageJson.name}@${packageJson.version}`
    );
  }
}

function findManifestEntry(ast, lockPath) {
  const entries = [...(ast.packages ?? []), ...Object.values(ast.bindings ?? {})];
  return entries.find(entry => entry.lockPath === lockPath);
}

function checkCurrentBundle(manifest, lock) {
  const ast = manifest.ast;
  if (!ast || typeof ast !== 'object') fail('manifest has no ast definition');
  const activeVersion = lock.packages['node_modules/oxc-parser']?.version;
  if (!activeVersion) fail('package-lock.json has no active oxc-parser');
  if (!rangeAccepts(activeVersion, ast.compatibleProjectRange)) {
    fail(`active oxc-parser ${activeVersion} is outside ${ast.compatibleProjectRange}`);
  }
  if (!rangeAccepts(ast.version, ast.compatibleProjectRange)) {
    fail(`offline Oxc ${ast.version} is outside ${ast.compatibleProjectRange}`);
  }

  for (const lockPath of EXPECTED_LOCK_PATHS) {
    const entry = findManifestEntry(ast, lockPath);
    if (!entry) fail(`manifest is missing ${lockPath}`);
    if (!entry.file || !entry.url || !entry.integrity) fail(`manifest entry is incomplete: ${lockPath}`);
    const archivePath = path.join(ROOT, entry.file);
    if (!fs.existsSync(archivePath)) fail(`missing archive: ${entry.file}`);
    verifyArchive(fs.readFileSync(archivePath), {
      ...entry,
      packageName: lockPath.slice('node_modules/'.length),
      version: ast.version,
      fileName: path.basename(entry.file),
    });
  }

  console.log(
    `[offline-oxc-vendor] OK: offline ${ast.version}; active ${activeVersion}; range ${ast.compatibleProjectRange}`
  );
}

function updateManifest(manifest, version, targets) {
  const byLockPath = new Map(targets.map(target => [target.lockPath, target]));
  const parser = byLockPath.get('node_modules/oxc-parser');
  const types = byLockPath.get('node_modules/@oxc-project/types');
  const binding = byLockPath.get('node_modules/@oxc-parser/binding-linux-x64-gnu');
  const toManifestEntry = target => ({
    lockPath: target.lockPath,
    installPath: target.installPath,
    file: target.file,
    url: target.url,
    integrity: target.integrity,
  });

  manifest.ast = {
    ...manifest.ast,
    version,
    packages: [toManifestEntry(parser), toManifestEntry(types)],
    bindings: {
      'linux-x64': toManifestEntry(binding),
    },
  };
  return manifest;
}

function removeSupersededArchives(keepNames) {
  const patterns = [
    /^oxc-parser-\d+\.\d+\.\d+\.tgz$/u,
    /^types-\d+\.\d+\.\d+\.tgz$/u,
    /^binding-linux-x64-gnu-\d+\.\d+\.\d+\.tgz$/u,
  ];
  for (const name of fs.readdirSync(AST_DIR)) {
    if (keepNames.has(name) || !patterns.some(pattern => pattern.test(name))) continue;
    fs.rmSync(path.join(AST_DIR, name), { force: true });
  }
}

async function refresh(manifest, lock, { adoptExisting = false } = {}) {
  const { version, targets } = buildTargets(lock);
  if (!rangeAccepts(version, manifest.ast.compatibleProjectRange)) {
    fail(`active oxc-parser ${version} is outside ${manifest.ast.compatibleProjectRange}`);
  }

  fs.mkdirSync(AST_DIR, { recursive: true });
  const staging = fs.mkdtempSync(path.join(AST_DIR, '.oxc-refresh-'));
  try {
    for (const target of targets) {
      let buffer;
      if (adoptExisting) {
        const existingPath = path.join(AST_DIR, target.fileName);
        if (!fs.existsSync(existingPath)) fail(`manual archive is missing: ${target.file}`);
        console.log(`[offline-oxc-vendor] adopting ${target.file}`);
        buffer = fs.readFileSync(existingPath);
      } else {
        console.log(`[offline-oxc-vendor] downloading ${target.packageName}@${target.version}`);
        buffer = await download(target.url);
      }
      verifyArchive(buffer, target);
      fs.writeFileSync(path.join(staging, target.fileName), buffer);
    }

    for (const target of targets) {
      fs.copyFileSync(path.join(staging, target.fileName), path.join(AST_DIR, target.fileName));
    }
    const nextManifest = updateManifest(structuredClone(manifest), version, targets);
    const temporaryManifest = `${MANIFEST_PATH}.tmp-${process.pid}`;
    fs.writeFileSync(temporaryManifest, `${JSON.stringify(nextManifest, null, 2)}\n`);
    fs.copyFileSync(temporaryManifest, MANIFEST_PATH);
    fs.rmSync(temporaryManifest, { force: true });
    removeSupersededArchives(new Set(targets.map(target => target.fileName)));
    checkCurrentBundle(nextManifest, lock);
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

async function main() {
  const manifest = readJson(MANIFEST_PATH);
  const lock = readJson(path.join(ROOT, 'package-lock.json'));
  if (CHECK_ONLY) {
    checkCurrentBundle(manifest, lock);
    return;
  }
  await refresh(manifest, lock, { adoptExisting: ADOPT_EXISTING });
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
