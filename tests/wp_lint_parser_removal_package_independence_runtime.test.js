import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-eslint-dry-run-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.copyFileSync(path.join(ROOT, 'eslint.config.js'), path.join(tmp, 'eslint.config.js'));
  return tmp;
}

test('parser-removal dry-run imports eslint.config.js without @typescript-eslint packages installed', () => {
  const configSource = read('eslint.config.js');
  assert.doesNotMatch(configSource, /^import\s+.*@typescript-eslint\/parser/m);
  assert.doesNotMatch(configSource, /^import\s+.*@typescript-eslint\/eslint-plugin/m);
  assert.match(configSource, /PARSER_REMOVAL_DRY_RUN \? null : await loadTypeScriptEslint\(\)/);

  const tempProject = copyConfigToTempProject();
  const script = [
    "process.env.WP_LINT_PROFILE = 'parser-removal-dry-run';",
    `const mod = await import(${JSON.stringify(pathToFileURL(path.join(tempProject, 'eslint.config.js')).href)});`,
    "console.log(Array.isArray(mod.default) ? 'ok' : 'bad');",
  ].join('\n');

  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: tempProject,
    encoding: 'utf8',
  });
  assert.equal(out.trim(), 'ok');
});

test('migrate profile still configures @typescript-eslint for legacy compatibility', async () => {
  const migrateConfig = await loadEslintConfig('migrate');
  assert.ok(
    migrateConfig.some(entry => entry.languageOptions?.parser && entry.plugins?.['@typescript-eslint']),
    'legacy migrate profile must still load @typescript-eslint parser/plugin for TS/TSX compatibility'
  );
});

test('legacy lint remains unchanged and modern quality excludes legacy', () => {
  const pkg = packageJson();

  assert.equal(pkg.scripts['lint:legacy'], 'node tools/wp_lint.js --profile migrate');
  assert.equal(pkg.scripts['lint:js'], 'node tools/wp_lint.js --profile parser-removal-dry-run');
  assert.equal(
    pkg.scripts['lint:js:strict'],
    'node tools/wp_lint.js --profile parser-removal-dry-run --strict'
  );
  assert.equal(
    pkg.scripts['lint:parser-removal-dry-run'],
    'node tools/wp_lint.js --profile parser-removal-dry-run'
  );
  assert.match(pkg.scripts['quality:ts-modern'], /lint:js:strict/);
  assert.doesNotMatch(pkg.scripts['quality:ts-modern'], /lint:legacy/);
});
