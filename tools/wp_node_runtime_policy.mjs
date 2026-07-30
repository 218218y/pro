#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PRIMARY_NODE_VERSION_FILE = '.node-version';
const COMPATIBILITY_NODE_VERSION_FILE = '.node-version-compat';
const WORKFLOW_DIRECTORY = '.github/workflows';

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

export function parsePinnedNodeVersion(rawVersion, versionFile = PRIMARY_NODE_VERSION_FILE) {
  const value = String(rawVersion ?? '').trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`${versionFile} must contain an exact Node version (for example 24.0.0).`);
  }
  return {
    version: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareNodeVersions(left, right) {
  for (const key of ['major', 'minor', 'patch']) {
    if (left[key] !== right[key]) return left[key] - right[key];
  }
  return 0;
}

function createSupportedRuntimeLine({ version, major, minor, patch }, versionFile, minimumVersion) {
  return Object.freeze({
    version,
    major,
    minor,
    patch,
    versionFile,
    minimumVersion,
  });
}

export function readNodeRuntimePolicy(root = ROOT) {
  const primary = parsePinnedNodeVersion(
    fs.readFileSync(path.join(root, PRIMARY_NODE_VERSION_FILE), 'utf8'),
    PRIMARY_NODE_VERSION_FILE
  );
  const compatibility = parsePinnedNodeVersion(
    fs.readFileSync(path.join(root, COMPATIBILITY_NODE_VERSION_FILE), 'utf8'),
    COMPATIBILITY_NODE_VERSION_FILE
  );

  if (compatibility.major >= primary.major) {
    throw new Error(
      `${COMPATIBILITY_NODE_VERSION_FILE} major must be lower than ${PRIMARY_NODE_VERSION_FILE} major.`
    );
  }

  const supportedLines = Object.freeze([
    createSupportedRuntimeLine(compatibility, COMPATIBILITY_NODE_VERSION_FILE, compatibility.version),
    createSupportedRuntimeLine(primary, PRIMARY_NODE_VERSION_FILE, `${primary.major}.0.0`),
  ]);
  const engineRange = supportedLines.map(line => `>=${line.minimumVersion} <${line.major + 1}`).join(' || ');

  return {
    ...primary,
    versionFile: PRIMARY_NODE_VERSION_FILE,
    compatibilityVersion: compatibility.version,
    compatibilityMajor: compatibility.major,
    compatibilityVersionFile: COMPATIBILITY_NODE_VERSION_FILE,
    supportedMajors: Object.freeze(supportedLines.map(line => line.major)),
    supportedLines,
    typeBaselineMajor: Math.min(...supportedLines.map(line => line.major)),
    engineRange,
  };
}

export function isSupportedNodeVersion(rawVersion, policy = readNodeRuntimePolicy()) {
  let version;
  try {
    version = parsePinnedNodeVersion(rawVersion, 'Node runtime version');
  } catch {
    return false;
  }

  const line = policy.supportedLines.find(candidate => candidate.major === version.major);
  if (!line) return false;
  const minimum = parsePinnedNodeVersion(line.minimumVersion, `${line.versionFile} minimum`);
  return compareNodeVersions(version, minimum) >= 0;
}

function pushMismatch(violations, label, actual, expected) {
  if (actual === expected) return;
  violations.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function collectWorkflowViolations(root, policy) {
  const violations = [];
  const workflowRoot = path.join(root, WORKFLOW_DIRECTORY);
  if (!fs.existsSync(workflowRoot)) {
    violations.push(`${WORKFLOW_DIRECTORY} is missing.`);
    return violations;
  }

  const allowedVersionFiles = [policy.versionFile, policy.compatibilityVersionFile];
  const allowedVersionFilePattern = allowedVersionFiles.map(escapeRegExp).join('|');
  const workflowFiles = fs
    .readdirSync(workflowRoot)
    .filter(name => /\.ya?ml$/u.test(name))
    .sort();

  for (const fileName of workflowFiles) {
    const relativePath = `${WORKFLOW_DIRECTORY}/${fileName}`;
    const source = fs.readFileSync(path.join(workflowRoot, fileName), 'utf8');
    const setupNodeCount = (source.match(/uses:\s*actions\/setup-node@/gu) ?? []).length;
    const versionFileCount = (
      source.match(new RegExp(`node-version-file:\\s*['"]?(?:${allowedVersionFilePattern})['"]?`, 'gu')) ?? []
    ).length;
    const directVersionCount = (source.match(/^\s*node-version:\s*/gmu) ?? []).length;

    if (setupNodeCount !== versionFileCount) {
      violations.push(
        `${relativePath}: every actions/setup-node step must use ${allowedVersionFiles.join(' or ')} (${setupNodeCount} setup step(s), ${versionFileCount} approved version-file reference(s)).`
      );
    }
    if (directVersionCount > 0) {
      violations.push(
        `${relativePath}: direct node-version literals are forbidden; use an approved Node version file.`
      );
    }
  }

  return violations;
}

export function collectNodeRuntimePolicyViolations({ root = ROOT, currentNodeVersion } = {}) {
  const violations = [];
  let policy;
  try {
    policy = readNodeRuntimePolicy(root);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const pkg = readJson(root, 'package.json');
  const lock = readJson(root, 'package-lock.json');
  const lockRoot = lock.packages?.[''] ?? {};
  const effectiveNodeVersion = String(currentNodeVersion ?? process.versions.node);

  if (!isSupportedNodeVersion(effectiveNodeVersion, policy)) {
    violations.push(
      `current Node runtime ${JSON.stringify(effectiveNodeVersion)} is outside supported range ${JSON.stringify(policy.engineRange)}.`
    );
  }

  pushMismatch(violations, 'package.json engines.node', pkg.engines?.node, policy.engineRange);
  pushMismatch(violations, 'package.json devEngines.runtime.name', pkg.devEngines?.runtime?.name, 'node');
  pushMismatch(
    violations,
    'package.json devEngines.runtime.version',
    pkg.devEngines?.runtime?.version,
    policy.engineRange
  );
  pushMismatch(
    violations,
    'package.json devEngines.runtime.onFail',
    pkg.devEngines?.runtime?.onFail,
    'error'
  );
  pushMismatch(violations, 'package-lock.json root engines.node', lockRoot.engines?.node, policy.engineRange);

  const packageTypesVersion = pkg.devDependencies?.['@types/node'] ?? null;
  const lockRootTypesVersion = lockRoot.devDependencies?.['@types/node'] ?? null;
  const lockInstalledTypesVersion = lock.packages?.['node_modules/@types/node']?.version ?? null;
  for (const [label, version] of [
    ['package.json @types/node', packageTypesVersion],
    ['package-lock root @types/node', lockRootTypesVersion],
    ['package-lock installed @types/node', lockInstalledTypesVersion],
  ]) {
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(String(version ?? ''))) {
      violations.push(`${label} must be exact-pinned; received ${JSON.stringify(version)}.`);
      continue;
    }
    const typesMajor = Number.parseInt(String(version).split('.')[0] ?? '', 10);
    if (typesMajor !== policy.typeBaselineMajor) {
      violations.push(
        `${label} major ${typesMajor} does not match the lowest supported Node major ${policy.typeBaselineMajor}.`
      );
    }
  }
  if (packageTypesVersion !== lockRootTypesVersion || packageTypesVersion !== lockInstalledTypesVersion) {
    violations.push(
      `@types/node versions must match across package.json and package-lock (${packageTypesVersion}, ${lockRootTypesVersion}, ${lockInstalledTypesVersion}).`
    );
  }

  violations.push(...collectWorkflowViolations(root, policy));
  return violations;
}

async function main() {
  const policy = readNodeRuntimePolicy();
  const violations = collectNodeRuntimePolicyViolations();
  if (violations.length) {
    console.error('[Node runtime policy] Failed:');
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[Node runtime policy] OK: primary=${policy.version}, compatibility=${policy.compatibilityVersion}, engines=${policy.engineRange}, @types/node baseline=${policy.typeBaselineMajor}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
