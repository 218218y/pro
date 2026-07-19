import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  resolveChildExitCode,
  resolveChildTermination,
  spawnManagedChild,
  terminateChildWithEscalation,
} from '../tools/wp_child_process_protocol.mjs';

const projectRoot = process.cwd();
const serialRunnerPath = path.join(projectRoot, 'tools', 'wp_serial_tests.mjs');
const rerunListPath = path.join(projectRoot, 'tools', 'wp_run_test_file_list.mjs');
const directTsxRunnerPath = path.join(projectRoot, 'tools', 'wp_run_tsx_tests.mjs');
const childRunDiagnostics = new WeakMap();

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wp-serial-tests-'));
}

function writeRuntimeTest(dir, fileName, source) {
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, source, 'utf8');
  return filePath;
}

function runNode(args, options = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    env,
    ...options,
  });
}

function runNodeAsync(args, options = {}) {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const { managed = false, ...spawnOptions } = options;
  const spawnChild = managed ? spawnManagedChild : spawn;
  const child = spawnChild(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...spawnOptions,
  });

  let stdout = '';
  let stderr = '';
  const stderrWaiters = new Set();
  const readinessMarkers = new Set();

  const matchesPattern = (pattern, value) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  };

  const formatReadinessFailure = (label, result) => `${label}
STDERR:
${result.stderr}
STDOUT:
${result.stdout}
CODE: ${result.code}
SIGNAL: ${result.signal}`;

  const flushStderrWaiters = () => {
    for (const waiter of stderrWaiters) {
      if (!matchesPattern(waiter.pattern, stderr)) continue;
      waiter.pattern.lastIndex = 0;
      const marker = waiter.pattern.exec(stderr)?.[0];
      if (marker) readinessMarkers.add(marker);
      clearTimeout(waiter.timer);
      stderrWaiters.delete(waiter);
      waiter.resolve(stderr);
    }
  };

  child.stdout?.on('data', chunk => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
    flushStderrWaiters();
  });

  const exited = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve({ code, signal }));
  });
  const completed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => {
      const result = { code, signal, stdout, stderr };
      for (const waiter of stderrWaiters) {
        clearTimeout(waiter.timer);
        stderrWaiters.delete(waiter);
        waiter.reject(
          new Error(
            formatReadinessFailure(
              waiter.timedOut
                ? `Timed out waiting for stderr marker ${waiter.pattern}`
                : `Child exited before stderr marker ${waiter.pattern}`,
              result
            )
          )
        );
      }
      resolve(result);
    });
  });

  childRunDiagnostics.set(child, {
    snapshot: () => ({
      stdout,
      stderr,
      readinessMarkers: [...readinessMarkers],
    }),
  });

  return {
    child,
    exited,
    completed,
    waitForStderr(pattern, timeoutMs = 5000) {
      if (matchesPattern(pattern, stderr)) {
        pattern.lastIndex = 0;
        const marker = pattern.exec(stderr)?.[0];
        if (marker) readinessMarkers.add(marker);
        return Promise.resolve(stderr);
      }
      return new Promise((resolve, reject) => {
        const waiter = { pattern, resolve, reject, timedOut: false, timer: null };
        waiter.timer = setTimeout(() => {
          waiter.timedOut = true;
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        }, timeoutMs);
        stderrWaiters.add(waiter);
      });
    },
  };
}

function formatIpcSignalFailure(child, signal, error) {
  const diagnostic = childRunDiagnostics.get(child)?.snapshot?.() || {
    stdout: '',
    stderr: '',
    readinessMarkers: [],
  };
  const reason =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error || 'unknown error');
  return new Error(`IPC ${signal} delivery failed: ${reason}
EXIT CODE: ${child.exitCode}
EXIT SIGNAL: ${child.signalCode}
CONNECTED: ${child.connected === true}
READINESS MARKERS: ${JSON.stringify(diagnostic.readinessMarkers)}
STDERR:
${diagnostic.stderr}
STDOUT:
${diagnostic.stdout}`);
}

async function sendIpcSignal(child, signal) {
  if (!child.connected) {
    throw formatIpcSignalFailure(
      child,
      signal,
      new Error('IPC channel closed before the interruption request')
    );
  }

  await new Promise((resolve, reject) => {
    try {
      child.send(signal, error => {
        if (error) reject(formatIpcSignalFailure(child, signal, error));
        else resolve();
      });
    } catch (error) {
      reject(formatIpcSignalFailure(child, signal, error));
    }
  });
}

