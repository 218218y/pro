#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runTypecheckModesInParallel } from './wp_typecheck_parallel.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function resolveTypecheckModesForFiles(files) {
  let project = false;
  let uiLean = false;

  for (const rawFile of files) {
    const file = String(rawFile).replace(/\\/gu, '/');

    if (file === 'tsconfig.json') {
      project = true;
      uiLean = true;
      continue;
    }
    if (file === 'tsconfig.ui-lean.json' || file.startsWith('lean_types/')) {
      uiLean = true;
      continue;
    }
    if (file.startsWith('types/')) {
      project = true;
      uiLean = true;
      continue;
    }
    if (/^esm\/native\/ui\/.*\.ts$/u.test(file)) {
      project = true;
      uiLean = true;
      continue;
    }
    if (/^(?:esm\/.*\.(?:ts|tsx|mjs|js)|wp_logo_data\.js|tsconfig(?:\.[^/]+)?\.json)$/u.test(file)) {
      project = true;
    }
  }

  return [project ? 'project' : null, uiLean ? 'ui-lean' : null].filter(Boolean);
}

function git(args) {
  const result = spawnSync(process.platform === 'win32' ? 'git.exe' : 'git', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout.split('\0').filter(Boolean);
}

function listChangedFiles(base) {
  if (base) return git(['diff', '--name-only', '-z', '--diff-filter=ACMR', `${base}...HEAD`, '--']);
  return [
    ...git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR', '--']),
    ...git(['diff', '--name-only', '-z', '--diff-filter=ACMR', '--']),
    ...git(['ls-files', '--others', '--exclude-standard', '-z']),
  ];
}

function parseArgs(argv) {
  let base = null;
  let workers = null;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--base') base = argv[++index] || null;
    else if (arg === '--workers') workers = argv[++index] || null;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { base, workers };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const files = [...new Set(listChangedFiles(args.base))];
    const modes = resolveTypecheckModesForFiles(files);
    if (!modes.length) {
      console.log('[WP Typecheck Changed] No changed TypeScript surfaces require checking.');
      return;
    }
    console.log(`[WP Typecheck Changed] ${files.length} changed files select: ${modes.join(', ')}`);
    const result = await runTypecheckModesInParallel({ modes, workers: args.workers });
    if (!result.ok) process.exitCode = result.exitCode;
  } catch (error) {
    console.error(`[WP Typecheck Changed] ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
