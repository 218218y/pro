#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '..');

const ESLINT_CONFIG_RELATIVE_PATH = 'eslint.config.js';
const DEFAULT_DOC_RELATIVE_PATH = 'docs/LINT_STRATEGY_MATRIX.md';
const PROFILES = ['js-only'];

const FUTURE_TARGET_BY_RULE = new Map([
  ['no-dupe-keys', 'replace-by-oxlint'],
  ['no-unreachable', 'replace-by-oxlint'],
  ['no-const-assign', 'replace-by-oxlint'],
  ['no-redeclare', 'replace-by-oxlint'],
  ['eqeqeq', 'replace-by-oxlint'],
  ['no-undef', 'keep-eslint'],
  ['no-unused-vars', 'replace-by-oxlint'],
  ['no-restricted-globals', 'replace-by-custom-contract'],
  ['no-restricted-imports', 'replace-by-custom-contract'],
  ['no-restricted-syntax', 'replace-by-custom-contract'],
]);

const NOTES_BY_RULE = new Map([
  ['no-dupe-keys', 'Covered by JS ESLint and Oxlint correctness; low-risk syntax parity rule.'],
  ['no-unreachable', 'Covered by JS ESLint and Oxlint correctness; low-risk syntax parity rule.'],
  ['no-const-assign', 'Covered by JS ESLint and Oxlint correctness; low-risk syntax parity rule.'],
  [
    'no-redeclare',
    'Oxlint owns this syntax class in the canonical modern gate; ESLint covers JS/tools/config only.',
  ],
  [
    'eqeqeq',
    'Oxlint syntax is configured with the same smart equality policy before becoming a blocking gate.',
  ],
  [
    'no-undef',
    'Keep ESLint for JS/tools globals while TS/TSX remains covered by TypeScript typecheck instead of no-undef.',
  ],
  [
    'no-unused-vars',
    'Oxlint syntax is configured with underscore ignore behavior for args, vars, and catch bindings.',
  ],
  [
    'no-restricted-globals',
    'Architecture policy around browser globals is now mirrored by wp_lint_architecture_contracts; the architecture baseline is 0 and new violations fail.',
  ],
  [
    'no-restricted-imports',
    'Project layer/browser-env boundaries are now mirrored by wp_lint_architecture_contracts plus existing layer contracts; the architecture baseline is 0.',
  ],
  [
    'no-restricted-syntax',
    'Project-specific App.* bag ban is now mirrored by wp_lint_architecture_contracts through the AST adapter; the architecture baseline is 0.',
  ],
]);

