#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

let cachedTestIsolationNoneArgument;
let testIsolationSupportResolved = false;

function resolveTestIsolationNoneArgumentFromHelp(helpText) {
  if (/(?:^|[\s,])--test-isolation(?:=|[\s,]|$)/mu.test(helpText)) {
    return '--test-isolation=none';
  }
  if (/(?:^|[\s,])--experimental-test-isolation(?:=|[\s,]|$)/mu.test(helpText)) {
    return '--experimental-test-isolation=none';
  }
  return null;
}

export function resolveTestIsolationNoneArgument(helpText) {
  if (typeof helpText === 'string') {
    return resolveTestIsolationNoneArgumentFromHelp(helpText);
  }
  if (testIsolationSupportResolved) return cachedTestIsolationNoneArgument;

  const helpResult = spawnSync(process.execPath, ['--help'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  cachedTestIsolationNoneArgument =
    helpResult.status === 0
      ? resolveTestIsolationNoneArgumentFromHelp(String(helpResult.stdout || ''))
      : null;
  testIsolationSupportResolved = true;
  return cachedTestIsolationNoneArgument;
}

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

function resolveNpxCliPath() {
  const candidates = [];
  if (process.env.npm_execpath) {
    candidates.push(path.join(path.dirname(process.env.npm_execpath), 'npx-cli.js'));
  }
  candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'));
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function hasLocalTsx(projectRoot) {
  return fs.existsSync(path.join(projectRoot, 'node_modules', 'tsx', 'package.json'));
}

export function resolveTsxTestRunner(projectRoot = process.cwd()) {
  const forceNpx = process.env.WP_TEST_RUNNER_FORCE_NPX === '1';
  const useLocal = !forceNpx && hasLocalTsx(projectRoot);
  if (useLocal) {
    return {
      program: process.execPath,
      baseArgs: ['--import', 'tsx', '--test'],
      label: 'node --import tsx --test',
      commandPrefix: `${process.execPath} --import tsx --test`,
      mode: 'local',
      spawnOptions: { windowsHide: true },
    };
  }
  const npxCliPath = resolveNpxCliPath();
  const npx = npxCliPath ? process.execPath : getNpxCommand();
  return {
    program: npx,
    baseArgs: [...(npxCliPath ? [npxCliPath] : []), '--yes', 'tsx', '--test'],
    label: 'npx --yes tsx --test',
    commandPrefix: 'npx --yes tsx --test',
    mode: 'npx',
    spawnOptions: {
      windowsHide: true,
      ...(process.platform === 'win32' && !npxCliPath ? { shell: true } : null),
    },
  };
}

export function buildTsxTestRun(projectRoot, files, extraArgs = []) {
  const runner = resolveTsxTestRunner(projectRoot);
  return {
    ...runner,
    args: [...runner.baseArgs, ...extraArgs, ...files],
    command: `${runner.commandPrefix}${extraArgs.length ? ` ${extraArgs.map(arg => JSON.stringify(arg)).join(' ')}` : ''}${files.length ? ` ${files.map(file => JSON.stringify(file)).join(' ')}` : ''}`,
    spawnOptions: { ...(runner.spawnOptions ?? {}) },
  };
}
