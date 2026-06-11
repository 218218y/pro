import path from 'node:path';
import { listTestFiles } from './wp_test_shared.js';

export function parseTestArgs(argv) {
  const forceTsx = argv.includes('--tsx');
  const noBuild = argv.includes('--no-build');
  const patternIndex = argv.findIndex(arg => arg === '--pattern');
  const pattern = patternIndex >= 0 ? String(argv[patternIndex + 1] || '') : '';
  return { forceTsx, noBuild, pattern };
}

export function matchesPattern(filePath, pattern) {
  if (!pattern) return true;
  return String(filePath).toLowerCase().includes(String(pattern).toLowerCase());
}

export function selectRunnableTests({ projectRoot, pattern }) {
  const allFiles = listTestFiles(projectRoot).filter(filePath => matchesPattern(filePath, pattern));
  const e2eSegment = `${path.sep}tests${path.sep}e2e${path.sep}`;
  const files = allFiles.filter(filePath => !filePath.includes(e2eSegment));
  return {
    allFiles,
    files,
    skippedE2E: allFiles.length - files.length,
  };
}

export function createTestRunFlags({ forceTsx, noBuild }) {
  const flags = [];
  if (forceTsx) flags.push('forced tsx');
  if (noBuild) flags.push('no-build');
  return flags;
}

export function createNoTestsMessage({ skippedE2E }) {
  if (skippedE2E) {
    return (
      '[WardrobePro] No runnable unit tests matched (Playwright E2E specs are skipped here).\n' +
      'Run `npm run e2e:smoke` (or `npm run e2e:smoke:headed`) to execute E2E tests.'
    );
  }
  return '[WardrobePro] No tests found.';
}

export function createRunBanner({ files, flags }) {
  return (
    '[WardrobePro] Running ' +
    files.length +
    ' test(s)' +
    (flags.length ? ` (${flags.join(', ')})` : '') +
    '...'
  );
}

export function createSkippedE2ENotice(skippedE2E) {
  if (!skippedE2E) return '';
  return (
    `[WardrobePro] Note: skipped ${skippedE2E} Playwright E2E spec(s) under tests/e2e. ` +
    'Use `npm run e2e:smoke` to run them.'
  );
}
