#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import {
  resolveChildExitCode,
  signalToExitCode,
  spawnManagedChild,
  terminateChildWithEscalation,
} from './wp_child_process_protocol.mjs';
import { buildTsxTestRun } from './wp_test_runner_command.mjs';

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
          `[run-test-file-list] child process tree still running after ${signal} grace period; escalating to ${escalationSignal}`
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
  console.error('[run-test-file-list] ready');
});

child.on('exit', (code, signal) => {
  if (forwardedSignal) return;
  process.exit(resolveChildExitCode({ code, signal, requestedSignal: forwardedSignal }));
});
