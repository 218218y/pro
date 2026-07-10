import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const REMOVED_SCOPE = '@' + 'typescript' + '-' + 'eslint';
const REMOVED_PARSER = REMOVED_SCOPE + '/parser';
const REMOVED_PLUGIN = REMOVED_SCOPE + '/eslint-plugin';

function read(rel) {
  return fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
}

const OLD_LINT_LEGACY = 'lint:' + 'legacy';
const OLD_PARSER_REMOVAL = 'parser' + '-removal';
const OLD_DRY_RUN_SCRIPT = 'lint:' + OLD_PARSER_REMOVAL + '-dry-run';

function packageJson() {
  return JSON.parse(read('package.json'));
}

async function loadEslintConfig(profile) {
  const previousProfile = process.env.WP_LINT_PROFILE;
  process.env.WP_LINT_PROFILE = profile;
  try {
    const configUrl = pathToFileURL(path.join(ROOT, 'eslint.config.js')).href;
    const mod = await import(
      `${configUrl}?package-independence=${encodeURIComponent(profile)}&ts=${Date.now()}`
    );
    return mod.default || [];
  } finally {
    if (typeof previousProfile === 'undefined') delete process.env.WP_LINT_PROFILE;
    else process.env.WP_LINT_PROFILE = previousProfile;
  }
}

function copyConfigToTempProject() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-eslint-js-only-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.copyFileSync(path.join(ROOT, 'eslint.config.js'), path.join(tmp, 'eslint.config.js'));
  return tmp;
}

test('eslint config imports without removed TS ESLint packages installed', () => {
  const configSource = read('eslint.config.js');
  assert.doesNotMatch(configSource, new RegExp(REMOVED_PARSER.replace('/', '\\/')));
  assert.doesNotMatch(configSource, new RegExp(REMOVED_PLUGIN.replace('/', '\\/')));
  assert.doesNotMatch(configSource, /loadTypeScriptEslint|tsSourceConfig|typeScriptEslint/);

  const tempProject = copyConfigToTempProject();
  const script = [
    "process.env.WP_LINT_PROFILE = 'js-only';",
    `const mod = await import(${JSON.stringify(pathToFileURL(path.join(tempProject, 'eslint.config.js')).href)});`,
    "console.log(Array.isArray(mod.default) ? 'ok' : 'bad');",
  ].join('\n');

  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: tempProject,
    encoding: 'utf8',
  });
  assert.equal(out.trim(), 'ok');
});

test('only the js-only ESLint profile is supported after package removal', async () => {
  const jsOnlyConfig = await loadEslintConfig('js-only');
  assert.equal(
    jsOnlyConfig.some(entry => entry.languageOptions?.parser || Object.keys(entry.plugins || {}).length),
    false,
    'js-only profile must not configure removed TS ESLint parser/plugin packages'
  );

  await assert.rejects(() => loadEslintConfig('migrate'), /Unsupported WP_LINT_PROFILE/);
});

test('removed TS ESLint packages are absent and modern quality has no old aliases', () => {
  const pkg = packageJson();

  assert.equal(pkg.devDependencies[REMOVED_PARSER], undefined);
  assert.equal(pkg.devDependencies[REMOVED_PLUGIN], undefined);
  assert.equal(pkg.scripts.lint, 'npm run lint:modern');
  assert.equal(
    pkg.scripts['lint:modern'],
    'npm run lint:js:strict && npm run lint:ts-modern:syntax && npm run lint:contracts'
  );
  assert.equal(pkg.scripts[OLD_LINT_LEGACY], undefined);
  assert.equal(pkg.scripts[OLD_DRY_RUN_SCRIPT], undefined);
  assert.equal(pkg.scripts['quality:ts'], 'npm run quality:ts-modern');
  assert.match(pkg.scripts['quality:ts-modern'], /lint:js:strict/);
  assert.doesNotMatch(
    pkg.scripts['quality:ts-modern'],
    new RegExp(`${OLD_LINT_LEGACY}|${OLD_PARSER_REMOVAL}`)
  );
  assert.doesNotMatch(pkg.scripts['lint:modern'], new RegExp(`${OLD_LINT_LEGACY}|${OLD_PARSER_REMOVAL}`));
});
