#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import osConstants from 'node:os';
import path from 'node:path';
import { buildTsxTestRun } from './wp_test_runner_command.mjs';

function parseArgs(argv) {
  let batchSize = 1;
  let heartbeatMs = 0;
  let timeoutMs = 0;
  let failedFilesPath = '';
  let timingsPath = '';
  const files = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (
      arg === '--batch-size' ||
      arg === '--heartbeat-ms' ||
      arg === '--timeout-ms' ||
      arg === '--failed-files-path' ||
      arg === '--timings-path'
    ) {
      const raw = argv[index + 1];
      if (!raw) {
        console.error(`Missing value for ${arg}`);
        process.exit(1);
      }
      if (arg === '--failed-files-path') failedFilesPath = raw;
      else if (arg === '--timings-path') timingsPath = raw;
      else {
        const parsed = Number.parseInt(raw, 10);
        if (arg === '--batch-size') batchSize = parsed;
        if (arg === '--heartbeat-ms') heartbeatMs = parsed;
        if (arg === '--timeout-ms') timeoutMs = parsed;
      }
      index += 1;
      continue;
    }
    if (arg.startsWith('--batch-size=')) {
      batchSize = Number.parseInt(arg.slice('--batch-size='.length), 10);
      continue;
    }
    if (arg.startsWith('--heartbeat-ms=')) {
      heartbeatMs = Number.parseInt(arg.slice('--heartbeat-ms='.length), 10);
      continue;
    }
    if (arg.startsWith('--timeout-ms=')) {
      timeoutMs = Number.parseInt(arg.slice('--timeout-ms='.length), 10);
      continue;
    }
    if (arg.startsWith('--failed-files-path=')) {
      failedFilesPath = arg.slice('--failed-files-path='.length);
      continue;
    }
    if (arg.startsWith('--timings-path=')) {
      timingsPath = arg.slice('--timings-path='.length);
      continue;
    }
    files.push(arg);
  }

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    console.error(`Invalid --batch-size value: ${batchSize}`);
    process.exit(1);
  }
  if (!Number.isInteger(heartbeatMs) || heartbeatMs < 0) {
    console.error(`Invalid --heartbeat-ms value: ${heartbeatMs}`);
    process.exit(1);
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0) {
    console.error(`Invalid --timeout-ms value: ${timeoutMs}`);
    process.exit(1);
  }

  return { batchSize, heartbeatMs, timeoutMs, failedFilesPath, timingsPath, files };
}

function chunkFiles(files, batchSize) {
  const batches = [];
  for (let index = 0; index < files.length; index += batchSize) {
    batches.push(files.slice(index, index + batchSize));
  }
  return batches;
}

function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(ms < 10000 ? 1 : 0);
  return `${seconds}s`;
}

function buildRerunCommand(batch) {
  return buildTsxTestRun(process.cwd(), batch).command;
}

function signalToExitCode(signal) {
  if (!signal) return 1;
  const normalized = signal.startsWith('SIG') ? signal : `SIG${signal}`;
  const code = osConstants.constants.signals[normalized];
  return Number.isInteger(code) ? 128 + code : 1;
}

async function clearArtifactFile(filePath) {
  if (!filePath) return;
  await rm(filePath, { force: true });
}

