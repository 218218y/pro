#!/usr/bin/env node
import { spawn } from 'node:child_process';
import osConstants from 'node:os';
import { buildTsxTestRun } from './wp_test_runner_command.mjs';

function signalToExitCode(signal) {
  if (!signal) return 1;
  const normalized = signal.startsWith('SIG') ? signal : `SIG${signal}`;
  const code = osConstants.constants.signals[normalized];
  return Number.isInteger(code) ? 128 + code : 1;
}

const rawArgs = process.argv.slice(2);
const separatorIndex = rawArgs.indexOf('--');
const files = (separatorIndex === -1 ? rawArgs : rawArgs.slice(0, separatorIndex)).filter(Boolean);
const forwardedArgs = separatorIndex === -1 ? [] : rawArgs.slice(separatorIndex + 1);

if (files.length === 0) {
  console.error(
    'Usage: node tools/wp_run_tsx_tests.mjs <test-file> [more-tests...] [-- extra node --test args]'
  );
  process.exit(1);
}

const testRun = buildTsxTestRun(process.cwd(), files, forwardedArgs);
console.error(`[run-tsx-tests] ${testRun.command}`);

const child = spawn(testRun.program, testRun.args, {
  stdio: 'inherit',
  env: process.env,
  ...(testRun.spawnOptions ?? {}),
});

let forwardedSignal = null;
let killTimer = null;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    forwardedSignal = signal;
    if (!child.killed) child.kill(signal);
    if (killTimer) clearTimeout(killTimer);
    killTimer = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 2000);
    killTimer.unref?.();
  });
}

child.on('exit', (code, signal) => {
  if (killTimer) clearTimeout(killTimer);
  if (signal) process.exit(signalToExitCode(signal));
  if (forwardedSignal && code !== 0) process.exit(signalToExitCode(forwardedSignal));
  process.exit(code ?? 1);
});
