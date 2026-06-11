#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import osConstants from 'node:os';
import { buildTsxTestRun } from './wp_test_runner_command.mjs';

function signalToExitCode(signal) {
  if (!signal) return 1;
  const normalized = signal.startsWith('SIG') ? signal : `SIG${signal}`;
  const code = osConstants.constants.signals[normalized];
  return Number.isInteger(code) ? 128 + code : 1;
}

const [, , listPath, ...restArgs] = process.argv;
if (!listPath) {
  console.error('Usage: node tools/wp_run_test_file_list.mjs <file-list-path> [-- extra node --test args]');
  process.exit(1);
}

const fileList = (await readFile(listPath, 'utf8'))
  .split(/\r?\n/u)
  .map(line => line.trim())
  .filter(Boolean);

if (fileList.length === 0) {
  console.error(`No test files listed in ${listPath}`);
  process.exit(1);
}

const forwardedArgs = restArgs[0] === '--' ? restArgs.slice(1) : restArgs;
const testRun = buildTsxTestRun(process.cwd(), fileList, forwardedArgs);
console.error(
  `[run-test-file-list] running ${fileList.length} file${fileList.length === 1 ? '' : 's'} from ${listPath}`
);
console.error(`[run-test-file-list] ${testRun.command}`);

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
