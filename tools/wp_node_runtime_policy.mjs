#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PRIMARY_NODE_VERSION_FILE = '.node-version';
const WORKFLOW_DIRECTORY = '.github/workflows';
const NODE_TYPES_MINIMUM_VERSION = '24.19.2';

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

export function readNodeRuntimePolicy(root = ROOT) {
  const primary = parsePinnedNodeVersion(
    fs.readFileSync(path.join(root, PRIMARY_NODE_VERSION_FILE), 'utf8'),
    PRIMARY_NODE_VERSION_FILE
  );
  if (primary.major !== 24) {
    throw new Error(`${PRIMARY_NODE_VERSION_FILE} must pin the supported Node 24 runtime.`);
  }

  return {
    ...primary,
    versionFile: PRIMARY_NODE_VERSION_FILE,
    typeDeclarationMinimumVersion: NODE_TYPES_MINIMUM_VERSION,
    typeDeclarationMaximumExclusiveVersion: `${primary.major + 1}.0.0`,
    typeDeclarationRange: `^${NODE_TYPES_MINIMUM_VERSION}`,
    engineRange: `>=${primary.version} <${primary.major + 1}`,
  };
}

export function isSupportedNodeVersion(rawVersion, policy = readNodeRuntimePolicy()) {
  let version;
  try {
    version = parsePinnedNodeVersion(rawVersion, 'Node runtime version');
  } catch {
    return false;
  }

  return version.major === policy.major && compareNodeVersions(version, policy) >= 0;
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

  const versionFilePattern = escapeRegExp(policy.versionFile);
  const workflowFiles = fs
    .readdirSync(workflowRoot)
    .filter(name => /\.ya?ml$/u.test(name))
    .sort();

  for (const fileName of workflowFiles) {
    const relativePath = `${WORKFLOW_DIRECTORY}/${fileName}`;
    const source = fs.readFileSync(path.join(workflowRoot, fileName), 'utf8');
    const setupNodeCount = (source.match(/uses:\s*actions\/setup-node@/gu) ?? []).length;
    const versionFileCount = (
      source.match(
        new RegExp(`^\\s*node-version-file:\\s*['"]?${versionFilePattern}['"]?\\s*(?:#.*)?$`, 'gmu')
      ) ?? []
    ).length;
    const directVersionCount = (source.match(/^\s*node-version:\s*/gmu) ?? []).length;

    if (setupNodeCount !== versionFileCount) {
      violations.push(
        `${relativePath}: every actions/setup-node step must use ${policy.versionFile} (${setupNodeCount} setup step(s), ${versionFileCount} approved version-file reference(s)).`
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

  const packageTypesRange = pkg.devDependencies?.['@types/node'] ?? null;
  const lockRootTypesRange = lockRoot.devDependencies?.['@types/node'] ?? null;
  const lockInstalledTypesVersion = lock.packages?.['node_modules/@types/node']?.version ?? null;

  const minimumTypes = parsePinnedNodeVersion(policy.typeDeclarationMinimumVersion, '@types/node minimum');
  const manifestTypesMatch = /^\^(\d+\.\d+\.\d+)$/u.exec(packageTypesRange ?? '');
  const manifestTypes = manifestTypesMatch ? parsePinnedNodeVersion(manifestTypesMatch[1]) : null;
  const manifestTypesApproved =
    manifestTypes?.major === policy.major && compareNodeVersions(manifestTypes, minimumTypes) >= 0;
  if (!manifestTypesApproved) {
    violations.push(
      `package.json @types/node range must be a caret range within >=${minimumTypes.version} <${policy.typeDeclarationMaximumExclusiveVersion}; received ${JSON.stringify(packageTypesRange)}.`
    );
  }
  pushMismatch(violations, 'package-lock root @types/node range', lockRootTypesRange, packageTypesRange);

  let installedTypes = null;
  try {
    installedTypes = parsePinnedNodeVersion(lockInstalledTypesVersion, 'package-lock installed @types/node');
  } catch (error) {
    violations.push(error instanceof Error ? error.message : String(error));
  }
  if (installedTypes) {
    if (installedTypes.major !== policy.major) {
      violations.push(
        `package-lock installed @types/node major ${installedTypes.major} does not match supported Node major ${policy.major}.`
      );
    } else if (compareNodeVersions(installedTypes, minimumTypes) < 0) {
      violations.push(
        `package-lock installed @types/node ${installedTypes.version} is below supported minimum ${minimumTypes.version}.`
      );
    } else if (manifestTypesApproved && compareNodeVersions(installedTypes, manifestTypes) < 0) {
      violations.push(
        `package-lock installed @types/node ${installedTypes.version} is below manifest minimum ${manifestTypes.version}.`
      );
    }
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
    `[Node runtime policy] OK: Node=${policy.version}, engines=${policy.engineRange}, @types/node range=${policy.typeDeclarationRange}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
