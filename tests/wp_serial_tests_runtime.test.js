import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

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
  child.stdout?.on('data', chunk => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', chunk => {
    stderr += chunk.toString();
  });

  return {
    child,
    completed: new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (code, signal) => {
        resolve({ code, signal, stdout, stderr });
      });
    }),
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
  await new Promise(resolve => setTimeout(resolve, 200));
  run.child.kill('SIGTERM');
  const result = await run.completed;

  assertInterruptedExitLike(
    result,
    'interrupted direct tsx runner should exit with an interrupted-process outcome'
  );
  assert.match(result.stderr, /run-tsx-tests/);
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

    await new Promise(resolve => setTimeout(resolve, 200));
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
  await new Promise(resolve => setTimeout(resolve, 200));
  run.child.kill('SIGTERM');
  const result = await run.completed;

  assertInterruptedExitLike(
    result,
    'interrupted rerun helper should exit with an interrupted-process outcome'
  );
  assert.match(result.stderr, /running 1 file/);
});
