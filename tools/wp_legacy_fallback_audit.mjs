#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEGACY_FALLBACK_CATEGORIES = [
  'runtime-default',
  'domain-default',
  'error-message-default',
  'framework-default',
  'browser-adapter',
  'project-migration',
  'external-api-compat',
  'compat-boundary',
  'test-fixture',
  'legacy-runtime-risk',
  'unknown',
];

// Keep this intentionally broader than a simple word-boundary search. The old
// audit only saw standalone words such as `fallback` and missed camelCase /
// PascalCase identifiers like `fallbackReason`, `BootFatalFallbackOpts`,
// `buildCompatCorniceEnvelope`, and `coreBrowserCompat`. Those names are still
// compatibility/default vocabulary and must stay visible to the closeout guard.
const NEEDLE_RE =
  /\b(?:legacy|fallbacks?|compat)\b|\b[$A-Z_a-z][$\w]*(?:Legacy|legacy|Fallback|fallback|Compat)[$\w]*\b/g;
const EXTERNAL_API_COMPAT_RE =
  /(THREE|Three|three|React|browser|Browser|adapter|polyfill|vendor|rendererCompat|useLegacyLights|import-compatible|compatible seam)/;
const REVIEWED_COMPAT_BOUNDARY_TERM_RE =
  /(alias|bytes|canonical|cleanup|clear|compat|cornice|dispose|drift|envelope|frames|id|invalidate|lights|mirror|normalize|payload|persisted|profile|remove|schema|seam|stored|saved|surface)/i;
const REVIEWED_COMPAT_BOUNDARY_TEXT_RE =
  /\b(alias|bytes|canonical|cleanup|clear|compat|compatible|cornice|dispose|drift|envelope|frames|id|invalidate|lights|mirror|normalize|normalized|payload|persisted|profile|remove|schema|seam|stored|saved|surface)\b/i;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md']);
const DEFAULT_SOURCE_ROOT = 'esm';
const DEFAULT_JSON_OUT = 'docs/legacy_fallback_audit.json';
const DEFAULT_MD_OUT = 'docs/LEGACY_FALLBACK_AUDIT.md';
const DEFAULT_ALLOWLIST = 'tools/wp_legacy_fallback_allowlist.json';

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureParentDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

export function parseLegacyFallbackAuditArgs(argv = process.argv.slice(2)) {
  const args = {
    sourceRoot: DEFAULT_SOURCE_ROOT,
    jsonOutPath: null,
    mdOutPath: null,
    allowlistPath: DEFAULT_ALLOWLIST,
    writeAllowlist: false,
    check: false,
    failOnUnknown: true,
    print: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--source-root' && argv[index + 1]) args.sourceRoot = argv[++index];
    else if (arg === '--json-out' && argv[index + 1]) args.jsonOutPath = argv[++index];
    else if (arg === '--md-out' && argv[index + 1]) args.mdOutPath = argv[++index];
    else if (arg === '--allowlist' && argv[index + 1]) args.allowlistPath = argv[++index];
    else if (arg === '--write-allowlist') args.writeAllowlist = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--allow-unknown') args.failOnUnknown = false;
    else if (arg === '--no-print') args.print = false;
    else if (arg === '--default-outs') {
      args.jsonOutPath = DEFAULT_JSON_OUT;
      args.mdOutPath = DEFAULT_MD_OUT;
    }
  }

  return args;
}

export function walkAuditFiles(rootDir) {
  const files = [];
  if (!fs.existsSync(rootDir)) return files;
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) continue;
      files.push(full);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function isProjectMigrationPath(relPath, lineText) {
  return (
    /(^|\/)project_(io|config)(\/|_|\.)/.test(relPath) ||
    /(^|\/)(io|features\/project_config)(\/|$)/.test(relPath) ||
    /\b(migration|migrations|migrate|persisted|payload|canonicali[sz]e|canonical|normalizer|normalize)\b/i.test(
      relPath + ' ' + lineText
    )
  );
}

function isBrowserAdapterPath(relPath, lineText) {
  return (
    /(^|\/)adapters\/browser(\/|$)/.test(relPath) ||
    /(^|\/)entry_pro/.test(relPath) ||
    (/(^|\/)native\/(platform|ui)\//.test(relPath) &&
      /\b(browser|dom|document|window|raf|timer|clipboard|overlay|fatal overlay|localStorage)\b/i.test(
        lineText
      ))
  );
}

