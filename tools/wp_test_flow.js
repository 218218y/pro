import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { writeNodeTestOutput } from './wp_test_console.js';
import { fileExists, getNodeArgs } from './wp_test_shared.js';
import {
  createNoTestsMessage,
  createRunBanner,
  createSkippedE2ENotice,
  createTestRunFlags,
  selectRunnableTests,
} from './wp_test_state.js';

const REPORT_DIR = path.join('.artifacts', 'test-report');
const MAX_BUFFER = 50 * 1024 * 1024;
const MAX_JUNIT_OUTPUT = 12000;
const MAX_INLINE_NAMES = 12;

const DEFAULT_BATCH_SIZE = 96;
const DEFAULT_MAX_JOBS = 6;

function parsePositiveInt(value) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function availableParallelism() {
  const value = typeof os.availableParallelism === 'function' ? os.availableParallelism() : os.cpus().length;
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function resolveBatchSize(flags, childEnv) {
  return flags.batchSize || parsePositiveInt(childEnv?.WP_TEST_BATCH_SIZE) || DEFAULT_BATCH_SIZE;
}

function resolveTestJobs(flags, childEnv) {
  const configured = flags.jobs || parsePositiveInt(childEnv?.WP_TEST_JOBS);
  if (configured) return configured;
  const available = availableParallelism();
  return Math.max(1, Math.min(DEFAULT_MAX_JOBS, available > 1 ? available - 1 : 1));
}

function chunkFiles(files, batchSize) {
  const batches = [];
  for (let index = 0; index < files.length; index += batchSize) {
    batches.push(files.slice(index, index + batchSize));
  }
  return batches;
}

function createBatchLabel({ batch, index, total, projectRoot }) {
  const relFiles = batch.map(filePath => normalizeSlash(path.relative(projectRoot, filePath)));
  const range =
    relFiles.length === 1
      ? relFiles[0]
      : `${relFiles[0]} … ${relFiles[relFiles.length - 1]} (${relFiles.length} files)`;
  return `[WardrobePro] test batch ${index + 1}/${total}: ${range}`;
}

function createBatchFailureFileLabel({ batch, index, projectRoot }) {
  const relFiles = batch.map(filePath => normalizeSlash(path.relative(projectRoot, filePath)));
  if (relFiles.length === 1) return relFiles[0];
  return `batch ${index + 1}: ${relFiles[0]} … ${relFiles[relFiles.length - 1]} (${relFiles.length} files)`;
}

function defaultRunOne({ filePath, nodeArgs: nodeArgList, cwd, env }) {
  return spawnSync(process.execPath, [...nodeArgList, filePath], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
  });
}

function defaultRunBatch({ batch, nodeArgs: nodeArgList, cwd, env, jobs }) {
  return spawnSync(process.execPath, [...nodeArgList, '--test', `--test-concurrency=${jobs}`, ...batch], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd,
    env,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
  });
}

function writeCapturedTestOutput(res) {
  if (typeof res?.stdout === 'string' && res.stdout.length) writeNodeTestOutput(process.stdout, res.stdout);
  if (typeof res?.stderr === 'string' && res.stderr.length) writeNodeTestOutput(process.stderr, res.stderr);
  if (res?.error) console.error(res.error);
}

function createFailureFromResult({ file, res }) {
  const status = typeof res?.status === 'number' ? res.status : 1;
  const output = capturedOutput(res);
  const failedTests = extractFailedTestNames(output);
  return { file, status, signal: res?.signal || null, failedTests, output };
}

function reportFailureToConsole(failure) {
  console.error(`[WardrobePro] Test failed: ${failure.file}`);
  for (const name of failure.failedTests.slice(0, MAX_INLINE_NAMES))
    console.error(`[WardrobePro]   - ${name}`);
  if (failure.failedTests.length > MAX_INLINE_NAMES) {
    console.error(
      `[WardrobePro]   - ... +${failure.failedTests.length - MAX_INLINE_NAMES} more failed tests`
    );
  }
}

function runSingleFile({ filePath, nodeArgs, projectRoot, childEnv, runOne }) {
  const rel = normalizeSlash(path.relative(projectRoot, filePath));
  const res = runOne({ filePath, nodeArgs, cwd: projectRoot, env: childEnv });
  writeCapturedTestOutput(res);
  const status = typeof res?.status === 'number' ? res.status : 1;
  if (status === 0 && !res?.error) return null;
  const failure = createFailureFromResult({ file: rel, res });
  reportFailureToConsole(failure);
  return failure;
}

function normalizeSlash(value) {
  return value.split(path.sep).join('/');
}

function reportRoot(projectRoot, childEnv) {
  const configured =
    typeof childEnv?.WP_TEST_REPORT_DIR === 'string' ? childEnv.WP_TEST_REPORT_DIR.trim() : '';
  return path.resolve(projectRoot, configured || REPORT_DIR);
}

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'test-failure';
}