async function cleanupManagedTestRun(run) {
  const controller = terminateChildWithEscalation(run.child, 'SIGTERM', { graceMs: 500 });
  if (controller) await controller.completion;
  if (run.child.connected) {
    try {
      run.child.disconnect();
    } catch {}
  }
  return await run.completed;
}

function assertInterruptedExitLike(result, message) {
  const interruptedLike =
    result.code === 143 ||
    (process.platform === 'win32' && (result.signal === 'SIGTERM' || result.code === null));
  assert.equal(
    interruptedLike,
    true,
    `${message}
STDERR:
${result.stderr}
STDOUT:
${result.stdout}
CODE: ${result.code}
SIGNAL: ${result.signal}`
  );
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    throw error;
  }
}

async function waitForProcessExit(pid, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isProcessRunning(pid)) return true;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  return !isProcessRunning(pid);
}

test(
  'serial runner success writes timings summary and clears stale failed-file artifact',
  { concurrency: false },
  () => {
    const root = tempDir();
    const passA = writeRuntimeTest(
      root,
      'pass_a.test.js',
      `
    import test from 'node:test';
    test('a', () => {});
  `
    );
    const passB = writeRuntimeTest(
      root,
      'pass_b.test.js',
      `
    import test from 'node:test';
    test('b', () => {});
  `
    );
    const failedFilesPath = path.join(root, 'failed.txt');
    const timingsPath = path.join(root, 'timings.json');
    fs.writeFileSync(failedFilesPath, 'stale\n', 'utf8');

    const result = runNode([
      serialRunnerPath,
      '--batch-size',
      '2',
      '--failed-files-path',
      failedFilesPath,
      '--timings-path',
      timingsPath,
      passA,
      passB,
    ]);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(
      fs.existsSync(failedFilesPath),
      false,
      'success should clear any stale failed-file artifact'
    );
    const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(summary.totalFiles, 2);
    assert.equal(summary.totalBatches, 1);
    assert.equal(summary.completedBatches, 1);
    assert.equal(summary.batches.length, 1);
    assert.equal(summary.batches[0].outcome, 'passed');
  }
);

test('serial runner failure preserves failing batch file list and summary', { concurrency: false }, () => {
  const root = tempDir();
  const pass = writeRuntimeTest(
    root,
    'pass.test.js',
    `
    import test from 'node:test';
    test('pass', () => {});
  `
  );
  const fail = writeRuntimeTest(
    root,
    'fail.test.js',
    `
    import test from 'node:test';
    import assert from 'node:assert/strict';
    test('fail', () => {
      assert.equal(1, 2);
    });
  `
  );
  const failedFilesPath = path.join(root, 'failed.txt');
  const timingsPath = path.join(root, 'timings.json');

  const result = runNode([
    serialRunnerPath,
    '--batch-size',
    '2',
    '--failed-files-path',
    failedFilesPath,
    '--timings-path',
    timingsPath,
    pass,
    fail,
  ]);

  assert.notEqual(
    result.status,
    0,
    `failing batch should produce a non-zero exit\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`
  );
  const failedFiles = fs.readFileSync(failedFilesPath, 'utf8').trim().split(/\r?\n/u);
  assert.deepEqual(failedFiles, [pass, fail]);
  const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
  assert.equal(summary.completedBatches, 1);
  assert.equal(summary.batches[0].outcome, 'failed');
  assert.match(summary.batches[0].rerunCommand, /(?:--import tsx --test|npx --yes tsx --test)/);
});