function isTestFixturePath(relPath, lineText) {
  return (
    /(^|\/)(test_|.*\.test\.|tests?\/|test_imports|test_no_side_effects)/.test(relPath) ||
    /\b(test fixture|fixture|mock|assert|policy violation)\b/i.test(lineText)
  );
}

function isRuntimeDefaultLine(lineText) {
  return /\bfallback\w*\b\s*(=|:|\?|\)|,|\|\||&&)|\bfallback\w*\b.*\breturn\b|\breturn\b.*\bfallback\w*\b|\bdefault(?:Value)?\b/i.test(
    lineText
  );
}

function isFrameworkDefaultLine(relPath, lineText) {
  return (
    /(^|\/)native\/ui\/react\/.*\.tsx?$/.test(relPath) &&
    /\bfallback\b\s*=|<Suspense\b|React\.Suspense/.test(lineText)
  );
}

function hasFallbackTerm(term) {
  return /fallback/i.test(String(term || ''));
}

function hasLegacyTerm(term) {
  return /legacy/i.test(String(term || ''));
}

function hasCompatTerm(term) {
  return /compat/i.test(String(term || ''));
}

function isErrorMessageDefaultLine(lineText) {
  return /(fallback\w*(Message|Reason|Error|Err)|\w+fallback\w*(Message|Reason|Error|Err)|(?:Message|Reason|Error|Err)\w*fallback\w*)/i.test(
    lineText
  );
}

function isDomainDefaultPath(relPath, lineText) {
  return (
    /(^|\/)(shared\/wardrobe_dimension_tokens_shared|native\/(builder|features|services|ui))/.test(relPath) &&
    /\b(fallback\w*|FALLBACK_[A-Z0-9_]+|buildFallback\w*)\b/.test(lineText)
  );
}

function isExternalApiCompatLine(relPath, lineText, term) {
  return (
    (hasCompatTerm(term) || hasLegacyTerm(term)) &&
    EXTERNAL_API_COMPAT_RE.test(`${term} ${relPath} ${lineText}`)
  );
}

function isCompatBoundaryLine(relPath, lineText, term) {
  const termText = String(term || '');
  const haystack = `${relPath} ${lineText}`;
  return (
    hasCompatTerm(termText) ||
    REVIEWED_COMPAT_BOUNDARY_TERM_RE.test(termText) ||
    (hasLegacyTerm(termText) && REVIEWED_COMPAT_BOUNDARY_TEXT_RE.test(haystack))
  );
}

export function classifyLegacyFallbackOccurrence({ relPath, lineText, term }) {
  const normalizedPath = normalizePath(relPath);
  const normalizedLine = String(lineText || '');
  if (isTestFixturePath(normalizedPath, normalizedLine)) return 'test-fixture';
  if (hasFallbackTerm(term) && isFrameworkDefaultLine(normalizedPath, normalizedLine)) {
    return 'framework-default';
  }
  if (isBrowserAdapterPath(normalizedPath, normalizedLine)) return 'browser-adapter';
  if (isProjectMigrationPath(normalizedPath, normalizedLine)) return 'project-migration';
  if (isExternalApiCompatLine(normalizedPath, normalizedLine, term)) return 'external-api-compat';
  if (isCompatBoundaryLine(normalizedPath, normalizedLine, term)) return 'compat-boundary';
  if (hasFallbackTerm(term) && isErrorMessageDefaultLine(normalizedLine)) return 'error-message-default';
  if (hasFallbackTerm(term) && isDomainDefaultPath(normalizedPath, normalizedLine)) return 'domain-default';
  if (hasFallbackTerm(term) && isRuntimeDefaultLine(normalizedLine)) return 'runtime-default';
  if (hasFallbackTerm(term)) return 'domain-default';
  if (hasLegacyTerm(term)) return 'legacy-runtime-risk';
  return 'unknown';
}

