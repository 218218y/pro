#!/usr/bin/env node
import {
  resolveChildExitCode,
  signalToExitCode,
  spawnManagedChild,
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

const child = spawnManagedChild(testRun.program, testRun.args, {
  stdio: 'inherit',
  env: process.env,
  ...(testRun.spawnOptions ?? {}),
});

let forwardedSignal = null;
let terminationController = null;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (forwardedSignal) return;
    forwardedSignal = signal;
    terminationController = terminateChildWithEscalation(child, signal, {
      onEscalate(escalationSignal) {
        console.error(
          `[run-tsx-tests] child process tree still running after ${signal} grace period; escalating to ${escalationSignal}`
        );
      },
    });
    if (!terminationController) {
      process.exit(signalToExitCode(signal));
      return;
    }
    void terminationController.completion.then(() => {
      process.exit(signalToExitCode(signal));
    });
  });
}

child.once('spawn', () => {
  console.error('[run-tsx-tests] ready');
});

child.on('exit', (code, signal) => {
  if (forwardedSignal) return;
  process.exit(resolveChildExitCode({ code, signal, requestedSignal: forwardedSignal }));
});
