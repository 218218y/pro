import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
  assert.equal(scripts['format:base:check'], 'node tools/wp_prettier_changed.mjs --check --base');
  assert.equal(scripts['format:staged'], 'node tools/wp_prettier_changed.mjs --write --staged');
  assert.equal(scripts['format:staged:check'], 'node tools/wp_prettier_changed.mjs --check --staged');
  assert.equal(scripts['hooks:install'], 'node tools/wp_hooks_install.js');
  assert.equal(scripts['hooks:install:full'], 'node tools/wp_hooks_install.js --with-pre-push');

  assert.match(prettierTool, /\['diff',/);
  assert.match(prettierTool, /`\$\{base\}\.\.\.HEAD`/);
  assert.match(prettierTool, /\['ls-files',/);
  assert.match(prettierTool, /--ignore-unknown/);
  assert.match(prettierTool, /Refusing to auto-stage partially staged files/);

  assert.match(hookInstaller, /wp_prettier_changed\.mjs --write --staged/);
  assert.match(hookInstaller, /wp_check\.js --strict --gate/);
  assert.match(hookInstaller, /--with-pre-push/);
  assert.match(hookInstaller, /fs\.rmSync\(prePushPath/);
  assert.match(hookInstaller, /tools\/wp_verify\.js < \/dev\/null/);
});

test('targeted prettier base scope accepts and consumes an explicit Git ref', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-prettier-git-'));
  const toolDir = path.join(fixtureRoot, 'tools');
  const prettierBinDir = path.join(fixtureRoot, 'node_modules', 'prettier', 'bin');
  fs.mkdirSync(toolDir, { recursive: true });
  fs.mkdirSync(prettierBinDir, { recursive: true });
  fs.copyFileSync('tools/wp_prettier_changed.mjs', path.join(toolDir, 'wp_prettier_changed.mjs'));
  fs.writeFileSync(path.join(prettierBinDir, 'prettier.cjs'), '// fixture: existence is enough\n');
  fs.writeFileSync(path.join(fixtureRoot, 'tracked.js'), 'export const tracked = true;\n');

  const git = args =>
    spawnSync(process.platform === 'win32' ? 'git.exe' : 'git', args, {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
  for (const args of [
    ['init', '-q'],
    ['config', 'user.email', 'offline-test@example.invalid'],
    ['config', 'user.name', 'Offline Test'],
    ['config', 'commit.gpgsign', 'false'],
    ['add', '--', 'tracked.js'],
    ['commit', '-qm', 'fixture'],
  ]) {
    const setup = git(args);
    assert.equal(setup.status, 0, setup.stderr || setup.stdout);
  }

  const result = spawnSync(process.execPath, ['tools/wp_prettier_changed.mjs', '--check', '--base', 'HEAD'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /No base files to format/);
});
