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
  'forward-compatibility',
  'legacy-rejection',
  'project-migration',
  'external-api-compat',
  'compat-boundary',
  'test-fixture',
  'legacy-runtime-risk',
  'unknown',
];

export const LEGACY_FALLBACK_GUARDED_CATEGORIES = Object.freeze([
  'project-migration',
  'external-api-compat',
  'compat-boundary',
]);

// Scan identifier/word tokens first, then decide semantically whether the token
// belongs to this audit. This catches both prefix forms (`legacyResult`,
// `fallbackReason`, `compatibility`) and embedded camel/Pascal forms
// (`buildCompatSurface`, `readLegacyValue`) without treating punctuation as
// part of the contract identity.
const IDENTIFIER_RE = /\b[$A-Z_a-z][$\w]*\b/g;
const EXTERNAL_API_COMPAT_RE =
  /(React|browser|Browser|polyfill|vendor|third[- ]party|external API|THREE[- ]compatible|Three[- ]compatible|three[- ]compatible|rendererCompat)/;
const REVIEWED_COMPAT_BOUNDARY_TEXT_RE =
  /\b(alias|boundary|cleanup|clear|deprecated|dispose|disposer|field|kept|marker|mirror|older|previous|retired|seam|shim|signature|surface|version)\b|\bstill\s+(?:read|pass|supported)\b|\bbefore\s+v?\d+\b/i;
const PROJECT_MIGRATION_PATH_RE =
  /(^|\/)(?:native\/io(?:\/|$)|native\/features\/project_config(?:\/|_|\.)|project_(?:io|config)(?:\/|_|\.))/;
const PROJECT_MIGRATION_TEXT_RE =
  /\b(migrat(?:e|ed|es|ing|ion|ions)|imported|persisted|serialized|deserialized|schema(?:Version)?|saved|stored|payload)\b/i;
const FORWARD_COMPATIBILITY_RE = /\bforward[- ]compat(?:ible|ibility)?\b|\bpreserve unknown keys\b/i;
const NEGATED_COMPATIBILITY_RE = /\bnot\s+(?:an?\s+)?compat(?:ibility|ible)?\b/i;
const LEGACY_REJECTION_RE =
  /\b(?:not supported|unsupported|reject(?:ed|ion)?|forbid(?:den)?|must not|removed|retired)\b/i;
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

function isProjectMigrationPath(relPath, lineText, term) {
  if (PROJECT_MIGRATION_PATH_RE.test(relPath)) return true;
  return (
    (hasLegacyTerm(term) || hasCompatTerm(term)) && PROJECT_MIGRATION_TEXT_RE.test(String(lineText || ''))
  );
}

