#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
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
  const npx = getNpxCommand();
  return {
    program: npx,
    baseArgs: ['--yes', 'tsx', '--test'],
    label: 'npx --yes tsx --test',
    commandPrefix: 'npx --yes tsx --test',
    mode: 'npx',
    spawnOptions: {
      windowsHide: true,
      ...(process.platform === 'win32' ? { shell: true } : null),
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
