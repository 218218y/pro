import path from 'node:path';
import { listTestFiles } from './wp_test_shared.js';

function readFlagValue(argv, name) {
  const inlinePrefix = `${name}=`;
  const inline = argv.find(arg => String(arg).startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);
  const index = argv.findIndex(arg => arg === name);
  if (index < 0) return '';
  return String(argv[index + 1] || '');
}

function parsePositiveIntFlag(argv, name) {
  const raw = readFlagValue(argv, name).trim();
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function parseShardValue(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;

  const match = value.match(/^(\d+)\/(\d+)$/u);
  if (!match) {
    throw new Error(`[WardrobePro] invalid --shard value: ${value}. Use N/M, for example 1/2.`);
  }

  const index = Number.parseInt(match[1], 10);
  const total = Number.parseInt(match[2], 10);
  if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total) {
    throw new Error(`[WardrobePro] invalid --shard value: ${value}. Use N/M with 1 <= N <= M.`);
  }

  return { index, total };
}

export function parseTestArgs(argv) {
  const forceTsx = argv.includes('--tsx');
  const noBuild = argv.includes('--no-build');
  const serial = argv.includes('--serial');
  const pattern = readFlagValue(argv, '--pattern');
  const batchSize = parsePositiveIntFlag(argv, '--batch-size');
  const jobs = parsePositiveIntFlag(argv, '--jobs');
  const shard = parseShardValue(readFlagValue(argv, '--shard'));
  return { forceTsx, noBuild, pattern, serial, batchSize, jobs, shard };
}

export function matchesPattern(filePath, pattern) {
  if (!pattern) return true;
  return String(filePath).toLowerCase().includes(String(pattern).toLowerCase());
}

export function selectShardFiles(files, shard) {
  if (!shard) return files.slice();
  return files.filter((_, index) => index % shard.total === shard.index - 1);
}

export function selectRunnableTests({ projectRoot, pattern, shard }) {
  const allFiles = listTestFiles(projectRoot).filter(filePath => matchesPattern(filePath, pattern));
  const e2eSegment = `${path.sep}tests${path.sep}e2e${path.sep}`;
  const runnableFiles = allFiles.filter(filePath => !filePath.includes(e2eSegment));
  const files = selectShardFiles(runnableFiles, shard);
  return {
    allFiles,
    runnableFiles,
    files,
    skippedE2E: allFiles.length - runnableFiles.length,
    totalRunnableFiles: runnableFiles.length,
  };
}

export function createTestRunFlags({ forceTsx, noBuild, serial, batchSize, jobs, shard }) {
  const flags = [];
  if (forceTsx) flags.push('forced tsx');
  if (noBuild) flags.push('no-build');
  if (serial) flags.push('serial');
  if (!serial && batchSize) flags.push(`batch-size ${batchSize}`);
  if (!serial && jobs) flags.push(`jobs ${jobs}`);
  if (shard) flags.push(`shard ${shard.index}/${shard.total}`);
  return flags;
}

export function createNoTestsMessage({ skippedE2E, shard, totalRunnableFiles }) {
  if (shard && totalRunnableFiles) {
    return `[WardrobePro] No runnable unit tests assigned to shard ${shard.index}/${shard.total}.`;
  }
  if (skippedE2E) {
    return (
      '[WardrobePro] No runnable unit tests matched (Playwright E2E specs are skipped here).\n' +
      'Run `npm run e2e:smoke` (or `npm run e2e:smoke:headed`) to execute E2E tests.'
    );
  }
  return '[WardrobePro] No tests found.';
}

export function createRunBanner({ files, flags, totalFiles }) {
  const count =
    Number.isInteger(totalFiles) && totalFiles > files.length
      ? `${files.length}/${totalFiles}`
      : files.length;
  return (
    '[WardrobePro] Running ' + count + ' test(s)' + (flags.length ? ` (${flags.join(', ')})` : '') + '...'
  );
}

export function createSkippedE2ENotice(skippedE2E) {
  if (!skippedE2E) return '';
  return (
    `[WardrobePro] Note: skipped ${skippedE2E} Playwright E2E spec(s) under tests/e2e. ` +
    'Use `npm run e2e:smoke` to run them.'
  );
}