function stripAnsi(value) {
  return String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '');
}

function xml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mdCell(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

export function extractFailedTestNames(output) {
  const names = [];
  const seen = new Set();
  for (const line of stripAnsi(output).split(/\r?\n/)) {
    const match =
      line.match(/^\s*(?:#\s*)?not ok\s+\d+(?:\s+-\s+|\s+)(.+?)\s*$/i) ||
      line.match(/^\s*(?:✖|×|✗)\s+(.+?)\s*$/u);
    if (!match) continue;
    const name = match[1]
      .replace(/\s+#\s+time=\d+(?:\.\d+)?ms\s*$/i, '')
      .replace(/\s+\(\d+(?:\.\d+)?ms\)\s*$/i, '')
      .trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function capturedOutput(res) {
  const parts = [];
  if (res?.stdout) parts.push(String(res.stdout));
  if (res?.stderr) parts.push(String(res.stderr));
  if (res?.error) parts.push(`[process error]\n${res.error.stack || res.error.message || String(res.error)}`);
  return parts.join(parts.length > 1 ? '\n' : '');
}

function junitOutput(output) {
  const text = String(output ?? '');
  if (text.length <= MAX_JUNIT_OUTPUT) return text;
  return `${text.slice(0, MAX_JUNIT_OUTPUT)}\n\n[WardrobePro] Output truncated in JUnit. Open the full log under .artifacts/test-report/logs.`;
}

function createMarkdownReport({ failures, totalFiles }) {
  const lines = [
    '# WardrobePro test failure report',
    '',
    `Failed test files: **${failures.length}** / ${totalFiles}`,
    '',
    '| Test file | Exit | Failed tests parsed from output | Full log |',
    '| --- | ---: | --- | --- |',
  ];

  for (const failure of failures) {
    const names = failure.failedTests.length
      ? failure.failedTests.slice(0, MAX_INLINE_NAMES).join('<br>') +
        (failure.failedTests.length > MAX_INLINE_NAMES
          ? `<br>… +${failure.failedTests.length - MAX_INLINE_NAMES} more`
          : '')
      : '_No individual test name was parsed; open the log for the exact assertion output._';
    lines.push(
      `| \`${mdCell(failure.file)}\` | ${failure.status} | ${mdCell(names)} | \`${mdCell(failure.logFile)}\` |`
    );
  }

  lines.push('', '## Details');
  for (const failure of failures) {
    lines.push('', `### ${failure.file}`, '', `Full output: \`${failure.logFile}\``);
    if (failure.failedTests.length) {
      lines.push('', 'Failed tests:');
      for (const name of failure.failedTests) lines.push(`- ${name}`);
    }
  }
  lines.push('', '_Generated by `tools/wp_test.js`._', '');
  return lines.join('\n');
}

function createJunitReport(failures) {
  const cases = [];
  for (const failure of failures) {
    const names = failure.failedTests.length ? failure.failedTests : [`${failure.file} failed`];
    for (const name of names) cases.push({ ...failure, name });
  }

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuites name="WardrobePro tests" tests="${cases.length}" failures="${cases.length}">`,
    `  <testsuite name="WardrobePro failed tests" tests="${cases.length}" failures="${cases.length}">`,
  ];
  for (const testCase of cases) {
    const message = `${testCase.file} exited with status ${testCase.status}`;
    lines.push(
      `    <testcase classname="${xml(testCase.file)}" name="${xml(testCase.name)}" file="${xml(testCase.file)}">`
    );
    lines.push(`      <failure message="${xml(message)}">${xml(junitOutput(testCase.output))}</failure>`);
    lines.push('    </testcase>');
  }
  lines.push('  </testsuite>', '</testsuites>', '');
  return lines.join('\n');
}

function writeFailureReport({ projectRoot, childEnv, failures, totalFiles }) {
  if (!failures.length) return null;

  const root = reportRoot(projectRoot, childEnv);
  const logsDir = path.join(root, 'logs');
  const junitDir = path.join(root, 'junit');
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(junitDir, { recursive: true });

  const normalized = failures.map(failure => {
    const absoluteLogPath = path.join(logsDir, `${safeName(failure.file)}.log`);
    const logFile = normalizeSlash(path.relative(projectRoot, absoluteLogPath));
    fs.writeFileSync(absoluteLogPath, failure.output || '(no stdout/stderr captured)\n', 'utf8');
    return { ...failure, logFile };
  });

  const markdownPath = path.join(root, 'failed-tests.md');
  const junitPath = path.join(junitDir, 'wp-tests.xml');
  const jsonPath = path.join(root, 'failure-summary.json');
  const summary = {
    generatedAt: new Date().toISOString(),
    totalFiles,
    failedFiles: normalized.map(({ file, status, signal, failedTests, logFile }) => ({
      file,
      status,
      signal: signal || null,
      failedTests,
      logFile,
    })),
  };

  fs.writeFileSync(markdownPath, createMarkdownReport({ failures: normalized, totalFiles }), 'utf8');
  fs.writeFileSync(junitPath, createJunitReport(normalized), 'utf8');
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.error(
    `[WardrobePro] Test failure report written to ${normalizeSlash(path.relative(projectRoot, markdownPath))}`
  );
  console.error(
    `[WardrobePro] JUnit failure report written to ${normalizeSlash(path.relative(projectRoot, junitPath))}`
  );

  return { reportDir: root, markdownPath, junitPath, jsonPath, failures: normalized };
}

export function ensureDistBuilt({ projectRoot, childEnv, noBuild, runners = {} }) {
  const entry = path.join(projectRoot, 'dist', 'esm', 'main.js');
  if (fileExists(entry)) return { built: false };

  if (noBuild) {
    throw new Error('[WardrobePro] tests: dist is missing. Build first: npm run build:dist');
  }

  const runCmd =
    runners.runCmd ||
    function runCmd({ args, cwd, env }) {
      return spawnSync(process.execPath, args, {
        stdio: 'inherit',
        cwd,
        env,
      });
    };

  console.log('[WardrobePro] tests: dist is missing; building (no assets)...');
  const res = runCmd({
    args: ['tools/wp_build_dist.js', '--no-assets'],
    cwd: projectRoot,
    env: childEnv,
  });
  if ((res?.status ?? 0) !== 0) {
    throw new Error(`[WardrobePro] build dist failed with status ${res?.status || 1}`);
  }
  return { built: true };
}

export function runTestFlow({ projectRoot, childEnv, flags, runners = {} }) {
  ensureDistBuilt({
    projectRoot,
    childEnv,
    noBuild: flags.noBuild,
    runners,
  });

  const selected = selectRunnableTests({
    projectRoot,
    pattern: flags.pattern,
    shard: flags.shard,
  });

  if (!selected.files.length) {
    return {
      ok: true,
      files: [],
      skippedE2E: selected.skippedE2E,
      message: createNoTestsMessage({
        skippedE2E: selected.skippedE2E,
        shard: flags.shard,
        totalRunnableFiles: selected.totalRunnableFiles,
      }),
      note: '',
      failures: [],
      report: null,
    };
  }

  const nodeArgs = getNodeArgs({
    projectRoot,
    forceTsx: flags.forceTsx,
  });
  const batchSize = resolveBatchSize(flags, childEnv);
  const jobs = resolveTestJobs(flags, childEnv);
  const effectiveFlags = { ...flags, batchSize, jobs };
  const runFlags = createTestRunFlags(effectiveFlags);
  const notice = createSkippedE2ENotice(selected.skippedE2E);
  const runOne = runners.runOne || defaultRunOne;
  const runBatch = runners.runBatch || defaultRunBatch;
  const useSerial = flags.serial || Boolean(runners.runOne) || selected.files.length <= 1;

  console.log(
    createRunBanner({ files: selected.files, flags: runFlags, totalFiles: selected.totalRunnableFiles })
  );
  if (notice) console.log(notice);

  const failures = [];
  if (useSerial) {
    for (const filePath of selected.files) {
      const failure = runSingleFile({ filePath, nodeArgs, projectRoot, childEnv, runOne });
      if (failure) failures.push(failure);
    }
  } else {
    const batches = chunkFiles(selected.files, batchSize);
    for (let index = 0; index < batches.length; index += 1) {
      const batch = batches[index];
      console.log(`${createBatchLabel({ batch, index, total: batches.length, projectRoot })} (jobs ${jobs})`);
      const res = runBatch({ batch, nodeArgs, cwd: projectRoot, env: childEnv, jobs });
      writeCapturedTestOutput(res);
      const status = typeof res?.status === 'number' ? res.status : 1;
      if (status === 0 && !res?.error) continue;

      console.error('[WardrobePro] Batch failed; rerunning that batch file-by-file to isolate failures...');
      const beforeFallbackFailures = failures.length;
      for (const filePath of batch) {
        const failure = runSingleFile({ filePath, nodeArgs, projectRoot, childEnv, runOne });
        if (failure) failures.push(failure);
      }
      if (failures.length === beforeFallbackFailures) {
        const failure = createFailureFromResult({
          file: createBatchFailureFileLabel({ batch, index, projectRoot }),
          res,
        });
        reportFailureToConsole(failure);
        failures.push(failure);
      }
    }
  }

  const report = writeFailureReport({
    projectRoot,
    childEnv,
    failures,
    totalFiles: selected.files.length,
  });

  return {
    ok: failures.length === 0,
    fail: failures.length,
    failures: report?.failures || failures,
    report,
    files: selected.files,
    skippedE2E: selected.skippedE2E,
    banner: createRunBanner({
      files: selected.files,
      flags: runFlags,
      totalFiles: selected.totalRunnableFiles,
    }),
    note: notice,
    nodeArgs,
  };
}