function parseArgs(argv) {
  const args = {
    checkPath: null,
    outPath: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      args.json = true;
    } else if (arg === '--check') {
      args.checkPath = argv[++i] || DEFAULT_DOC_RELATIVE_PATH;
    } else if (arg.startsWith('--check=')) {
      args.checkPath = arg.slice('--check='.length) || DEFAULT_DOC_RELATIVE_PATH;
    } else if (arg === '--out') {
      args.outPath = argv[++i] || DEFAULT_DOC_RELATIVE_PATH;
    } else if (arg.startsWith('--out=')) {
      args.outPath = arg.slice('--out='.length) || DEFAULT_DOC_RELATIVE_PATH;
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        `Usage: node tools/wp_lint_rule_matrix.mjs [--json] [--out docs/LINT_STRATEGY_MATRIX.md] [--check docs/LINT_STRATEGY_MATRIX.md]`
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function normalizeRuleLevel(config) {
  const level = Array.isArray(config) ? config[0] : config;
  if (level === 0) return 'off';
  if (level === 1) return 'warn';
  if (level === 2) return 'error';
  return String(level || 'off');
}

function normalizeFiles(files) {
  if (!files) return ['<all>'];
  return Array.isArray(files) ? files.map(String) : [String(files)];
}

function classifyAppliesTo(files) {
  const applies = new Set();
  for (const file of files) {
    const value = String(file);
    if (value.includes('tests/')) applies.add('tests');
    if (
      value.includes('tools/') ||
      value === '*.js' ||
      value === '*.mjs' ||
      value === '*.cjs' ||
      value.includes('*.cjs')
    ) {
      applies.add('tools');
    }
    if (/tsx|\.tsx/.test(value)) applies.add('TSX');
    if (/\.d\.ts|\.ts|\.mts|\*\*\/\*\.ts|\*\*\/\*\.mts/.test(value)) applies.add('TS');
    if (/\.js|\.mjs|\.cjs|js\//.test(value)) applies.add('JS');
    if (value === '<all>') applies.add('JS');
  }
  return [...applies].sort(
    (a, b) =>
      ['JS', 'TS', 'TSX', 'tools', 'tests'].indexOf(a) - ['JS', 'TS', 'TSX', 'tools', 'tests'].indexOf(b)
  );
}

function classifySource(ruleName) {
  if (ruleName === 'no-restricted-imports' || ruleName === 'no-restricted-syntax') return 'custom';
  return 'ESLint';
}

function isTypeAware(ruleName) {
  // The current config does not set parserOptions.project, so even the TS rule is syntax/AST scoped.
  // Type-aware gates are delegated to tsc today and to Oxlint/tsgolint audit in the modern lane.
  return false;
}

function mergeUnique(target, values) {
  for (const value of values) target.add(value);
}

async function loadEslintConfigForProfile(profile) {
  const configPath = path.join(ROOT, ESLINT_CONFIG_RELATIVE_PATH);
  const previousProfile = process.env.WP_LINT_PROFILE;
  process.env.WP_LINT_PROFILE = profile;
  try {
    const url = pathToFileURL(configPath).href + `?profile=${encodeURIComponent(profile)}&ts=${Date.now()}`;
    const mod = await import(url);
    return mod.default || [];
  } finally {
    if (typeof previousProfile === 'undefined') delete process.env.WP_LINT_PROFILE;
    else process.env.WP_LINT_PROFILE = previousProfile;
  }
}

export async function collectLintRuleMatrix() {
  const byRule = new Map();

  for (const profile of PROFILES) {
    const config = await loadEslintConfigForProfile(profile);
    for (const entry of config) {
      if (!entry || !entry.rules) continue;
      const files = normalizeFiles(entry.files);
      const ignores = normalizeFiles(entry.ignores || []);
      for (const [ruleName, ruleConfig] of Object.entries(entry.rules)) {
        if (!byRule.has(ruleName)) {
          byRule.set(ruleName, {
            rule: ruleName,
            source: classifySource(ruleName),
            appliesTo: new Set(),
            profiles: new Set(),
            files: new Set(),
            ignores: new Set(),
            levels: new Set(),
            typeAware: isTypeAware(ruleName),
            futureTarget: FUTURE_TARGET_BY_RULE.get(ruleName) || 'intentionally-accepted',
            notes:
              NOTES_BY_RULE.get(ruleName) ||
              'Rule has an explicit Stage 9 target and an owner in the modern quality gate.',
          });
        }
        const row = byRule.get(ruleName);
        row.profiles.add(profile);
        row.levels.add(normalizeRuleLevel(ruleConfig));
        mergeUnique(row.files, files);
        mergeUnique(row.ignores, ignores.filter(Boolean));
        mergeUnique(row.appliesTo, classifyAppliesTo(files));
      }
    }
  }

  return [...byRule.values()]
    .map(row => ({
      ...row,
      appliesTo: [...row.appliesTo],
      profiles: [...row.profiles].sort(),
      files: [...row.files].sort(),
      ignores: [...row.ignores].sort(),
      levels: [...row.levels].sort(),
    }))
    .sort((a, b) => a.rule.localeCompare(b.rule));
}

function mdCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\n+/g, '<br>');
}

export function createLintRuleMatrixMarkdown(rows) {
  const generatedFrom = `${ESLINT_CONFIG_RELATIVE_PATH} (${PROFILES.join(' + ')} profiles)`;
  const lines = [
    '# Lint Strategy Matrix',
    '',
    '<!-- Tool-owned report target. Regenerate with: npm run lint:rule-matrix -->',
    '',
    `Generated from: \`${generatedFrom}\`.`,
    '',
    'Stage 9 finalization: TypeScript 7.0.2 is active, TS/TSX ESLint ownership is removed, ESLint owns JS/tools/tests/config, and TS/TSX is covered by Oxlint syntax, TypeScript typecheck, and custom contracts.',
    '',
    '## Rule matrix',
    '',
    '| Rule | Current source | Applies to | Profiles | Levels | Type-aware | Future target | Notes / risk |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const row of rows) {
    lines.push(
      `| \`${mdCell(row.rule)}\` | ${mdCell(row.source)} | ${mdCell(row.appliesTo.join(', ') || 'n/a')} | ${mdCell(row.profiles.join(', '))} | ${mdCell(row.levels.join(', '))} | ${row.typeAware ? 'yes' : 'no'} | ${mdCell(row.futureTarget)} | ${mdCell(row.notes)} |`
    );
  }

  lines.push(
    '',
    '## Migration policy',
    '',
    '- `lint:modern` is the primary lint gate and combines strict JS ESLint, Oxlint syntax, and custom contracts.',
    '- `lint:ts-modern:syntax` is now a blocking Oxlint syntax gate; it must stay at 0 diagnostics as the canonical TS/TSX syntax gate.',
    '- `lint:ts-modern:type-aware` remains audit-only; the first safe burn-down reduced diagnostics from 998 to 966, and the remaining buckets need focused follow-up passes.',
    '- `lint:contracts` owns project-specific rules that should not depend on ESLint parser selectors, including the lint architecture contracts.',
    '- TS/TSX ESLint removal is complete; `lint:modern-readiness` remains as a regression check for rule ownership.',
    ''
  );

  return lines.join('\n');
}

export async function formatMarkdownForDocs(markdown) {
  try {
    const prettier = await import('prettier');
    return await prettier.format(markdown, { parser: 'markdown' });
  } catch {
    return markdown;
  }
}

export async function createFormattedLintRuleMatrixMarkdown(rows) {
  return formatMarkdownForDocs(createLintRuleMatrixMarkdown(rows));
}

export async function createLintRuleMatrixMarkdownFromConfig() {
  const rows = await collectLintRuleMatrix();
  return createFormattedLintRuleMatrixMarkdown(rows);
}

function resolveRootPath(value) {
  return path.resolve(ROOT, value || DEFAULT_DOC_RELATIVE_PATH);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = await collectLintRuleMatrix();
  if (args.json) {
    console.log(JSON.stringify({ rules: rows }, null, 2));
    return;
  }

  const markdown = await createFormattedLintRuleMatrixMarkdown(rows);
  if (args.checkPath) {
    const target = resolveRootPath(args.checkPath);
    const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (current !== markdown) {
      console.error(
        `[Lint Matrix] ${path.relative(ROOT, target)} is out of date. Run: npm run lint:rule-matrix`
      );
      process.exit(1);
    }
    console.log(`[Lint Matrix] OK: ${path.relative(ROOT, target)}`);
    return;
  }

  if (args.outPath) {
    const target = resolveRootPath(args.outPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, markdown);
    console.log(`[Lint Matrix] Wrote ${path.relative(ROOT, target)}`);
    return;
  }

  console.log(markdown);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