test(
  'serial runner timeout records timed_out outcome and failing batch artifact',
  { concurrency: false },
  () => {
    const root = tempDir();
    const slow = writeRuntimeTest(
      root,
      'slow.test.js',
      `
    import test from 'node:test';
    test('slow', async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
    });
  `
    );
    const failedFilesPath = path.join(root, 'failed.txt');
    const timingsPath = path.join(root, 'timings.json');

    const result = runNode([
      serialRunnerPath,
      '--timeout-ms',
      '100',
      '--failed-files-path',
      failedFilesPath,
      '--timings-path',
      timingsPath,
      slow,
    ]);

    assert.notEqual(
      result.status,
      0,
      `timed-out batch should not exit cleanly\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`
    );
    assert.equal(fs.readFileSync(failedFilesPath, 'utf8').trim(), slow);
    const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(summary.batches[0].outcome, 'timed_out');
    assert.equal(summary.batches[0].timedOut, true);
    assert.equal(summary.interrupted, false);
    assert.equal(summary.interruptedBySignal, null);
    assert.equal(summary.batches[0].requestedSignal, null);
    assert.equal(summary.batches[0].terminationRequestedSignal, 'SIGTERM');
  }
);

test('run-test-file-list reruns listed tests from a saved file batch', { concurrency: false }, () => {
  const root = tempDir();
  const pass = writeRuntimeTest(
    root,
    'pass.test.js',
    `
    import test from 'node:test';
    test('pass', () => {});
  `
  );
  const listPath = path.join(root, 'files.txt');
  fs.writeFileSync(listPath, `${pass}\n`, 'utf8');

  const result = runNode([rerunListPath, listPath]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, /running 1 file/);
});