export function collectLegacyFallbackOccurrences({
  projectRoot = process.cwd(),
  sourceRoot = DEFAULT_SOURCE_ROOT,
} = {}) {
  const rootDir = path.resolve(projectRoot, sourceRoot);
  const occurrences = [];

  for (const file of walkAuditFiles(rootDir)) {
    const relPath = normalizePath(path.relative(projectRoot, file));
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const lineText = lines[lineIndex];
      NEEDLE_RE.lastIndex = 0;
      const seenTermsOnLine = new Set();
      for (const match of lineText.matchAll(NEEDLE_RE)) {
        const term = match[0];
        if (seenTermsOnLine.has(term)) continue;
        seenTermsOnLine.add(term);
        const category = classifyLegacyFallbackOccurrence({ relPath, lineText, term });
        occurrences.push({
          file: relPath,
          line: lineIndex + 1,
          term,
          category,
          text: lineText.trim(),
        });
      }
    }
  }

  return occurrences;
}

export function summarizeLegacyFallbackOccurrences(occurrences) {
  const byCategory = Object.fromEntries(LEGACY_FALLBACK_CATEGORIES.map(category => [category, 0]));
  const files = new Map();
  for (const occurrence of occurrences) {
    byCategory[occurrence.category] = (byCategory[occurrence.category] || 0) + 1;
    const file = files.get(occurrence.file) || { total: 0, categories: {} };
    file.total += 1;
    file.categories[occurrence.category] = (file.categories[occurrence.category] || 0) + 1;
    files.set(occurrence.file, file);
  }

  const byFile = Object.fromEntries(
    [...files.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([file, stats]) => [
        file,
        { total: stats.total, categories: Object.fromEntries(Object.entries(stats.categories).sort()) },
      ])
  );

  const hotFiles = Object.entries(byFile)
    .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
    .slice(0, 30)
    .map(([file, stats]) => ({ file, ...stats }));

  return {
    totalOccurrences: occurrences.length,
    totalFiles: Object.keys(byFile).length,
    byCategory,
    byFile,
    hotFiles,
  };
}

export function createLegacyFallbackAllowlist(summary) {
  return {
    version: 1,
    sourceRoot: DEFAULT_SOURCE_ROOT,
    policy:
      'Every existing legacy/fallback occurrence is categorized and count-locked by file. New or moved occurrences must be reviewed and the allowlist regenerated deliberately.',
    entries: summary.byFile,
  };
}

function normalizeAllowlistEntries(allowlist) {
  return allowlist && allowlist.entries && typeof allowlist.entries === 'object' ? allowlist.entries : {};
}

export function compareLegacyFallbackAllowlist(summary, allowlist) {
  const expected = normalizeAllowlistEntries(allowlist);
  const actual = summary.byFile;
  const failures = [];
  const files = new Set([...Object.keys(expected), ...Object.keys(actual)]);

  for (const file of [...files].sort()) {
    const expectedStats = expected[file];
    const actualStats = actual[file];
    if (!expectedStats) {
      failures.push({ kind: 'new-file', file, actual: actualStats });
      continue;
    }
    if (!actualStats) {
      failures.push({ kind: 'missing-file', file, expected: expectedStats });
      continue;
    }
    const categories = new Set([
      ...Object.keys(expectedStats.categories || {}),
      ...Object.keys(actualStats.categories || {}),
    ]);
    for (const category of [...categories].sort()) {
      const expectedCount = expectedStats.categories?.[category] || 0;
      const actualCount = actualStats.categories?.[category] || 0;
      if (expectedCount !== actualCount) {
        failures.push({
          kind: 'category-count',
          file,
          category,
          expected: expectedCount,
          actual: actualCount,
        });
      }
    }
  }

  return { ok: failures.length === 0, failures };
}

export function createLegacyFallbackPayload({ occurrences, summary, allowlistComparison = null }) {
  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: DEFAULT_SOURCE_ROOT,
    summary,
    allowlistComparison,
    occurrences,
  };
}

