import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

test('targeted prettier workflow is available for local commits', () => {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  const prettierTool = read('tools/wp_prettier_changed.mjs');
  const hookInstaller = read('tools/wp_hooks_install.js');

  assert.equal(scripts.format, 'node node_modules/prettier/bin/prettier.cjs . --write');
  assert.equal(scripts['format:check'], 'node node_modules/prettier/bin/prettier.cjs . --check');
  assert.equal(scripts['format:changed'], 'node tools/wp_prettier_changed.mjs --write --changed');
  assert.equal(scripts['format:changed:check'], 'node tools/wp_prettier_changed.mjs --check --changed');
  assert.equal(scripts['format:staged'], 'node tools/wp_prettier_changed.mjs --write --staged');
  assert.equal(scripts['format:staged:check'], 'node tools/wp_prettier_changed.mjs --check --staged');
  assert.equal(scripts['hooks:install'], 'node tools/wp_hooks_install.js');
  assert.equal(scripts['hooks:install:full'], 'node tools/wp_hooks_install.js --with-pre-push');

  assert.match(prettierTool, /\['diff',/);
  assert.match(prettierTool, /\['ls-files',/);
  assert.match(prettierTool, /--ignore-unknown/);
  assert.match(prettierTool, /Refusing to auto-stage partially staged files/);

  assert.match(hookInstaller, /wp_prettier_changed\.mjs --write --staged/);
  assert.match(hookInstaller, /wp_check\.js --strict --gate/);
  assert.match(hookInstaller, /--with-pre-push/);
  assert.match(hookInstaller, /fs\.rmSync\(prePushPath/);
  assert.match(hookInstaller, /tools\/wp_verify\.js < \/dev\/null/);
});
