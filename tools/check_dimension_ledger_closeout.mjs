import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { resolveTestIsolationNoneArgument } from './wp_test_runner_command.mjs';

const label = 'check:dimension-ledger-closeout';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
const gitCommand = process.platform === 'win32' ? 'git.exe' : 'git';
const npmArgs = (...args) => (process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd', ...args] : args);
const testIsolationArgument = resolveTestIsolationNoneArgument();
const nodeTestArgs = file => [...(testIsolationArgument ? [testIsolationArgument] : []), '--test', file];
const finalEvidenceContracts = Object.freeze([
  Object.freeze({
    path: 'tests/helpers/dimension_reviewed_ownership_contract_helper.mjs',
    sha256: '8c545995212543857ac73ae6fc353c666eafde2d47e9189938980622303f0a0f',
  }),
  Object.freeze({
    path: 'tests/wave_d_interior_storage_reviewed_ownership_contract.test.js',
    sha256: 'ff3d0bdd689ee341e68f258695d21bf42e8907b5b26fed72a2b287e994f33036',
  }),
  Object.freeze({
    path: 'tests/wave_e_drawer_sketch_reviewed_ownership_contract.test.js',
    sha256: '5c13c9d79041ad8e007fdda4d985c9f142fe4aa5d40ab1fb8fae1dc6c20831a7',
  }),
]);

const requiredFiles = Object.freeze([
  'package.json',
  'tools/wp_layer_baseline.json',
  'tools/wp_dimension_migration_retirement_inventory.json',
  'docs/DIMENSION_MIGRATION_RETIREMENT_INVENTORY.md',
  'tools/wp_wardrobe_dimension_public_surface_decision_report.json',
  'docs/WARDROBE_DIMENSION_PUBLIC_SURFACE_DECISION_REPORT.md',
  'tests/dimension_migration_final_closeout_contract.test.js',
  'tests/dimension_migration_retirement_inventory_contract.test.js',
  'tests/wardrobe_dimension_public_surface_decision_report_contract.test.js',
  ...finalEvidenceContracts.map(contract => contract.path),
]);

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`[${label}] missing required file: ${relativePath}`);
  }
}

for (const evidence of finalEvidenceContracts) {
  const actual = createHash('sha256')
    .update(fs.readFileSync(path.join(root, evidence.path)))
    .digest('hex');
  if (actual !== evidence.sha256) {
    throw new Error(
      `[${label}] final evidence changed after review: ${evidence.path} (${actual} != ${evidence.sha256})`
    );
  }
}

const steps = Object.freeze([
  {
    name: 'Layer contract',
    command: npmCommand,
    args: npmArgs('run', 'contract:layers'),
    timeoutMs: 180_000,
  },
  {
    name: 'Layer proposal',
    command: npmCommand,
    args: npmArgs('run', 'contract:layers:propose'),
    timeoutMs: 180_000,
  },
  {
    name: 'Final migration closeout contract',
    command: process.execPath,
    args: nodeTestArgs('tests/dimension_migration_final_closeout_contract.test.js'),
    timeoutMs: 60_000,
  },
  {
    name: 'Retirement inventory contract',
    command: process.execPath,
    args: nodeTestArgs('tests/dimension_migration_retirement_inventory_contract.test.js'),
    timeoutMs: 60_000,
  },
  {
    name: 'Public surface decision contract',
    command: process.execPath,
    args: nodeTestArgs('tests/wardrobe_dimension_public_surface_decision_report_contract.test.js'),
    timeoutMs: 60_000,
  },
  {
    name: 'Generated reports',
    command: npmCommand,
    args: npmArgs('run', 'check:generated-reports'),
    timeoutMs: 180_000,
  },
  {
    name: 'Git whitespace check',
    command: gitCommand,
    args: ['diff', '--check'],
    timeoutMs: 60_000,
  },
]);

function readGitStatus() {
  const result = spawnSync(gitCommand, ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `[${label}] git status unavailable: ${result.error?.message ?? result.stderr ?? result.status}`
    );
  }
  return result.stdout;
}

const initialGitStatus = readGitStatus();

for (const step of steps) {
  console.log(`\n[${label}] ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    timeout: step.timeoutMs,
    killSignal: 'SIGKILL',
  });
  if (result.error || result.status !== 0) {
    const reason =
      result.error?.code === 'ETIMEDOUT'
        ? `timeout after ${step.timeoutMs}ms`
        : (result.error?.message ?? `exit ${result.status ?? result.signal ?? 'unknown'}`);
    throw new Error(`[${label}] FAILED: ${step.name} (${reason})`);
  }
}

const finalGitStatus = readGitStatus();
if (finalGitStatus !== initialGitStatus) {
  throw new Error(`[${label}] preflight changed the working tree`);
}

console.log(`\n[${label}] OK`);
