#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

import {
  parseBoundedSemverRange,
  parseOxcManifestRange,
  resolveOxcLockGraph,
  versionSatisfiesBoundedRange,
  versionSatisfiesOxcPolicy,
} from './wp_oxc_version_policy.mjs';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'vendor', 'offline', 'manifest.json');
const AST_DIR = path.join(ROOT, 'vendor', 'offline', 'ast');
const CHECK_ONLY = process.argv.includes('--check');
const ADOPT_EXISTING = process.argv.includes('--adopt-existing');
const PRINT_DOWNLOADS = process.argv.includes('--print-downloads');
const selectedModes = [CHECK_ONLY, ADOPT_EXISTING, PRINT_DOWNLOADS].filter(Boolean).length;
if (selectedModes > 1) fail('use only one of --check, --adopt-existing, or --print-downloads');

function fail(message) {
  throw new Error(`[offline-oxc-vendor] ${message}`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  const packageName = lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
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
  const graph = resolveOxcLockGraph(lock);
  const targets = graph.lockPaths.map(lockPath => targetFromLock(lock.packages, lockPath));
  return { version: graph.version, targets, graph };
}

function activeOxcPolicy() {
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const manifestRange = pkg.devDependencies?.['oxc-parser'];
  const policy = parseOxcManifestRange(manifestRange);
  if (!policy) {
    fail(
      `package.json oxc-parser must use a single 0.x patch-line range such as ^0.144.0 ` +
        `or >=0.144.0 <0.145.0; found ${manifestRange ?? 'missing'}`
    );
  }
  return policy;
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
  const policy = activeOxcPolicy();
  const { version: activeVersion, targets: activeTargets } = buildTargets(lock);
  if (!versionSatisfiesOxcPolicy(activeVersion, policy)) {
    fail(`active oxc-parser ${activeVersion} is outside ${policy.boundedRange}`);
  }

  const compatibility = parseBoundedSemverRange(ast.compatibleProjectRange);
  if (!compatibility)
    fail(`invalid manifest Oxc compatibility range: ${ast.compatibleProjectRange ?? 'missing'}`);
  if (compatibility.maxExclusiveVersion !== policy.maxExclusiveVersion) {
    fail(
      `manifest Oxc compatibility upper bound ${compatibility.maxExclusiveVersion} is stale; ` +
        `package.json requires ${policy.maxExclusiveVersion}`
    );
  }
  if (!versionSatisfiesBoundedRange(activeVersion, compatibility)) {
    fail(`active oxc-parser ${activeVersion} is outside ${compatibility.boundedRange}`);
  }
  if (!versionSatisfiesBoundedRange(ast.version, compatibility)) {
    fail(`offline Oxc ${ast.version} is outside ${compatibility.boundedRange}`);
  }

  const entries = [...(ast.packages ?? []), ...Object.values(ast.bindings ?? {})];
  const expectedPackageNames = new Set([
    'oxc-parser',
    '@oxc-project/types',
    '@oxc-parser/binding-linux-x64-gnu',
  ]);
  const actualPackageNames = new Set();
  for (const entry of entries) {
    const lockPath = entry.lockPath;
    if (typeof lockPath !== 'string' || !lockPath.includes('node_modules/')) {
      fail(`manifest AST entry has an invalid lockPath: ${lockPath ?? 'missing'}`);
    }
    const packageName = lockPath.slice(lockPath.lastIndexOf('node_modules/') + 'node_modules/'.length);
    actualPackageNames.add(packageName);
    if (!entry.file || !entry.url || !entry.integrity) fail(`manifest entry is incomplete: ${lockPath}`);
    const archivePath = path.join(ROOT, entry.file);
    if (!fs.existsSync(archivePath)) fail(`missing archive: ${entry.file}`);
    verifyArchive(fs.readFileSync(archivePath), {
      ...entry,
      packageName,
      version: ast.version,
      fileName: path.basename(entry.file),
    });
  }
  for (const packageName of expectedPackageNames) {
    if (!actualPackageNames.has(packageName)) fail(`manifest is missing offline ${packageName}`);
  }
  if (actualPackageNames.size !== expectedPackageNames.size) {
    fail(`manifest AST package set is unexpected: ${[...actualPackageNames].join(', ')}`);
  }

  if (ast.version === activeVersion) {
    for (const target of activeTargets) {
      const entry = findManifestEntry(ast, target.lockPath);
      if (!entry) fail(`manifest exact Oxc bundle is missing ${target.lockPath}`);
      if (entry.url !== target.url || entry.integrity !== target.integrity) {
        fail(`manifest exact Oxc bundle does not match package-lock.json for ${target.lockPath}`);
      }
    }
  }

  console.log(
    `[offline-oxc-vendor] OK: offline ${ast.version}; active ${activeVersion}; range ${ast.compatibleProjectRange}`
  );
}

function updateManifest(manifest, version, targets, graph, policy) {
  const byLockPath = new Map(targets.map(target => [target.lockPath, target]));
  const parser = byLockPath.get(graph.parserPath);
  const types = byLockPath.get(graph.typesPath);
  const binding = byLockPath.get(graph.bindingPath);
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
    compatibleProjectRange: policy.boundedRange,
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
  const policy = activeOxcPolicy();
  const { version, targets, graph } = buildTargets(lock);
  if (!versionSatisfiesOxcPolicy(version, policy)) {
    fail(`active oxc-parser ${version} is outside package.json policy ${policy.boundedRange}`);
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
    const nextManifest = updateManifest(structuredClone(manifest), version, targets, graph, policy);
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
  if (PRINT_DOWNLOADS) {
    const policy = activeOxcPolicy();
    const { version, targets } = buildTargets(lock);
    if (!versionSatisfiesOxcPolicy(version, policy)) {
      fail(`active oxc-parser ${version} is outside package.json policy ${policy.boundedRange}`);
    }
    console.log(`[offline-oxc-vendor] Oxc ${version}`);
    for (const target of targets) console.log(`${target.url} -> ${target.file}`);
    return;
  }
  await refresh(manifest, lock, { adoptExisting: ADOPT_EXISTING });
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