function isBrowserAdapterPath(relPath, lineText) {
  return (
    /(^|\/)adapters\/browser(\/|$)/.test(relPath) ||
    /(^|\/)entry_pro/.test(relPath) ||
    (/(^|\/)native\/(platform|ui)\//.test(relPath) &&
      /\b(browser|dom|document|window|raf|requestAnimationFrame|timer|clipboard|overlay|localStorage|event|pointer|preventDefault|stopPropagation|file[- ]?input)\b/i.test(
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

function isAuditNeedleTerm(term) {
  return /(legacy|fallback|compat)/i.test(String(term || ''));
}

function isForwardCompatibilityLine(lineText, term) {
  return hasCompatTerm(term) && FORWARD_COMPATIBILITY_RE.test(String(lineText || ''));
}

function isNegatedCompatibilityLine(lineText, term) {
  return hasCompatTerm(term) && NEGATED_COMPATIBILITY_RE.test(String(lineText || ''));
}

function isLegacyRejectionLine(lineText, term) {
  return hasLegacyTerm(term) && LEGACY_REJECTION_RE.test(String(lineText || ''));
}

function isTypedAutosaveDiagnosticLabel(relPath, lineText) {
  return (
    relPath === 'esm/native/runtime/autosave_access.ts' &&
    /detail:\s*['"]legacy-owner-returned-false['"]/.test(lineText)
  );
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
  if (/(^|\/)compatibility(\/|$)/.test(relPath)) return true;
  return (
    (hasCompatTerm(termText) || hasLegacyTerm(termText)) && REVIEWED_COMPAT_BOUNDARY_TEXT_RE.test(haystack)
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
  if (isForwardCompatibilityLine(normalizedLine, term)) return 'forward-compatibility';
  if (isLegacyRejectionLine(normalizedLine, term)) return 'legacy-rejection';
  if (isProjectMigrationPath(normalizedPath, normalizedLine, term)) return 'project-migration';
  if (isExternalApiCompatLine(normalizedPath, normalizedLine, term)) return 'external-api-compat';
  if (isCompatBoundaryLine(normalizedPath, normalizedLine, term)) return 'compat-boundary';
  if (hasFallbackTerm(term) && isErrorMessageDefaultLine(normalizedLine)) return 'error-message-default';
  if (hasFallbackTerm(term) && isDomainDefaultPath(normalizedPath, normalizedLine)) return 'domain-default';
  if (hasFallbackTerm(term) && isRuntimeDefaultLine(normalizedLine)) return 'runtime-default';
  if (hasFallbackTerm(term)) return 'domain-default';
  if (hasLegacyTerm(term)) return 'legacy-runtime-risk';
  if (hasCompatTerm(term)) return 'domain-default';
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
      IDENTIFIER_RE.lastIndex = 0;
      const seenTermsOnLine = new Set();
      for (const match of lineText.matchAll(IDENTIFIER_RE)) {
        const term = match[0];
        if (!isAuditNeedleTerm(term)) continue;
        if (isTypedAutosaveDiagnosticLabel(relPath, lineText)) continue;
        if (isNegatedCompatibilityLine(lineText, term) && !hasFallbackTerm(term) && !hasLegacyTerm(term)) {
          continue;
        }
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

function selectGuardedByFile(summary) {
  const guarded = {};
  for (const [file, stats] of Object.entries(summary?.byFile || {})) {
    const categories = Object.fromEntries(
      LEGACY_FALLBACK_GUARDED_CATEGORIES.map(category => [
        category,
        stats.categories?.[category] || 0,
      ]).filter(([, count]) => count > 0)
    );
    const total = Object.values(categories).reduce((sum, count) => sum + count, 0);
    if (total > 0) guarded[file] = { total, categories };
  }
  return guarded;
}

export function createLegacyFallbackAllowlist(summary, { sourceRoot = DEFAULT_SOURCE_ROOT } = {}) {
  return {
    version: 2,
    sourceRoot,
    guardedCategories: [...LEGACY_FALLBACK_GUARDED_CATEGORIES],
    policy:
      'Reviewed compatibility seams are growth-ratcheted by file/category. Ordinary defaults and capability fallbacks stay report-visible but are not allowlisted. Reductions pass automatically; legacy-runtime-risk and unknown must stay at zero.',
    entries: selectGuardedByFile(summary),
  };
}

function normalizeAllowlistEntries(allowlist) {
  return allowlist && allowlist.entries && typeof allowlist.entries === 'object' ? allowlist.entries : {};
}

export function compareLegacyFallbackAllowlist(
  summary,
  allowlist,
  { sourceRoot = DEFAULT_SOURCE_ROOT } = {}
) {
  const failures = [];
  if (!allowlist || allowlist.version !== 2) {
    return {
      ok: false,
      failures: [{ kind: 'allowlist-version', expected: 2, actual: allowlist?.version ?? null }],
    };
  }

  if (allowlist.sourceRoot !== sourceRoot) {
    failures.push({ kind: 'source-root', expected: sourceRoot, actual: allowlist.sourceRoot ?? null });
  }

  const expectedCategories = Array.isArray(allowlist.guardedCategories)
    ? [...allowlist.guardedCategories].sort()
    : [];
  const actualCategories = [...LEGACY_FALLBACK_GUARDED_CATEGORIES].sort();
  if (JSON.stringify(expectedCategories) !== JSON.stringify(actualCategories)) {
    failures.push({
      kind: 'guarded-categories',
      expected: actualCategories,
      actual: expectedCategories,
    });
  }

  const expected = normalizeAllowlistEntries(allowlist);
  const actual = selectGuardedByFile(summary);
  for (const [file, actualStats] of Object.entries(actual).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const expectedStats = expected[file];
    if (!expectedStats) {
      failures.push({ kind: 'new-guarded-file', file, actual: actualStats });
      continue;
    }
    for (const category of LEGACY_FALLBACK_GUARDED_CATEGORIES) {
      const expectedCount = expectedStats.categories?.[category] || 0;
      const actualCount = actualStats.categories?.[category] || 0;
      if (actualCount > expectedCount) {
        failures.push({
          kind: 'guarded-category-growth',
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

export function createLegacyFallbackPayload({
  occurrences,
  summary,
  sourceRoot = DEFAULT_SOURCE_ROOT,
  allowlistComparison = null,
}) {
  return {
    generatedAt: new Date().toISOString(),
    sourceRoot,
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
  const guardedByFile = selectGuardedByFile(summary);
  const guardedCount = Object.values(guardedByFile).reduce((sum, stats) => sum + stats.total, 0);
  lines.push(`- Reviewed compatibility seams under growth ratchet: **${guardedCount}**`);
  lines.push('- Category counts:');
  for (const category of LEGACY_FALLBACK_CATEGORIES) {
    lines.push(`  - \`${category}\`: **${summary.byCategory[category] || 0}**`);
  }
  lines.push('');
  lines.push('## Policy');
  lines.push('');
  lines.push(
    '- Runtime compatibility must not grow silently. Reviewed migration/API/compatibility seams are growth-ratcheted; ordinary defaults remain visible without creating allowlist churn.'
  );
  lines.push(
    '- The scanner includes prefix, camelCase, PascalCase, `compatibility`, and `compatible` vocabulary.'
  );
  lines.push(
    '- `framework-default` is reserved for framework-owned API names such as React `Suspense` fallback props.'
  );
  lines.push(
    '- `forward-compatibility` describes intentional forward-compatible data/config behavior and is informational.'
  );
  lines.push(
    '- `legacy-rejection` records fail-closed guards that explicitly reject retired result shapes; it is informational, not live compatibility.'
  );
  lines.push(
    '- `project-migration` belongs at import/load/persisted-payload boundaries and is growth-ratcheted.'
  );
  lines.push('- `browser-adapter` belongs at browser/DOM/environment adapter boundaries.');
  lines.push(
    '- `domain-default` and `error-message-default` are ordinary default-value names, kept visible so they do not hide runtime compatibility work.'
  );
  lines.push(
    '- `external-api-compat` is reserved for third-party/framework compatibility seams and is growth-ratcheted.'
  );
  lines.push(
    '- `compat-boundary` is an explicitly reviewed live compatibility seam and is growth-ratcheted.'
  );
  lines.push(
    '- `legacy-runtime-risk` is forbidden in the checked baseline: ambiguous live legacy paths must be removed or made an explicit reviewed seam.'
  );
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
    fs.writeFileSync(
      allowlistPath,
      `${JSON.stringify(createLegacyFallbackAllowlist(summary, { sourceRoot }), null, 2)}\n`
    );
  }

  if (args.check) {
    if (!fs.existsSync(allowlistPath)) {
      throw new Error(`Legacy fallback allowlist missing: ${args.allowlistPath || DEFAULT_ALLOWLIST}`);
    }
    allowlistComparison = compareLegacyFallbackAllowlist(summary, readJson(allowlistPath), { sourceRoot });
  }

  const payload = createLegacyFallbackPayload({ occurrences, summary, sourceRoot, allowlistComparison });

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
  if (summary.byCategory['legacy-runtime-risk'] > 0) {
    const err = new Error(
      `Legacy fallback audit found ${summary.byCategory['legacy-runtime-risk']} unreviewed legacy runtime risk occurrence(s).`
    );
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
