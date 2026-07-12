#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { DEFAULT_ALL_MODES, isKnownTypecheckMode } from './wp_typecheck_state.js';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveTypecheckWorkerCount({ requested, modeCount, cpuCount = os.availableParallelism() }) {
  const defaultWorkers = Math.min(4, Math.max(1, cpuCount));
  return Math.min(modeCount, parsePositiveInteger(requested, defaultWorkers));
}

export function parseTypecheckParallelArgs(argv) {
  let workers = null;
  let modes = null;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--workers') {
      workers = argv[++index] || null;
    } else if (arg === '--modes') {
      modes = (argv[++index] || '')
        .split(/[\s,]+/u)
        .map(value => value.trim())
        .filter(Boolean);
    } else if (arg === '--help' || arg === '-h') {
      return { help: true, workers, modes };
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { help: false, workers, modes };
}

function runMode({ root, mode, env, spawnImpl = spawn }) {
  return new Promise(resolve => {
    const child = spawnImpl(process.execPath, ['tools/wp_typecheck.js', '--mode', mode], {
      cwd: root,
      env,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', error => resolve({ mode, code: 1, error }));
    child.once('exit', code => resolve({ mode, code: typeof code === 'number' ? code : 1 }));
  });
}

export async function runTypecheckModesInParallel({
  root = PROJECT_ROOT,
  modes = DEFAULT_ALL_MODES,
  workers,
  env = process.env,
  spawnImpl = spawn,
  log = console.log,
  error = console.error,
} = {}) {
  const uniqueModes = [...new Set(modes)];
  const unknownModes = uniqueModes.filter(mode => !isKnownTypecheckMode(mode));
  if (unknownModes.length) {
    error(`[WP Typecheck Parallel] Unknown mode(s): ${unknownModes.join(', ')}`);
    return { ok: false, exitCode: 2, failedModes: unknownModes };
  }
  if (!uniqueModes.length) {
    log('[WP Typecheck Parallel] No modes selected.');
    return { ok: true, exitCode: 0, failedModes: [] };
  }

  const workerCount = resolveTypecheckWorkerCount({
    requested: workers ?? env.WP_TYPECHECK_WORKERS,
    modeCount: uniqueModes.length,
  });
  log(`[WP Typecheck Parallel] Running ${uniqueModes.length} modes with ${workerCount} workers.`);

  let cursor = 0;
  const results = [];
  async function worker() {
    while (cursor < uniqueModes.length) {
      const mode = uniqueModes[cursor++];
      results.push(await runMode({ root, mode, env, spawnImpl }));
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const failedModes = results.filter(result => result.code !== 0).map(result => result.mode);
  if (failedModes.length) {
    error(`[WP Typecheck Parallel] Failed modes: ${failedModes.join(', ')}`);
    return { ok: false, exitCode: 1, failedModes };
  }
  log(`[WP Typecheck Parallel] All ${uniqueModes.length} modes passed.`);
  return { ok: true, exitCode: 0, failedModes: [] };
}

async function main() {
  let args;
  try {
    args = parseTypecheckParallelArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[WP Typecheck Parallel] ${error.message}`);
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    console.log('Usage: node tools/wp_typecheck_parallel.mjs [--workers N] [--modes mode1,mode2]');
    return;
  }
  const result = await runTypecheckModesInParallel({
    modes: args.modes || DEFAULT_ALL_MODES,
    workers: args.workers,
  });
  if (!result.ok) process.exitCode = result.exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
