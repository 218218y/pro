#!/usr/bin/env node
/**
 * WardrobePro - targeted Prettier runner.
 *
 * Runs Prettier only on files touched by the current Git worktree/index instead
 * of formatting the entire repository. The full `format:check` gate still stays
 * global in CI; this script is a fast local guardrail for day-to-day commits.
 *
 * Usage:
 *   node tools/wp_prettier_changed.mjs --write --changed
 *   node tools/wp_prettier_changed.mjs --check --changed
 *   node tools/wp_prettier_changed.mjs --write --staged
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PRETTIER_BIN = path.join(PROJECT_ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs');

function nodeCmd() {
  return process.execPath;
}

function gitCmd() {
  return process.platform === 'win32' ? 'git.exe' : 'git';
}

function printHelp() {
  console.log(`WardrobePro targeted Prettier runner

Usage:
  node tools/wp_prettier_changed.mjs --write --changed
  node tools/wp_prettier_changed.mjs --check --changed
  node tools/wp_prettier_changed.mjs --write --staged
  node tools/wp_prettier_changed.mjs --check --staged

Modes:
  --changed   Use staged, unstaged, and untracked Git files (default)
  --staged    Use only staged files; --write also re-adds formatted files
  --write     Format files
  --check     Check formatting without writing
`);
}

function parseArgs(argv) {
  const options = {
    mode: 'write',
    scope: 'changed',
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--write') {
      options.mode = 'write';
    } else if (arg === '--check') {
      options.mode = 'check';
    } else if (arg === '--changed') {
      options.scope = 'changed';
    } else if (arg === '--staged') {
      options.scope = 'staged';
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: options.encoding || 'utf8',
    shell: false,
    stdio: options.stdio || 'pipe',
    maxBuffer: 1024 * 1024 * 32,
  });
}

function fail(message, cause) {
  console.error(message);
  if (cause?.stderr) console.error(cause.stderr.trim());
  if (cause?.stdout) console.error(cause.stdout.trim());
  process.exit(cause?.status || 1);
}

function assertGitRepo() {
  const result = run(gitCmd(), ['rev-parse', '--show-toplevel']);
  if (result.status !== 0) {
    fail('[WP Prettier] Git repository not found. Run this command from the project repository.', result);
  }

  const gitRoot = path.resolve(result.stdout.trim());
  if (gitRoot !== PROJECT_ROOT) {
    fail(`[WP Prettier] Expected Git root to be ${PROJECT_ROOT}, got ${gitRoot}.`);
  }
}

function gitList(args) {
  const result = run(gitCmd(), args);
  if (result.status !== 0) {
    fail(`[WP Prettier] Git command failed: git ${args.join(' ')}`, result);
  }

  return result.stdout.split('\0').filter(Boolean);
}

function uniq(paths) {
  return [...new Set(paths)];
}

function listStagedFiles() {
  return gitList(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR', '--']);
}

function listUnstagedFiles() {
  return gitList(['diff', '--name-only', '-z', '--diff-filter=ACMR', '--']);
}

function listUntrackedFiles() {
  return gitList(['ls-files', '--others', '--exclude-standard', '-z']);
}

function listCandidateFiles(scope) {
  if (scope === 'staged') return listStagedFiles();
  return uniq([...listStagedFiles(), ...listUnstagedFiles(), ...listUntrackedFiles()]);
}

function existingFiles(files) {
  return files.filter(file => {
    const fullPath = path.join(PROJECT_ROOT, file);
    try {
      return fs.statSync(fullPath).isFile();
    } catch (_) {
      return false;
    }
  });
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function assertPrettierInstalled() {
  if (fs.existsSync(PRETTIER_BIN)) return;
  fail('[WP Prettier] Prettier is not installed. Run `npm ci` first.');
}

function assertNoPartiallyStagedFiles(files) {
  const unstaged = new Set(listUnstagedFiles());
  const partiallyStaged = files.filter(file => unstaged.has(file));
  if (partiallyStaged.length === 0) return;

  console.error('[WP Prettier] Refusing to auto-stage partially staged files.');
  console.error('Stage the whole file or run `npm run format:changed` before staging:');
  for (const file of partiallyStaged) console.error(`  - ${file}`);
  process.exit(1);
}

function runPrettier(files, mode) {
  const prettierMode = mode === 'check' ? '--check' : '--write';
  const commonArgs = [PRETTIER_BIN, prettierMode, '--ignore-unknown'];

  for (const group of chunk(files, 80)) {
    const result = run(nodeCmd(), [...commonArgs, ...group], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

function gitAdd(files) {
  for (const group of chunk(files, 80)) {
    const result = run(gitCmd(), ['add', '--', ...group], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(`[WP Prettier] ${error.message}`);
  }

  if (options.help) {
    printHelp();
    return;
  }

  assertGitRepo();
  assertPrettierInstalled();

  const files = existingFiles(listCandidateFiles(options.scope));
  if (files.length === 0) {
    console.log(`[WP Prettier] No ${options.scope} files to format.`);
    return;
  }

  if (options.scope === 'staged' && options.mode === 'write') {
    assertNoPartiallyStagedFiles(files);
  }

  const action = options.mode === 'check' ? 'Checking' : 'Formatting';
  console.log(`[WP Prettier] ${action} ${files.length} ${options.scope} file(s).`);
  runPrettier(files, options.mode);

  if (options.scope === 'staged' && options.mode === 'write') {
    gitAdd(files);
    console.log('[WP Prettier] Formatted staged files and added them back to the commit.');
  }
}

main();
