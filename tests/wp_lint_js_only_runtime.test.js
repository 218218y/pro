import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

const OLD_LINT_LEGACY = 'lint:' + 'legacy';
const OLD_PARSER_REMOVAL = 'parser' + '-removal';
const OLD_DRY_RUN_SCRIPT = 'lint:' + OLD_PARSER_REMOVAL + '-dry-run';
const OLD_READINESS_SCRIPT = 'lint:' + OLD_PARSER_REMOVAL + '-readiness';

function packageJson() {
  return JSON.parse(read('package.json'));
}

async function loadEslintConfig(profile = 'js-only') {
  const previousProfile = process.env.WP_LINT_PROFILE;
  process.env.WP_LINT_PROFILE = profile;
  try {
    const configUrl = pathToFileURL(path.join(ROOT, 'eslint.config.js')).href;
    const mod = await import(`${configUrl}?profile=${encodeURIComponent(profile)}&ts=${Date.now()}`);
    return mod.default || [];
  } finally {
    if (typeof previousProfile === 'undefined') delete process.env.WP_LINT_PROFILE;
    else process.env.WP_LINT_PROFILE = previousProfile;
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function entryFiles(entry) {
  return asArray(entry.files).filter(Boolean);
}

function allConfiguredFiles(config) {
  return config.flatMap(entryFiles);
}

function hasTsOrTsxPattern(pattern) {
  return /\*\.tsx?\b|\*\.mts\b|types\/\*\*\/\*\.d\.ts/.test(String(pattern));
}

test('JS-only profile is the canonical ESLint lane', () => {
  const pkg = packageJson();

  assert.equal(pkg.scripts.lint, 'npm run lint:modern');
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile js-only');
  assert.equal(pkg.scripts['lint:js:strict'], 'node tools/wp_lint.js --profile js-only --strict');
  assert.equal(
    pkg.scripts['lint:modern'],
    'npm run lint:js:strict && npm run lint:ts-modern:syntax && npm run lint:contracts'
  );
  assert.equal(pkg.scripts[OLD_LINT_LEGACY], undefined);
  assert.equal(pkg.scripts[OLD_DRY_RUN_SCRIPT], undefined);
  assert.equal(pkg.scripts[OLD_READINESS_SCRIPT], undefined);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:js:strict/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:ts-modern:syntax/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:contracts/);
  assert.doesNotMatch(
    pkg.scripts['quality:ts-modern'],
    new RegExp(`${OLD_LINT_LEGACY}|${OLD_PARSER_REMOVAL}`)
  );
});

test('JS-only ESLint config omits TS/TSX files and custom parsers', async () => {
  const config = await loadEslintConfig('js-only');

  assert.equal(
    config.some(entry => entry.languageOptions?.parser || Object.keys(entry.plugins || {}).length),
    false,
    'ESLint must not configure custom TS parsers/plugins after package removal'
  );
  assert.equal(
    allConfiguredFiles(config).some(hasTsOrTsxPattern),
    false,
    'ESLint must not target TS/TSX/MTS/d.ts files'
  );
});

test('unsupported historical ESLint profiles are rejected', async () => {
  await assert.rejects(() => loadEslintConfig('migrate'), /Unsupported WP_LINT_PROFILE/);
  await assert.rejects(() => loadEslintConfig('runtime'), /Unsupported WP_LINT_PROFILE/);
});

test('JS-only keeps JS tools, tests, and config files under ESLint no-undef', async () => {
  const config = await loadEslintConfig('js-only');
  const files = allConfiguredFiles(config);

  assert.ok(files.includes('tools/**/*.js'));
  assert.ok(files.includes('tests/**/*.js'));
  assert.ok(files.includes('*.js'));
  assert.ok(files.includes('*.mjs'));
  assert.ok(files.includes('**/*.cjs'));

  const nodeJsEntry = config.find(entry => entryFiles(entry).includes('tools/**/*.js'));
  assert.equal(nodeJsEntry.rules['no-undef'], 'error');
  assert.equal(nodeJsEntry.languageOptions.sourceType, 'module');

  const cjsEntry = config.find(entry => entryFiles(entry).includes('**/*.cjs'));
  assert.equal(cjsEntry.rules['no-undef'], 'error');
  assert.equal(cjsEntry.languageOptions.sourceType, 'script');
});

test('wp_lint defaults target JS-only surfaces only', () => {
  const runner = read('tools/wp_lint.js');

  assert.match(runner, /profile.*js-only/s);
  assert.match(runner, /esm\/\*\*\/\*\.js/);
  assert.match(runner, /tests\/\*\*\/\*\.js/);
  assert.doesNotMatch(
    runner,
    new RegExp(`${OLD_PARSER_REMOVAL}|${OLD_LINT_LEGACY}|types\\/|\\*\\.ts|\\*\\.tsx`)
  );
});