export function toLegacyFallbackMarkdown(payload) {
  const lines = [];
  const summary = payload.summary;
  lines.push('# Legacy / fallback audit');
  lines.push('');
  lines.push(`Generated at: ${payload.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Source root: \`${payload.sourceRoot}\``);
  lines.push(`- Total categorized occurrences: **${summary.totalOccurrences}**`);
  lines.push(`- Files with occurrences: **${summary.totalFiles}**`);
  lines.push('- Category counts:');
  for (const category of LEGACY_FALLBACK_CATEGORIES) {
    lines.push(`  - \`${category}\`: **${summary.byCategory[category] || 0}**`);
  }
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(
    '- Runtime compatibility must not grow silently. New `legacy`/`fallback`/`compat` mentions require an intentional category and allowlist update.'
  );
  lines.push('- The scanner includes camelCase and PascalCase identifiers, not only standalone words.');
  lines.push(
    '- `framework-default` is reserved for framework-owned API names such as React `Suspense` fallback props.'
  );
  lines.push('- `project-migration` belongs at import/load/persisted-payload boundaries.');
  lines.push('- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.');
  lines.push(
    '- `domain-default` and `error-message-default` are ordinary default-value names, kept visible so they do not hide runtime compatibility work.'
  );
  lines.push('- `external-api-compat` is reserved for third-party/framework compatibility seams.');
  lines.push(
    '- `compat-boundary` is a reviewed canonicalization or persisted-shape compatibility seam, not an unowned live fallback.'
  );
  lines.push('- `legacy-runtime-risk` is the review queue for possible old live-path compatibility.');
  lines.push('- `unknown` should stay at zero.');
  lines.push('');
  lines.push('## Hot files');
  lines.push('');
  if (!summary.hotFiles.length) {
    lines.push('- No occurrences found.');
  } else {
    for (const hot of summary.hotFiles) {
      const categoryText = Object.entries(hot.categories)
        .map(([category, count]) => `${category}: ${count}`)
        .join(', ');
      lines.push(`- \`${hot.file}\` - **${hot.total}** (${categoryText})`);
    }
  }
  lines.push('');
  lines.push('## Allowlist check');
  lines.push('');
  if (!payload.allowlistComparison) {
    lines.push('- Not run.');
  } else if (payload.allowlistComparison.ok) {
    lines.push('- Passed: current categorized inventory matches the allowlist.');
  } else {
    lines.push(`- Failed: **${payload.allowlistComparison.failures.length}** inventory drift item(s).`);
  }
  return `${lines.join('\n')}\n`;
}

export function runLegacyFallbackAudit({
  projectRoot = process.cwd(),
  args = parseLegacyFallbackAuditArgs(),
} = {}) {
  const sourceRoot = args.sourceRoot || DEFAULT_SOURCE_ROOT;
  const occurrences = collectLegacyFallbackOccurrences({ projectRoot, sourceRoot });
  const summary = summarizeLegacyFallbackOccurrences(occurrences);
  let allowlistComparison = null;

  const allowlistPath = path.resolve(projectRoot, args.allowlistPath || DEFAULT_ALLOWLIST);
  if (args.writeAllowlist) {
    ensureParentDir(allowlistPath);
    fs.writeFileSync(allowlistPath, `${JSON.stringify(createLegacyFallbackAllowlist(summary), null, 2)}\n`);
  }

  if (args.check) {
    if (!fs.existsSync(allowlistPath)) {
      throw new Error(`Legacy fallback allowlist missing: ${args.allowlistPath || DEFAULT_ALLOWLIST}`);
    }
    allowlistComparison = compareLegacyFallbackAllowlist(summary, readJson(allowlistPath));
  }

  const payload = createLegacyFallbackPayload({ occurrences, summary, allowlistComparison });

  const jsonOutPath = args.jsonOutPath && path.resolve(projectRoot, args.jsonOutPath);
  const mdOutPath = args.mdOutPath && path.resolve(projectRoot, args.mdOutPath);
  if (jsonOutPath) {
    ensureParentDir(jsonOutPath);
    fs.writeFileSync(jsonOutPath, `${JSON.stringify(payload, null, 2)}\n`);
  }
  if (mdOutPath) {
    ensureParentDir(mdOutPath);
    fs.writeFileSync(mdOutPath, toLegacyFallbackMarkdown(payload));
  }

  if (args.failOnUnknown && summary.byCategory.unknown > 0) {
    const err = new Error(`Legacy fallback audit found ${summary.byCategory.unknown} unknown occurrence(s).`);
    err.payload = payload;
    throw err;
  }
  if (allowlistComparison && !allowlistComparison.ok) {
    const err = new Error(
      `Legacy fallback inventory drift detected: ${allowlistComparison.failures.length} item(s).`
    );
    err.payload = payload;
    throw err;
  }

  return payload;
}

async function main() {
  const args = parseLegacyFallbackAuditArgs();
  try {
    const payload = runLegacyFallbackAudit({ args });
    if (args.print) console.log(JSON.stringify(payload, null, 2));
  } catch (err) {
    if (err?.payload && args.print) console.log(JSON.stringify(err.payload, null, 2));
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  main();
}