async function writeArtifactFile(filePath, content) {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') await mkdir(dir, { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function persistSummary(timingsPath, summary) {
  if (!timingsPath) return;
  await writeArtifactFile(timingsPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function writeArtifactFileSync(filePath, content) {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function persistSummarySync(timingsPath, summary) {
  if (!timingsPath) return;
  writeArtifactFileSync(timingsPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function cloneSummary(summary) {
  return JSON.parse(JSON.stringify(summary));
}

function buildInterruptedBatch(batch, signal) {
  return {
    files: [...batch],
    signal,
    rerunCommand: buildRerunCommand(batch),
  };
}

function persistActiveBatchArtifactsSync({
  failedFilesPath,
  timingsPath,
  summary,
  batch,
  signal = 'SIGTERM',
}) {
  if (!batch || batch.length === 0) return;
  if (failedFilesPath) writeArtifactFileSync(failedFilesPath, `${batch.join('\n')}\n`);
  if (!timingsPath) return;
  const persistedSummary = cloneSummary(summary);
  persistedSummary.totalDurationMs = Date.now() - runStartedAt;
  persistedSummary.completedBatches = summary.batches.length;
  persistedSummary.interrupted = true;
  persistedSummary.interruptedBySignal = signal;
  const interruptedBatch = buildInterruptedBatch(batch, signal);
  persistedSummary.interruptedBatch = interruptedBatch;
  persistedSummary.batches = [
    ...summary.batches.map(batchSummary => ({ ...batchSummary })),
    {
      index: summary.batches.length + 1,
      files: [...batch],
      durationMs: 0,
      outcome: 'interrupted',
      signal,
      timedOut: false,
      exitCode: signalToExitCode(signal),
      rerunCommand: interruptedBatch.rerunCommand,
    },
  ];
  persistSummarySync(timingsPath, persistedSummary);
}

function summarizeOutcome(code, signal, timedOut, interruptedBySignal) {
  if (timedOut) return 'timed_out';
  if (interruptedBySignal) return 'interrupted';
  if (signal) return 'signaled';
  if (code !== 0) return 'failed';
  return 'passed';
}

function createBatchRunner({ heartbeatMs, timeoutMs }) {
  let activeChild = null;
  let activeChildKillTimer = null;
  let requestedSignal = null;

  function terminateActiveChild(signal) {
    if (!activeChild || activeChild.killed) return false;
    requestedSignal = signal;
    activeChild.kill(signal);
    if (activeChildKillTimer) clearTimeout(activeChildKillTimer);
    activeChildKillTimer = setTimeout(() => {
      if (activeChild && !activeChild.killed) activeChild.kill('SIGKILL');
    }, 2000);
    activeChildKillTimer.unref?.();
    return true;
  }

  async function runBatch(batch, index, totalBatches, totalFiles) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const label = `[serial-tests batch ${index + 1}/${totalBatches}]`;
      const batchRange =
        totalFiles === batch.length
          ? `all ${batch.length} files`
          : `${batch.length} file${batch.length === 1 ? '' : 's'} (${batch[0]}${batch.length > 1 ? ` … ${batch[batch.length - 1]}` : ''})`;
      console.error(`${label} ${batchRange}`);

      const testRun = buildTsxTestRun(process.cwd(), batch);
      const child = spawn(testRun.program, testRun.args, {
        stdio: 'inherit',
        env: process.env,
        ...(testRun.spawnOptions ?? {}),
      });
      activeChild = child;
      requestedSignal = null;

      let heartbeatTimer = null;
      if (heartbeatMs > 0) {
        heartbeatTimer = setInterval(() => {
          const elapsedMs = Date.now() - startedAt;
          console.error(`${label} still running after ${formatMs(elapsedMs)}`);
        }, heartbeatMs);
        heartbeatTimer.unref?.();
      }

      let timeoutTimer = null;
      let timedOut = false;
      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          timedOut = true;
          const elapsedMs = Date.now() - startedAt;
          console.error(`${label} TIMEOUT after ${formatMs(elapsedMs)} — terminating batch`);
          terminateActiveChild('SIGTERM');
        }, timeoutMs);
        timeoutTimer.unref?.();
      }

      const cleanupTimers = () => {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (activeChildKillTimer) clearTimeout(activeChildKillTimer);
        activeChildKillTimer = null;
      };

      child.on('error', error => {
        cleanupTimers();
        activeChild = null;
        reject(error);
      });

      child.on('exit', (code, signal) => {
        cleanupTimers();
        activeChild = null;
        const durationMs = Date.now() - startedAt;
        const effectiveSignal = signal ?? requestedSignal;
        const interruptionSignal = requestedSignal || null;
        const outcome = summarizeOutcome(code, signal, timedOut, interruptionSignal);
        if (requestedSignal) {
          console.error(`${label} interrupted after ${formatMs(durationMs)} (${requestedSignal})`);
        } else if (signal) {
          console.error(`${label} FAILED after ${formatMs(durationMs)} (signal ${signal})`);
        } else if (code !== 0) {
          console.error(`${label} FAILED after ${formatMs(durationMs)}`);
        } else {
          console.error(`${label} ok (${formatMs(durationMs)})`);
        }
        resolve({
          exitCode: signal
            ? signalToExitCode(signal)
            : requestedSignal && code !== 0
              ? signalToExitCode(requestedSignal)
              : (code ?? 1),
          batch,
          durationMs,
          label,
          outcome,
          signal: effectiveSignal ?? null,
          timedOut,
        });
      });
    });
  }

  return { runBatch, terminateActiveChild };
}

