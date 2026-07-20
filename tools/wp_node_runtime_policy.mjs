#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const NODE_VERSION_FILE = '.node-version';
const WORKFLOW_DIRECTORY = '.github/workflows';

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

export function parsePinnedNodeVersion(rawVersion) {
  const value = String(rawVersion ?? '').trim();
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new Error(`${NODE_VERSION_FILE} must contain an exact Node version (for example 24.0.0).`);
  }
  return {
    version: value,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function readNodeRuntimePolicy(root = ROOT) {
  const pinned = parsePinnedNodeVersion(fs.readFileSync(path.join(root, NODE_VERSION_FILE), 'utf8'));
  return {
    ...pinned,
    versionFile: NODE_VERSION_FILE,
    engineRange: `>=${pinned.major} <${pinned.major + 1}`,
  };
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
        new RegExp(`node-version-file:\\s*['\"]?${escapeRegExp(policy.versionFile)}['\"]?`, 'gu')
      ) ?? []
    ).length;
    const directVersionCount = (source.match(/^\s*node-version:\s*/gmu) ?? []).length;

    if (setupNodeCount !== versionFileCount) {
      violations.push(
        `${relativePath}: every actions/setup-node step must use node-version-file: '${policy.versionFile}' (${setupNodeCount} setup step(s), ${versionFileCount} version-file reference(s)).`
      );
    }
    if (directVersionCount > 0) {
      violations.push(
        `${relativePath}: direct node-version literals are forbidden; use ${policy.versionFile}.`
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
  const currentMajor = Number.parseInt(effectiveNodeVersion.split('.')[0] ?? '', 10);

  if (currentMajor !== policy.major) {
    violations.push(
      `current Node runtime ${JSON.stringify(effectiveNodeVersion)} does not match ${policy.versionFile} major ${policy.major}.`
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
    if (typesMajor !== policy.major) {
      violations.push(`${label} major ${typesMajor} does not match the pinned Node major ${policy.major}.`);
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
    `[Node runtime policy] OK: pinned=${policy.version}, engines=${policy.engineRange}, @types/node major=${policy.major}`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
