#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { DEFAULT_ALL_MODES } from './wp_typecheck_state.js';
import { runTypecheckModesInParallel } from './wp_typecheck_parallel.mjs';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const LAYER_MODES = Object.freeze({
  boot: ['boot', 'strict-boot'],
  builder: ['builder'],
  data: ['data'],
  io: ['io'],
  kernel: ['kernel', 'strict-kernel'],
  platform: ['platform', 'strict-platform'],
  runtime: ['runtime', 'strict-runtime'],
  services: ['services', 'strict-services'],
  ui: ['ui', 'strict-ui'],
});

export function resolveTypecheckModesForFiles(files) {
  const modes = new Set();
  for (const rawFile of files) {
    const file = String(rawFile).replace(/\\/gu, '/');
    if (/^(?:types\/|esm\/native\/shared\/|esm\/shared\/|tsconfig)/u.test(file)) {
      return [...DEFAULT_ALL_MODES];
    }
    if (/^esm\/entry_|^esm\/main\./u.test(file)) {
      modes.add('boot');
      modes.add('strict-boot');
      continue;
    }
    const adapterMatch = file.match(/^esm\/native\/adapters\/([^/]+)/u);
    if (adapterMatch?.[1] === 'browser') {
      modes.add('adapters-browser');
      modes.add('strict-adapters-browser');
      continue;
    }
    const layerMatch = file.match(/^esm\/native\/([^/]+)\//u);
    if (layerMatch && Object.hasOwn(LAYER_MODES, layerMatch[1])) {
      for (const mode of LAYER_MODES[layerMatch[1]]) modes.add(mode);
      continue;
    }
    if (/^esm\/.+\.(?:js|mjs|ts|tsx)$/u.test(file)) return [...DEFAULT_ALL_MODES];
  }
  return [...modes];
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
      console.log('[WP Typecheck Changed] No changed TypeScript source layers require checking.');
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
