import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { resolveNpmRunCommandString, resolveNpmRunLaunchOptions } from '../tools/wp_npm_spawn_support.js';

test('resolveNpmRunLaunchOptions prefers npm_execpath node script when available', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-npm-spawn-'));
  const npmCliPath = path.join(tempDir, 'npm-cli.js');
  fs.writeFileSync(npmCliPath, 'console.log("npm cli");\n', 'utf8');
  const launch = resolveNpmRunLaunchOptions('start:e2e', {
    platform: 'win32',
    nodeExecPath: 'C:/Program Files/nodejs/node.exe',
    npmExecPath: npmCliPath,
    env: {},
  });
  assert.equal(launch.command, 'C:/Program Files/nodejs/node.exe');
  assert.deepEqual(launch.args, [npmCliPath, 'run', 'start:e2e']);
  assert.equal(launch.shell, false);
});

test('resolveNpmRunLaunchOptions falls back to cmd.exe-backed npm on win32 without npm_execpath script', () => {
  const launch = resolveNpmRunLaunchOptions('start:e2e', {
    platform: 'win32',
    env: {},
    comspec: 'C:/Windows/System32/cmd.exe',
    npmExecPath: 'C:/Program Files/nodejs/npm.cmd',
  });
  assert.equal(launch.command, 'C:/Windows/System32/cmd.exe');
  assert.deepEqual(launch.args, ['/d', '/s', '/c', 'npm', 'run', 'start:e2e']);
  assert.equal(launch.shell, false);
});

test('resolveNpmRunLaunchOptions uses direct npm spawn on non-windows', () => {
  const launch = resolveNpmRunLaunchOptions('start:e2e', {
    platform: 'linux',
    env: {},
    npmExecPath: '',
  });
  assert.equal(launch.command, 'npm');
  assert.deepEqual(launch.args, ['run', 'start:e2e']);
  assert.equal(launch.shell, false);
});

test('resolveNpmRunCommandString quotes node/npm cli paths with spaces', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp npm spawn '));
  const npmCliPath = path.join(tempDir, 'npm-cli.js');
  fs.writeFileSync(npmCliPath, 'console.log("npm cli");\n', 'utf8');
  const command = resolveNpmRunCommandString('start:e2e', {
    platform: 'win32',
    nodeExecPath: 'C:/Program Files/nodejs/node.exe',
    npmExecPath: npmCliPath,
    env: {},
  });
  assert.match(command, /^"C:\/Program Files\/nodejs\/node\.exe" /);
  assert.match(command, /npm-cli\.js" run start:e2e$/);
});

test('resolveNpmRunCommandString uses cmd.exe wrapper on win32 fallback', () => {
  const command = resolveNpmRunCommandString('start:e2e', {
    platform: 'win32',
    env: {},
    comspec: 'C:/Windows/System32/cmd.exe',
    npmExecPath: '',
  });
  assert.equal(command, 'C:/Windows/System32/cmd.exe /d /s /c npm run start:e2e');
});
