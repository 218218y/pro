import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { resolveChildExitCode, terminateChildWithEscalation } from '../tools/wp_child_process_protocol.mjs';

const projectRoot = process.cwd();
const serialRunnerPath = path.join(projectRoot, 'tools', 'wp_serial_tests.mjs');
const rerunListPath = path.join(projectRoot, 'tools', 'wp_run_test_file_list.mjs');
const directTsxRunnerPath = path.join(projectRoot, 'tools', 'wp_run_tsx_tests.mjs');

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
  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });

  let stdout = '';
  let stderr = '';
  const stderrWaiters = new Set();

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

  return {
    child,
    completed,
    waitForStderr(pattern, timeoutMs = 5000) {
      if (matchesPattern(pattern, stderr)) return Promise.resolve(stderr);
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
      test('handles signal', async () => {
        await new Promise(() => {});
      });
    `
    );
    const run = runNodeAsync([directTsxRunnerPath, handlesSignal, '--', '--test-isolation=none']);
    await run.waitForStderr(/\[run-tsx-tests\] ready/u);
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
      test('ignores signal', async () => {
        await new Promise(() => {});
      });
    `
    );
    const run = runNodeAsync([directTsxRunnerPath, ignoresSignal, '--', '--test-isolation=none']);
    await run.waitForStderr(/\[run-tsx-tests\] ready/u);
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

test('termination escalation checks live exit state instead of child.killed', async () => {
  const deliveredSignals = [];
  const fakeChild = {
    exitCode: null,
    signalCode: null,
    killed: false,
    kill(signal) {
      this.killed = true;
      deliveredSignals.push(signal);
      return true;
    },
  };

  await new Promise(resolve => {
    terminateChildWithEscalation(fakeChild, 'SIGTERM', {
      graceMs: 0,
      onEscalate: resolve,
    });
  });
  assert.deepEqual(deliveredSignals, ['SIGTERM', 'SIGKILL']);
});

test('runner wrappers keep readiness, live-child, and single-timeout termination contracts', () => {
  const directSource = fs.readFileSync(directTsxRunnerPath, 'utf8');
  const listSource = fs.readFileSync(rerunListPath, 'utf8');
  const serialSource = fs.readFileSync(serialRunnerPath, 'utf8');
  const combined = `${directSource}\n${listSource}\n${serialSource}`;

  assert.match(directSource, /\[run-tsx-tests\] ready/u);
  assert.match(listSource, /\[run-test-file-list\] ready/u);
  assert.match(serialSource, /console\.error\(`\$\{label\} ready`\)/u);
  assert.doesNotMatch(combined, /\.killed\b/u);
  assert.doesNotMatch(combined, /requestedSignal && code !== 0|forwardedSignal && code !== 0/u);
  assert.equal(serialSource.match(/terminateActiveChild\('SIGTERM'\)/gu)?.length, 1);
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
