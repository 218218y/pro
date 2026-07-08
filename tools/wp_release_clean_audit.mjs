#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_RELEASE_DIRS = ['dist/release'];

const FORBIDDEN_DIR_NAMES = new Set([
  '.artifacts',
  '.nyc_output',
  '.playwright',
  '__tests__',
  'coverage',
  'e2e',
  'node_modules',
  'playwright-report',
  'test',
  'test-results',
  'tests',
]);

const FORBIDDEN_FILE_PATTERNS = [
  { re: /(?:^|[._-])(?:spec|test)\.(?:[cm]?js|jsx|tsx?|mjs)$/i, reason: 'test source file' },
  { re: /^playwright\.config\.(?:[cm]?js|tsx?)$/i, reason: 'Playwright config' },
  { re: /^tsconfig(?:\.[\w-]+)?\.json$/i, reason: 'TypeScript config' },
  { re: /^package(?:-lock)?\.json$/i, reason: 'package manager metadata' },
];

const TEXT_FILE_RE = /\.(?:css|html|js|json|mjs|txt|map)$/i;

const FORBIDDEN_TEXT_NEEDLES = [
  { needle: '@playwright/test', reason: 'Playwright dependency reference' },
  { needle: 'node:test', reason: 'Node test-runner reference' },
  { needle: 'tests/e2e/', reason: 'E2E helper path reference' },
  { needle: 'tests\\e2e\\', reason: 'E2E helper path reference' },
  { needle: '__WP_TEST_', reason: 'test-only browser hook' },
];

const FORBIDDEN_OBSERVABILITY_TEXT_NEEDLES = [
  { needle: 'scheduler_debug_stats_reason_store', reason: 'scheduler debug stats reason-store module' },
  { needle: 'scheduler_debug_stats_recorders', reason: 'scheduler debug stats recorders module' },
  { needle: 'scheduler_debug_stats_budget', reason: 'scheduler debug stats budget module' },
  { needle: 'executeDurationSamplesMs', reason: 'build execution duration sample field' },
  {
    needle: 'executeImmediateDurationSamplesMs',
    reason: 'build execution immediate duration sample field',
  },
  {
    needle: 'executeDebouncedDurationSamplesMs',
    reason: 'build execution debounced duration sample field',
  },
  { needle: 'executeForceDurationSamplesMs', reason: 'build execution force duration sample field' },
  {
    needle: 'executeNonForceDurationSamplesMs',
    reason: 'build execution non-force duration sample field',
  },
  { needle: 'executeDurationAvgMs', reason: 'build execution duration average field' },
  { needle: 'executeDurationP95Ms', reason: 'build execution duration p95 field' },
  { needle: 'forceRequestCount', reason: 'scheduler debug request counter field' },
  { needle: 'Build execution duration', reason: 'browser perf build-duration report text' },
  {
    needle: 'Slow build reasons by execution duration',
    reason: 'browser perf slow-build report text',
  },
  { needle: 'recordBuildExecuteDuration', reason: 'build execution duration recorder' },
];

function normalizeSlash(value) {
  return String(value || '')
    .split(path.sep)
    .join('/');
}

function resolveUnderRoot(root, relOrAbs) {
  const rootAbs = path.resolve(root);
  const abs = path.isAbsolute(relOrAbs)
    ? path.resolve(relOrAbs)
    : path.resolve(rootAbs, String(relOrAbs || ''));
  const rel = path.relative(rootAbs, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`[release-clean-audit] Unsafe release dir outside repo root: ${relOrAbs}`);
  }
  return abs;
}

function createIssue(type, dirAbs, fileAbs, reason) {
  return {
    type,
    reason,
    dir: normalizeSlash(dirAbs),
    path: normalizeSlash(path.relative(dirAbs, fileAbs || dirAbs) || '.'),
  };
}

function checkFileName(fileName) {
  for (const pattern of FORBIDDEN_FILE_PATTERNS) {
    if (pattern.re.test(fileName)) return pattern.reason;
  }
  return '';
}

function checkTextFile(fileAbs, { observability = false } = {}) {
  if (!TEXT_FILE_RE.test(fileAbs)) return [];
  let text = '';
  try {
    text = fs.readFileSync(fileAbs, 'utf8');
  } catch {
    return [];
  }
  const needles = observability
    ? [...FORBIDDEN_TEXT_NEEDLES, ...FORBIDDEN_OBSERVABILITY_TEXT_NEEDLES]
    : FORBIDDEN_TEXT_NEEDLES;
  return needles
    .filter(({ needle }) => text.includes(needle))
    .map(({ reason, needle }) => `${reason}: ${needle}`);
}

