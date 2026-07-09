import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

function packageJson() {
  return JSON.parse(read('package.json'));
}

async function loadEslintConfig(profile) {
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

test('parser-removal dry-run profile is exposed through npm scripts without changing legacy lint', () => {
  const pkg = packageJson();

  assert.equal(
    pkg.scripts['lint:parser-removal-dry-run'],
    'node tools/wp_lint.js --profile parser-removal-dry-run'
  );
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile parser-removal-dry-run');
  assert.equal(
    pkg.scripts['lint:js:strict'],
    'node tools/wp_lint.js --profile parser-removal-dry-run --strict'
  );
  assert.equal(pkg.scripts['lint:legacy'], 'node tools/wp_lint.js --profile migrate');
  assert.match(pkg.scripts['quality:ts-modern'], /lint:js:strict/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:ts-modern:syntax/);
  assert.match(pkg.scripts['quality:ts-modern'], /lint:contracts/);
  assert.doesNotMatch(pkg.scripts['quality:ts-modern'], /lint:legacy/);
});

test('parser-removal dry-run omits @typescript-eslint parser for TS and TSX files', async () => {
  const dryRunConfig = await loadEslintConfig('parser-removal-dry-run');
  const legacyConfig = await loadEslintConfig('migrate');

  assert.ok(
    legacyConfig.some(entry => entry.languageOptions?.parser && entry.plugins?.['@typescript-eslint']),
    'legacy migrate profile must still keep @typescript-eslint coverage'
  );
  assert.equal(
    dryRunConfig.some(entry => entry.languageOptions?.parser || entry.plugins?.['@typescript-eslint']),
    false,
    'dry-run profile must not configure @typescript-eslint parser/plugin for any matched file'
  );
  assert.equal(
    allConfiguredFiles(dryRunConfig).some(hasTsOrTsxPattern),
    false,
    'dry-run profile must not target TS/TSX/MTS/d.ts files through ESLint'
  );
});

test('parser-removal dry-run keeps JS tools, tests, and config files under ESLint no-undef', async () => {
  const dryRunConfig = await loadEslintConfig('parser-removal-dry-run');
  const files = allConfiguredFiles(dryRunConfig);

  assert.ok(files.includes('tools/**/*.js'));
  assert.ok(files.includes('tests/**/*.js'));
  assert.ok(files.includes('*.js'));
  assert.ok(files.includes('*.mjs'));
  assert.ok(files.includes('**/*.cjs'));

  const nodeJsEntry = dryRunConfig.find(entry => entryFiles(entry).includes('tools/**/*.js'));
  assert.equal(nodeJsEntry.rules['no-undef'], 'error');
  assert.equal(nodeJsEntry.languageOptions.sourceType, 'module');

  const cjsEntry = dryRunConfig.find(entry => entryFiles(entry).includes('**/*.cjs'));
  assert.equal(cjsEntry.rules['no-undef'], 'error');
  assert.equal(cjsEntry.languageOptions.sourceType, 'script');
});

test('wp_lint parser-removal dry-run defaults exclude TS/TSX target directories', () => {
  const runner = read('tools/wp_lint.js');

  assert.match(runner, /parserRemovalDryRun/);
  assert.match(runner, /esm\/\*\*\/\*\.js/);
  assert.match(runner, /tests\/\*\*\/\*\.js/);
  assert.doesNotMatch(
    runner.slice(
      runner.indexOf('if (parserRemovalDryRun)'),
      runner.indexOf('} else {', runner.indexOf('if (parserRemovalDryRun)'))
    ),
    /types|\*\.ts|\*\.tsx/,
    'dry-run default targets should not include TS/TSX/types paths'
  );
});
