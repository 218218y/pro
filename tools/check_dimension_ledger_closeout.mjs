import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const label = 'check:dimension-ledger-closeout';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const gitCommand = process.platform === 'win32' ? 'git.exe' : 'git';

const requiredFiles = Object.freeze([
  'package.json',
  'tools/wp_layer_baseline.json',
  'tests/dimension_migration_final_closeout_contract.test.js',
  'tests/dimension_migration_retirement_inventory_contract.test.js',
  'tests/wardrobe_dimension_public_surface_decision_report_contract.test.js',
]);

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`[${label}] missing required file: ${relativePath}`);
  }
}

const steps = Object.freeze([
  {
    name: 'Layer contract',
    command: npmCommand,
    args: ['run', 'contract:layers'],
    timeoutMs: 180_000,
  },
  {
    name: 'Layer proposal',
    command: npmCommand,
    args: ['run', 'contract:layers:propose'],
    timeoutMs: 180_000,
  },
  {
    name: 'Generated reports',
    command: npmCommand,
    args: ['run', 'check:generated-reports'],
    retries: 1,
    timeoutMs: 180_000,
  },
  {
    name: 'Final migration closeout contract',
    command: process.execPath,
    args: ['--test-isolation=none', '--test', 'tests/dimension_migration_final_closeout_contract.test.js'],
    retries: 1,
    timeoutMs: 60_000,
  },
  {
    name: 'Retirement inventory contract',
    command: process.execPath,
    args: [
      '--test-isolation=none',
      '--test',
      'tests/dimension_migration_retirement_inventory_contract.test.js',
    ],
    retries: 1,
    timeoutMs: 60_000,
  },
  {
    name: 'Public surface decision contract',
    command: process.execPath,
    args: [
      '--test-isolation=none',
      '--test',
      'tests/wardrobe_dimension_public_surface_decision_report_contract.test.js',
    ],
    retries: 1,
    timeoutMs: 60_000,
  },
  {
    name: 'Git whitespace check',
    command: gitCommand,
    args: ['diff', '--check'],
    timeoutMs: 60_000,
  },
]);

for (const step of steps) {
  const attempts = (step.retries ?? 0) + 1;
  let passed = false;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const suffix = attempts > 1 ? ` (attempt ${attempt}/${attempts})` : '';
    console.log(`\n[${label}] ${step.name}${suffix}`);

    const result = spawnSync(step.command, step.args, {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      timeout: step.timeoutMs,
      killSignal: 'SIGKILL',
    });

    if (result.status === 0 && !result.error) {
      passed = true;
      break;
    }

    if (attempt < attempts) {
      const reason =
        result.error?.code === 'ETIMEDOUT'
          ? `timeout after ${step.timeoutMs}ms`
          : `exit ${result.status ?? result.signal ?? result.error?.message ?? 'unknown'}`;
      console.warn(`[${label}] RETRY after ${reason}: ${step.name}`);
      continue;
    }

    if (result.error) {
      throw new Error(`[${label}] ${step.name} could not complete: ${result.error.message}`);
    }
    process.exitCode = result.status ?? 1;
  }

  if (!passed) {
    console.error(`[${label}] FAILED: ${step.name}`);
    process.exit();
  }
}

console.log(`\n[${label}] OK`);