test(
  'run-tsx-tests resolves the shared runner command and executes listed files',
  { concurrency: false },
  () => {
    const root = tempDir();
    const pass = writeRuntimeTest(
      root,
      'pass.test.js',
      `
    import test from 'node:test';
    test('pass', () => {});
  `
    );

    const result = runNode([directTsxRunnerPath, pass], {
      env: {
        ...process.env,
        WP_TEST_RUNNER_FORCE_NPX: '1',
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stderr, /run-tsx-tests/);
    assert.match(result.stderr, /npx --yes tsx --test/);
  }
);

test('run-tsx-tests returns signal exit code when interrupted', { concurrency: false }, async () => {
  const root = tempDir();
  const slow = writeRuntimeTest(
    root,
    'slow.test.js',
    `
    import test from 'node:test';
    test('slow', async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
    });
  `
  );

  const run = runNodeAsync([directTsxRunnerPath, slow]);
  await run.waitForStderr(/\[run-tsx-tests\] ready/u);
  run.child.kill('SIGTERM');
  const result = await run.completed;

  assertInterruptedExitLike(
    result,
    'interrupted direct tsx runner should exit with an interrupted-process outcome'
  );
  assert.match(result.stderr, /run-tsx-tests/);
});

test('readiness wait kills a stuck child and reports complete stdout/stderr diagnostics', async () => {
  const run = runNodeAsync([
    '-e',
    `console.log('readiness stdout'); console.error('readiness stderr'); setInterval(() => {}, 1000);`,
  ]);
  await run.waitForStderr(/readiness stderr/u);
  await assert.rejects(
    run.waitForStderr(/never-ready/u, 50),
    error =>
      error instanceof Error &&
      /Timed out waiting for stderr marker/u.test(error.message) &&
      /readiness stderr/u.test(error.message) &&
      /readiness stdout/u.test(error.message)
  );
  const result = await run.completed;
  assert.equal(result.signal, 'SIGKILL');
});

test(
  'run-tsx-tests preserves interruption when the child handles SIGTERM and exits zero',
  {
    skip:
      process.platform === 'win32'
        ? 'Windows terminates child processes instead of delivering SIGTERM'
        : false,
  },
  async () => {
    const root = tempDir();
    const handlesSignal = writeRuntimeTest(
      root,
      'handles_signal.test.js',
      `
      import test from 'node:test';
      process.on('SIGTERM', () => process.exit(0));
      console.error('[fixture] signal-handler-ready:exit-zero');
      test('handles signal', async () => {
        await new Promise(() => {});
      });
    `
    );
    const run = runNodeAsync([directTsxRunnerPath, handlesSignal, '--', '--test-isolation=none']);
    await run.waitForStderr(/\[run-tsx-tests\] ready/u);
    await run.waitForStderr(/\[fixture\] signal-handler-ready:exit-zero/u);
    run.child.kill('SIGTERM');
    const result = await run.completed;

    assertInterruptedExitLike(result, 'a forwarded SIGTERM must win over a child exit code of zero');
    assert.equal(result.code, 143, result.stderr || result.stdout);
  }
);

test(
  'run-tsx-tests escalates to SIGKILL when the child ignores SIGTERM',
  {
    skip:
      process.platform === 'win32'
        ? 'Windows terminates child processes instead of delivering SIGTERM'
        : false,
  },
  async () => {
    const root = tempDir();
    const ignoresSignal = writeRuntimeTest(
      root,
      'ignores_signal.test.js',
      `
      import test from 'node:test';
      process.on('SIGTERM', () => console.error('[fixture] ignored SIGTERM'));
      console.error('[fixture] signal-handler-ready:ignore');
      test('ignores signal', async () => {
        await new Promise(() => {});
      });
    `
    );
    const run = runNodeAsync([directTsxRunnerPath, ignoresSignal, '--', '--test-isolation=none']);
    await run.waitForStderr(/\[run-tsx-tests\] ready/u);
    await run.waitForStderr(/\[fixture\] signal-handler-ready:ignore/u);
    run.child.kill('SIGTERM');
    const result = await run.completed;

    assertInterruptedExitLike(result, 'an ignored SIGTERM must be escalated and remain interrupted');
    assert.equal(result.code, 143, result.stderr || result.stdout);
    assert.match(result.stderr, /\[fixture\] ignored SIGTERM/u);
    assert.match(result.stderr, /escalating to SIGKILL/u);
  }
);

test('interruption exit resolution gives the requested signal priority over child exit zero', () => {
  assert.equal(resolveChildExitCode({ code: 0, signal: null, requestedSignal: 'SIGTERM' }), 143);
});

test('termination mapping preserves requested SIGTERM separately from child SIGKILL', () => {
  assert.deepEqual(resolveChildTermination({ code: null, signal: 'SIGKILL', requestedSignal: 'SIGTERM' }), {
    requestedSignal: 'SIGTERM',
    childExitSignal: 'SIGKILL',
    exitCode: 143,
  });
});

test('termination escalation checks live exit state instead of child.killed', async () => {
  const deliveredSignals = [];
  const fakeChild = {
    exitCode: null,
    signalCode: null,
    killed: false,
    kill(signal) {
      this.killed = true;
      deliveredSignals.push(signal);
      if (signal === 'SIGKILL') this.signalCode = signal;
      return true;
    },
  };

  const controller = terminateChildWithEscalation(fakeChild, 'SIGTERM', {
    graceMs: 0,
  });
  assert.ok(controller);
  const termination = await controller.completion;
  assert.deepEqual(deliveredSignals, ['SIGTERM', 'SIGKILL']);
  assert.deepEqual(termination, {
    requestedSignal: 'SIGTERM',
    escalationSignal: 'SIGKILL',
    cancelled: false,
  });
});

test('termination escalation follows the managed tree after its process-group leader exits', async () => {
  const deliveredSignals = [];
  let processTreeRunning = true;
  const fakeGroupLeader = {
    exitCode: null,
    signalCode: null,
  };

  const controller = terminateChildWithEscalation(fakeGroupLeader, 'SIGTERM', {
    graceMs: 0,
    isTreeRunning: () => processTreeRunning,
    signalTree: (_child, signal) => {
      deliveredSignals.push(signal);
      if (signal === 'SIGTERM') fakeGroupLeader.signalCode = 'SIGTERM';
      if (signal === 'SIGKILL') processTreeRunning = false;
    },
  });
  assert.ok(controller);
  const termination = await controller.completion;

  assert.deepEqual(deliveredSignals, ['SIGTERM', 'SIGKILL']);
  assert.deepEqual(termination, {
    requestedSignal: 'SIGTERM',
    escalationSignal: 'SIGKILL',
    cancelled: false,
  });
});

test('runner wrappers keep readiness, live-child, and single-timeout termination contracts', () => {
  const directSource = fs.readFileSync(directTsxRunnerPath, 'utf8');
  const listSource = fs.readFileSync(rerunListPath, 'utf8');
  const serialSource = fs.readFileSync(serialRunnerPath, 'utf8');
  const combined = `${directSource}\n${listSource}\n${serialSource}`;

  assert.match(directSource, /\[run-tsx-tests\] ready/u);
  assert.match(listSource, /\[run-test-file-list\] ready/u);
  assert.match(serialSource, /console\.error\(`\$\{label\} ready`\)/u);
  assert.match(directSource, /spawnManagedChild\(/u);
  assert.match(listSource, /spawnManagedChild\(/u);
  assert.match(serialSource, /spawnManagedChild\(/u);
  assert.doesNotMatch(combined, /\.killed\b/u);
  assert.doesNotMatch(combined, /requestedSignal && code !== 0|forwardedSignal && code !== 0/u);
  assert.match(directSource, /after \$\{signal\} grace period/u);
  assert.match(listSource, /after \$\{signal\} grace period/u);
  assert.doesNotMatch(`${directSource}\n${listSource}`, /after SIGTERM grace period/u);
  assert.equal(serialSource.match(/terminateActiveChild\('SIGTERM'\)/gu)?.length, 1);
});

test('direct and file-list runner wrappers preserve requested SIGINT diagnostics and exit code', async t => {
  const root = tempDir();
  const handlesSignal = writeRuntimeTest(
    root,
    'handles_sigint.test.js',
    `
      import test from 'node:test';
      process.on('SIGINT', () => process.exit(0));
      console.error('[fixture] signal-handler-ready:sigint');
      test('handles SIGINT', async () => {
        await new Promise(() => {});
      });
    `
  );
  const listPath = path.join(root, 'sigint-files.txt');
  fs.writeFileSync(listPath, `${handlesSignal}\n`, 'utf8');

  for (const runner of [
    {
      label: 'run-tsx-tests',
      modulePath: directTsxRunnerPath,
      args: [handlesSignal, '--', '--test-isolation=none'],
    },
    {
      label: 'run-test-file-list',
      modulePath: rerunListPath,
      args: [listPath, '--', '--test-isolation=none'],
    },
  ]) {
    await t.test(runner.label, async () => {
      const signalHost = writeRuntimeTest(
        root,
        `${runner.label}_sigint_host.mjs`,
        `
          process.argv = [process.execPath, ${JSON.stringify(runner.modulePath)}, ...process.argv.slice(2)];
          process.on('message', message => {
            if (message === 'SIGINT') process.emit('SIGINT');
          });
          await import(${JSON.stringify(pathToFileURL(runner.modulePath).href)});
        `
      );
      const run = runNodeAsync([signalHost, ...runner.args], {
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      await run.waitForStderr(new RegExp(`\\[${runner.label}\\] ready`, 'u'));
      await run.waitForStderr(/\[fixture\] signal-handler-ready:sigint/u);
      run.child.send('SIGINT');
      const result = await run.completed;

      assert.equal(result.code, 130, result.stderr || result.stdout);
      assert.match(result.stderr, /signal-handler-ready:sigint/u);
    });
  }
});

test(
  'serial runner can force npx tsx fallback when local tsx is unavailable or intentionally bypassed',
  { concurrency: false },
  () => {
    const root = tempDir();
    const pass = writeRuntimeTest(
      root,
      'pass.test.js',
      `
    import test from 'node:test';
    test('pass', () => {});
  `
    );
    const timingsPath = path.join(root, 'timings.json');

    const result = runNode([serialRunnerPath, '--timings-path', timingsPath, pass], {
      env: {
        ...process.env,
        WP_TEST_RUNNER_FORCE_NPX: '1',
      },
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(summary.batches[0].outcome, 'passed');
    assert.match(summary.batches[0].rerunCommand, /npx --yes tsx --test/);
  }
);

test('safe IPC signal delivery reports closed-channel exit and readiness diagnostics', async () => {
  const child = {
    connected: false,
    exitCode: 97,
    signalCode: null,
  };
  childRunDiagnostics.set(child, {
    snapshot: () => ({
      stdout: 'wrapper stdout',
      stderr: '[serial-tests batch 1/1] ready\n[fixture] npx-signal-handler-ready:4321',
      readinessMarkers: ['[serial-tests batch 1/1] ready', '[fixture] npx-signal-handler-ready:4321'],
    }),
  });

  await assert.rejects(
    () => sendIpcSignal(child, 'SIGTERM'),
    error => {
      assert.match(error.message, /IPC channel closed before the interruption request/u);
      assert.match(error.message, /EXIT CODE: 97/u);
      assert.match(error.message, /EXIT SIGNAL: null/u);
      assert.match(error.message, /CONNECTED: false/u);
      assert.match(error.message, /npx-signal-handler-ready:4321/u);
      assert.match(error.message, /wrapper stdout/u);
      return true;
    }
  );
});

test('serial npx fallback interruption leaves no active test process or active summary', async () => {
  const root = tempDir();
  const probePath = path.join(root, 'npx-probe.txt');
  const failedFilesPath = path.join(root, 'failed.txt');
  const timingsPath = path.join(root, 'timings.json');
  const probe = writeRuntimeTest(
    root,
    'npx_interrupt_probe.test.js',
    `
      import test from 'node:test';
      import fs from 'node:fs';
      const probePath = process.env.WP_NPX_SIGNAL_PROBE_PATH;
      if (!probePath) throw new Error('missing npx signal probe path');
      process.on('SIGTERM', () => {
        fs.appendFileSync(probePath, 'handled\\n', 'utf8');
        process.exit(0);
      });
      fs.writeFileSync(probePath, String(process.pid) + ':ready\\n', 'utf8');
      console.error('[fixture] npx-signal-handler-ready:' + process.pid);
      test('npx interruption probe', async () => {
        await new Promise(() => {});
      });
    `
  );
  const signalHost = writeRuntimeTest(
    root,
    'serial_signal_host.mjs',
    `
      process.argv = [process.execPath, ${JSON.stringify(serialRunnerPath)}, ...process.argv.slice(2)];
      process.on('message', message => {
        if (message === 'SIGTERM' || message === 'SIGINT') process.emit(message);
      });
      await import(${JSON.stringify(pathToFileURL(serialRunnerPath).href)});
    `
  );
  const env = {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--test-isolation=none'].filter(Boolean).join(' '),
    WP_NPX_SIGNAL_PROBE_PATH: probePath,
    WP_TEST_RUNNER_FORCE_NPX: '1',
  };
  delete env.NODE_TEST_CONTEXT;
  const run = runNodeAsync(
    [signalHost, '--failed-files-path', failedFilesPath, '--timings-path', timingsPath, probe],
    { env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'], managed: true }
  );

  let pid = null;
  try {
    await run.waitForStderr(/\[serial-tests batch 1\/1\] ready/u);
    const readyOutput = await run.waitForStderr(/\[fixture\] npx-signal-handler-ready:\d+/u);
    pid = Number(/npx-signal-handler-ready:(\d+)/u.exec(readyOutput)?.[1]);
    assert.equal(Number.isInteger(pid) && pid > 0, true, readyOutput);
    await sendIpcSignal(run.child, 'SIGTERM');
    const exitResult = await run.exited;
    assertInterruptedExitLike(
      { ...exitResult, stdout: '', stderr: '' },
      'interrupted npx fallback should preserve wrapper interruption'
    );

    const exited = await waitForProcessExit(pid);
    if (!exited) throw new Error(`npx fallback left test process ${pid} running`);
    await run.completed;
    const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(summary.completedBatches, 1);
    assert.equal(summary.batches.length, 1);
    assert.equal(summary.batches[0].outcome, 'interrupted');
    assert.equal(summary.batches[0].requestedSignal, 'SIGTERM');
    assert.ok(summary.batches[0].durationMs > 0, 'final summary must replace the active recovery snapshot');
  } finally {
    const result = await cleanupManagedTestRun(run);
    if (Number.isInteger(pid) && pid > 0 && !(await waitForProcessExit(pid))) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {}
      assert.fail(`npx fallback cleanup left test process ${pid} running\n${result.stderr}`);
    }
  }
});

test(
  'serial runner interrupt writes interrupted batch summary and returns signal exit code',
  { concurrency: false },
  async () => {
    const root = tempDir();
    const slow = writeRuntimeTest(
      root,
      'slow.test.js',
      `
    import test from 'node:test';
    test('slow', async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
    });
  `
    );
    const failedFilesPath = path.join(root, 'failed.txt');
    const timingsPath = path.join(root, 'timings.json');

    const run = runNodeAsync([
      serialRunnerPath,
      '--heartbeat-ms',
      '50',
      '--failed-files-path',
      failedFilesPath,
      '--timings-path',
      timingsPath,
      slow,
    ]);

    await run.waitForStderr(/\[serial-tests batch 1\/1\] ready/u);
    assert.equal(fs.readFileSync(failedFilesPath, 'utf8').trim(), slow);
    const activeSummary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(activeSummary.interrupted, true);
    assert.deepEqual(activeSummary.interruptedBatch.files, [slow]);
    run.child.kill('SIGTERM');
    const result = await run.completed;

    assertInterruptedExitLike(result, 'interrupted run should exit with an interrupted-process outcome');
    assert.equal(fs.readFileSync(failedFilesPath, 'utf8').trim(), slow);
    const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(summary.interrupted, true);
    assert.equal(summary.interruptedBySignal, 'SIGTERM');
    assert.deepEqual(summary.interruptedBatch.files, [slow]);
    assert.equal(summary.interruptedBatch.signal, 'SIGTERM');
    assert.match(summary.interruptedBatch.rerunCommand, /(?:--import tsx --test|npx --yes tsx --test)/);
    assert.equal(summary.batches[0].outcome, 'interrupted');
    assert.equal(summary.batches[0].exitCode, 143);
    assert.equal(summary.batches[0].requestedSignal, 'SIGTERM');
    assert.equal(summary.batches[0].terminationRequestedSignal, 'SIGTERM');
    assert.equal(summary.interruptedBatch.childExitSignal, summary.batches[0].childExitSignal);
  }
);

test(
  'serial escalation preserves requested SIGTERM and records child SIGKILL',
  {
    skip:
      process.platform === 'win32'
        ? 'Windows terminates child processes instead of delivering catchable SIGTERM'
        : false,
  },
  async () => {
    const root = tempDir();
    const failedFilesPath = path.join(root, 'failed.txt');
    const timingsPath = path.join(root, 'timings.json');
    const ignoresSignal = writeRuntimeTest(
      root,
      'serial_ignores_signal.test.js',
      `
        import test from 'node:test';
        process.on('SIGTERM', () => console.error('[fixture] serial ignored SIGTERM'));
        console.error('[fixture] signal-handler-ready:serial-ignore');
        setTimeout(() => process.exit(97), 10000);
        test('serial ignores signal', async () => {
          await new Promise(() => {});
        });
      `
    );
    const env = {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, '--test-isolation=none'].filter(Boolean).join(' '),
    };
    delete env.NODE_TEST_CONTEXT;
    const run = runNodeAsync(
      [
        serialRunnerPath,
        '--failed-files-path',
        failedFilesPath,
        '--timings-path',
        timingsPath,
        ignoresSignal,
      ],
      { env }
    );

    await run.waitForStderr(/\[serial-tests batch 1\/1\] ready/u);
    await run.waitForStderr(/\[fixture\] signal-handler-ready:serial-ignore/u);
    run.child.kill('SIGTERM');
    const result = await run.completed;
    assert.equal(result.code, 143, result.stderr || result.stdout);
    assert.match(result.stderr, /escalating to SIGKILL/u);

    const summary = JSON.parse(fs.readFileSync(timingsPath, 'utf8'));
    assert.equal(summary.interrupted, true);
    assert.equal(summary.interruptedBySignal, 'SIGTERM');
    assert.equal(summary.interruptedBatch.signal, 'SIGTERM');
    assert.equal(summary.interruptedBatch.childExitSignal, 'SIGKILL');
    assert.equal(summary.batches[0].outcome, 'interrupted');
    assert.equal(summary.batches[0].requestedSignal, 'SIGTERM');
    assert.equal(summary.batches[0].childExitSignal, 'SIGKILL');
    assert.equal(summary.batches[0].exitCode, 143);
  }
);

test('run-test-file-list returns signal exit code when interrupted', { concurrency: false }, async () => {
  const root = tempDir();
  const slow = writeRuntimeTest(
    root,
    'slow.test.js',
    `
    import test from 'node:test';
    test('slow', async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
    });
  `
  );
  const listPath = path.join(root, 'files.txt');
  fs.writeFileSync(
    listPath,
    `${slow}
`,
    'utf8'
  );

  const run = runNodeAsync([rerunListPath, listPath]);
  await run.waitForStderr(/\[run-test-file-list\] ready/u);
  run.child.kill('SIGTERM');
  const result = await run.completed;

  assertInterruptedExitLike(
    result,
    'interrupted rerun helper should exit with an interrupted-process outcome'
  );
  assert.match(result.stderr, /running 1 file/);
});