const { batchSize, heartbeatMs, timeoutMs, failedFilesPath, timingsPath, files } = parseArgs(
  process.argv.slice(2)
);
if (files.length === 0) {
  console.error(
    'Usage: node tools/wp_serial_tests.mjs [--batch-size N] [--heartbeat-ms N] [--timeout-ms N] [--failed-files-path path] [--timings-path path] <test-file> [more-tests...]'
  );
  process.exit(1);
}

await clearArtifactFile(failedFilesPath);
const batches = chunkFiles(files, batchSize);
const runStartedAt = Date.now();
const summary = {
  generatedAt: new Date().toISOString(),
  node: process.execPath,
  batchSize,
  heartbeatMs,
  timeoutMs,
  totalFiles: files.length,
  totalBatches: batches.length,
  failedFilesPath: failedFilesPath || null,
  batches: [],
  interrupted: false,
  interruptedBySignal: null,
  interruptedBatch: null,
};

const runner = createBatchRunner({ heartbeatMs, timeoutMs });
let activeBatch = null;
let aborting = false;

let abortPromise = null;

async function abortRun(signal) {
  if (aborting) return abortPromise;
  aborting = true;
  abortPromise = (async () => {
    summary.interrupted = true;
    summary.interruptedBySignal = signal;
    summary.totalDurationMs = Date.now() - runStartedAt;
    if (activeBatch) {
      summary.interruptedBatch = buildInterruptedBatch(activeBatch, signal);
    }
    if (activeBatch && failedFilesPath) {
      writeArtifactFileSync(failedFilesPath, `${activeBatch.join('\n')}\n`);
      console.error(`[serial-tests] active batch file list written to ${failedFilesPath}`);
    }
    persistSummarySync(timingsPath, summary);
    const forwarded = runner.terminateActiveChild(signal);
    if (!forwarded) process.exit(signalToExitCode(signal));
  })();
  return abortPromise;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    abortRun(signal).catch(error => {
      console.error('[serial-tests] failed to persist interrupted summary', error);
      process.exit(signalToExitCode(signal));
    });
  });
}

for (let index = 0; index < batches.length; index += 1) {
  activeBatch = batches[index];
  persistActiveBatchArtifactsSync({
    failedFilesPath,
    timingsPath,
    summary,
    batch: activeBatch,
    signal: 'SIGTERM',
  });
  const result = await runner.runBatch(activeBatch, index, batches.length, files.length);
  if (abortPromise) await abortPromise;
  summary.batches.push({
    index: index + 1,
    files: result.batch,
    durationMs: result.durationMs,
    outcome: result.outcome,
    signal: result.signal,
    timedOut: result.timedOut,
    exitCode: result.exitCode,
    rerunCommand: buildRerunCommand(result.batch),
  });
  summary.completedBatches = summary.batches.length;
  summary.totalDurationMs = Date.now() - runStartedAt;
  if (result.outcome === 'interrupted') {
    summary.interrupted = true;
    summary.interruptedBySignal = result.signal;
    summary.interruptedBatch = buildInterruptedBatch(result.batch, result.signal);
    if (failedFilesPath) {
      writeArtifactFileSync(failedFilesPath, `${result.batch.join('\n')}\n`);
      console.error(`${result.label} interrupted batch file list written to ${failedFilesPath}`);
    }
    persistSummarySync(timingsPath, summary);
  } else {
    await persistSummary(timingsPath, summary);
  }
  if (result.exitCode !== 0) {
    if (failedFilesPath && result.outcome !== 'interrupted') {
      await writeArtifactFile(failedFilesPath, `${result.batch.join('\n')}\n`);
      console.error(`${result.label} failing batch file list written to ${failedFilesPath}`);
    }
    console.error(`${result.label} rerun command:`);
    console.error(buildRerunCommand(result.batch));
    process.exit(result.exitCode);
  }
}

summary.totalDurationMs = Date.now() - runStartedAt;
summary.completedBatches = summary.batches.length;
await persistSummary(timingsPath, summary);
await clearArtifactFile(failedFilesPath);
console.error(
  `[serial-tests] completed ${files.length} files in ${formatMs(summary.totalDurationMs)} across ${batches.length} batch${batches.length === 1 ? '' : 'es'}`
);
