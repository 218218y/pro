#!/usr/bin/env node
import { spawn } from 'node:child_process';
import {
  isChildRunning,
  resolveChildExitCode,
  signalToExitCode,
  terminateChildWithEscalation,
} from './wp_child_process_protocol.mjs';
import { buildTsxTestRun } from './wp_test_runner_command.mjs';

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
    if (killTimer) clearTimeout(killTimer);
    killTimer = terminateChildWithEscalation(child, signal, {
      onEscalate(escalationSignal) {
        console.error(
          `[run-tsx-tests] child still running after SIGTERM grace period; escalating to ${escalationSignal}`
        );
      },
    });
    if (!killTimer && !isChildRunning(child)) process.exit(signalToExitCode(signal));
  });
}

child.once('spawn', () => {
  console.error('[run-tsx-tests] ready');
});

child.on('exit', (code, signal) => {
  if (killTimer) clearTimeout(killTimer);
  process.exit(resolveChildExitCode({ code, signal, requestedSignal: forwardedSignal }));
});