function collectDirIssues(dirAbs, options = {}) {
  const issues = [];
  const stack = [dirAbs];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      issues.push(createIssue('read-error', dirAbs, current, err?.message || String(err)));
      continue;
    }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const lowerName = entry.name.toLowerCase();

      if (entry.isDirectory()) {
        if (FORBIDDEN_DIR_NAMES.has(lowerName)) {
          issues.push(createIssue('forbidden-dir', dirAbs, abs, `forbidden directory: ${entry.name}`));
          continue;
        }
        stack.push(abs);
        continue;
      }

      if (!entry.isFile()) continue;

      const fileNameReason = checkFileName(entry.name);
      if (fileNameReason) {
        issues.push(createIssue('forbidden-file', dirAbs, abs, fileNameReason));
      }

      for (const textReason of checkTextFile(abs, options)) {
        issues.push(createIssue('forbidden-text', dirAbs, abs, textReason));
      }
    }
  }

  return issues;
}

function normalizeDirList(dirs, fallback = DEFAULT_RELEASE_DIRS) {
  const required = [];
  const optional = [];
  const input = Array.isArray(dirs) && dirs.length ? dirs : fallback;
  for (const dir of input) {
    const raw = String(dir || '').trim();
    if (!raw) continue;
    if (raw.startsWith('?')) {
      const next = raw.slice(1).trim();
      if (next) optional.push(next);
      continue;
    }
    required.push(raw);
  }
  return { required, optional };
}

export function collectReleaseCleanIssues({
  root = process.cwd(),
  dirs = DEFAULT_RELEASE_DIRS,
  optionalDirs = [],
  observability = false,
} = {}) {
  const rootAbs = path.resolve(root);
  const releaseDirs = normalizeDirList(dirs);
  const optionalReleaseDirs = normalizeDirList(optionalDirs, []).required.concat(releaseDirs.optional);
  const issues = [];

  for (const dir of releaseDirs.required) {
    const dirAbs = resolveUnderRoot(rootAbs, dir);
    if (!fs.existsSync(dirAbs)) {
      issues.push(createIssue('missing-dir', dirAbs, dirAbs, 'release directory is missing'));
      continue;
    }
    issues.push(...collectDirIssues(dirAbs, { observability }));
  }

  for (const dir of optionalReleaseDirs) {
    const dirAbs = resolveUnderRoot(rootAbs, dir);
    if (!fs.existsSync(dirAbs)) continue;
    issues.push(...collectDirIssues(dirAbs, { observability }));
  }

  return issues;
}

export function parseReleaseCleanAuditArgs(argv = []) {
  const dirs = [];
  const optionalDirs = [];
  let observability = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === '--dir' || arg === '--dirs') && argv[i + 1]) {
      const raw = String(argv[++i] || '');
      for (const item of raw.split(',')) {
        const trimmed = item.trim();
        if (trimmed) dirs.push(trimmed);
      }
      continue;
    }
    if ((arg === '--optional-dir' || arg === '--optional-dirs') && argv[i + 1]) {
      const raw = String(argv[++i] || '');
      for (const item of raw.split(',')) {
        const trimmed = item.trim();
        if (trimmed) optionalDirs.push(trimmed);
      }
      continue;
    }
    if (arg.startsWith('--dir=')) {
      const raw = arg.slice('--dir='.length);
      for (const item of raw.split(',')) {
        const trimmed = item.trim();
        if (trimmed) dirs.push(trimmed);
      }
      continue;
    }
    if (arg.startsWith('--dirs=')) {
      const raw = arg.slice('--dirs='.length);
      for (const item of raw.split(',')) {
        const trimmed = item.trim();
        if (trimmed) dirs.push(trimmed);
      }
      continue;
    }
    if (arg.startsWith('--optional-dir=')) {
      const raw = arg.slice('--optional-dir='.length);
      for (const item of raw.split(',')) {
        const trimmed = item.trim();
        if (trimmed) optionalDirs.push(trimmed);
      }
      continue;
    }
    if (arg.startsWith('--optional-dirs=')) {
      const raw = arg.slice('--optional-dirs='.length);
      for (const item of raw.split(',')) {
        const trimmed = item.trim();
        if (trimmed) optionalDirs.push(trimmed);
      }
      continue;
    }
    if (arg === '--observability') observability = true;
  }
  return { dirs: dirs.length ? dirs : DEFAULT_RELEASE_DIRS, optionalDirs, observability };
}

export function formatReleaseCleanIssues(issues) {
  if (!issues.length) return '[release-clean-audit] ok';
  const lines = [`[release-clean-audit] FAILED with ${issues.length} issue(s)`];
  for (const issue of issues) {
    lines.push(`- ${issue.type}: ${issue.path} (${issue.reason})`);
  }
  return lines.join('\n');
}

function main() {
  const args = parseReleaseCleanAuditArgs(process.argv.slice(2));
  const issues = collectReleaseCleanIssues({
    dirs: args.dirs,
    optionalDirs: args.optionalDirs,
    observability: args.observability,
  });
  const message = formatReleaseCleanIssues(issues);
  if (issues.length) {
    console.error(message);
    process.exit(1);
  }
  console.log(message);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
