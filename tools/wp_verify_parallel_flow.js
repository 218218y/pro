import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { classifyFormatCheckResult } from './wp_verify_state.js';

const MAX_CAPTURE_CHARS = 2 * 1024 * 1024;

function npmStep(id, scriptName, extraArgs = []) {
  const suffix = extraArgs.length ? ` ${extraArgs.join(' ')}` : '';
  return {
    id,
    type: 'npm',
    scriptName,
    extraArgs,
    label: `npm run ${scriptName}${suffix}`,
  };
}

function formatStep() {
  return {
    ...npmStep('format-check', 'format:check'),
    type: 'format',
  };
}

function nodeStep(id, args, label) {
  return {
    id,
    type: 'node',
    args,
    label: label || `node ${args.join(' ')}`,
  };
}

function testShardStep(index, total, testJobs) {
  return npmStep(`test-shard-${index}-of-${total}`, 'test', [
    '--',
    `--shard=${index}/${total}`,
    '--no-build',
    `--jobs=${testJobs}`,
  ]);
}

function testReportDirForShard(index, total) {
  return `.artifacts/test-report/shard-${index}-of-${total}`;
}

function createPolicyLane(flags) {
  return {
    id: 'policy',
    label: 'Policy, format, lint, and refactor guardrails',
    steps: [
      npmStep('policy-check', flags.gate ? 'check:gate' : 'check:strict'),
      formatStep(),
      npmStep('lint', flags.gate ? 'lint:strict' : 'lint'),
      npmStep('refactor-guardrails', 'check:refactor-guardrails'),
    ],
  };
}

function createContractLane() {
  return {
    id: 'contracts',
    label: 'Architecture and public-surface contracts',
    steps: [
      nodeStep('pdf-template', ['tools/wp_pdf_template_check.js']),
      nodeStep('cycles-esm', ['tools/wp_cycles.js', 'esm']),
      nodeStep('esm-check', ['tools/wp_esm_check.js']),
      nodeStep('three-vendor', ['tools/wp_three_vendor_contract.js']),
      nodeStep('ui-contract', ['tools/wp_ui_contract.js'], 'node tools/wp_ui_contract.js'),
      npmStep('layer-contract', 'contract:layers'),
      npmStep('api-contract', 'contract:api'),
      npmStep('wiring-guard', 'wiring:guard'),
      npmStep('ui-dom-guard', 'ui:dom-guard'),
      npmStep('ui-bindkey-guard', 'ui:bindkey-guard'),
    ],
  };
}

function createTestLanes(flags) {
  const lanes = [];
  for (let index = 1; index <= flags.testShards; index += 1) {
    lanes.push({
      id: `test-shard-${index}-of-${flags.testShards}`,
      label: `Runtime tests shard ${index}/${flags.testShards}`,
      env: {
        WP_TEST_REPORT_DIR: testReportDirForShard(index, flags.testShards),
      },
      steps: [testShardStep(index, flags.testShards, flags.testJobs)],
    });
  }
  return lanes;
}

function createBundleSteps() {
  return [
    npmStep('bundle', 'bundle'),
    nodeStep('release-parity-artifacts', [
      'tools/wp_release_parity.js',
      '--require-dist',
      '--require-release',
      '--artifacts-only',
    ]),
    npmStep('bundle-site2', 'bundle:site2'),
    nodeStep('release-clean-audit', [
      'tools/wp_release_clean_audit.mjs',
      '--dirs',
      'dist/release,dist/site2/release',
    ]),
  ];
}

export function createVerifyParallelPlan({ flags }) {
  return {
    prepareStep: nodeStep('build-dist', ['tools/wp_build_dist.js', '--no-assets']),
    lanes: [
      createPolicyLane(flags),
      {
        id: 'typecheck',
        label: 'TypeScript checks',
        steps: [npmStep('typecheck-all', 'typecheck:all')],
      },
      createContractLane(),
      ...createTestLanes(flags),
    ],
    bundleSteps: flags.skipBundle ? [] : createBundleSteps(),
  };
}

export function formatVerifyParallelPlan(plan, flags) {
  const lines = [
    `[WardrobePro] verify parallel plan: ${plan.lanes.length} lane(s), max ${flags.parallelJobs} parallel.`,
    flags.noBuild
      ? 'Prepare: reuse existing dist/esm/main.js (--no-build).'
      : `Prepare: ${plan.prepareStep.label}`,
    '',
    'Parallel lanes:',
  ];
  for (const lane of plan.lanes) {
    lines.push(`- ${lane.id}: ${lane.label}`);
    for (const step of lane.steps) lines.push(`  - ${step.label}`);
  }
  lines.push('', 'Bundle phase:');
  if (plan.bundleSteps.length) {
    for (const step of plan.bundleSteps) lines.push(`- ${step.label}`);
  } else {
    lines.push('- skipped');
  }
  return lines.join('\n');
}

export function resolveStepCommand(step) {
  if (step.type === 'npm' || step.type === 'format') {
    if (process.platform === 'win32') {
      const comspec = process.env.ComSpec || 'cmd.exe';
      return {
        cmd: comspec,
        args: ['/d', '/s', '/c', 'npm', 'run', step.scriptName, ...(step.extraArgs || [])],
      };
    }
    return { cmd: 'npm', args: ['run', step.scriptName, ...(step.extraArgs || [])] };
  }
  if (step.type === 'node') return { cmd: process.execPath, args: step.args || [] };
  throw new Error(`[WardrobePro] unknown verify parallel step type: ${step.type || '(missing)'}`);
}

function appendCaptured(current, chunk) {
  if (current.length >= MAX_CAPTURE_CHARS) return current;
  const text = String(chunk || '');
  const remaining = MAX_CAPTURE_CHARS - current.length;
  return current + text.slice(0, remaining);
}

function createPrefixedWriter(prefix, stream) {
  let carry = '';
  return {
    write(chunk) {
      carry += String(chunk || '');
      const lines = carry.split(/\r?\n/u);
      carry = lines.pop() || '';
      for (const line of lines) stream.write(`${prefix}${line}\n`);
    },
    flush() {
      if (!carry) return;
      stream.write(`${prefix}${carry}\n`);
      carry = '';
    },
  };
}

export function runCommandStep({ projectRoot, childEnv, step, lane }) {
  const { cmd, args } = resolveStepCommand(step);
  const env = { ...childEnv, ...(lane?.env || {}) };
  const prefix = `[${lane?.id || 'verify'}] `;
  const startedAt = Date.now();
  let stdout = '';
  let stderr = '';

  return new Promise(resolve => {
    const child = spawn(cmd, args, {
      cwd: projectRoot,
      env,
      shell: false,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    const outWriter = createPrefixedWriter(prefix, process.stdout);
    const errWriter = createPrefixedWriter(prefix, process.stderr);
    let resolved = false;

    function finish(payload) {
      if (resolved) return;
      resolved = true;
      outWriter.flush();
      errWriter.flush();
      resolve({
        ...payload,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    }

    child.stdout?.on('data', chunk => {
      stdout = appendCaptured(stdout, chunk);
      outWriter.write(chunk);
    });
    child.stderr?.on('data', chunk => {
      stderr = appendCaptured(stderr, chunk);
      errWriter.write(chunk);
    });
    child.on('error', error => {
      finish({ ok: false, code: 1, signal: null, error });
    });
    child.on('close', (code, signal) => {
      const exitCode = typeof code === 'number' ? code : 1;
      finish({ ok: exitCode === 0, code: exitCode, signal: signal || null, error: null });
    });
  });
}

function createLaneFailure({ lane, step, stepResult, message }) {
  return {
    id: lane.id,
    label: lane.label,
    ok: false,
    failedStep: step.label,
    exitCode: typeof stepResult?.code === 'number' ? stepResult.code : 1,
    message,
  };
}

async function runLane({ projectRoot, childEnv, lane, flags, runStep, log }) {
  const startedAt = Date.now();
  const stepResults = [];
  log(`[WardrobePro] verify parallel: lane started: ${lane.id}`);

  for (const step of lane.steps) {
    log(`[WardrobePro] verify parallel: ${lane.id}: ${step.label}`);
    const stepResult = await runStep({ projectRoot, childEnv, step, lane });
    stepResults.push({ step: step.label, ...stepResult });

    if (step.type === 'format') {
      const formatState = classifyFormatCheckResult(stepResult, {
        gate: flags.gate,
        softFormat: flags.softFormat,
      });
      if (formatState.message) {
        const writer = formatState.ok ? console.warn : console.error;
        writer(formatState.message);
      }
      if (!formatState.ok) {
        return {
          ...createLaneFailure({ lane, step, stepResult, message: formatState.message }),
          stepResults,
          hasFormatWarn: false,
          durationMs: Date.now() - startedAt,
        };
      }
      if (formatState.hasFormatWarn) {
        continue;
      }
    }

    if (!stepResult?.ok) {
      return {
        ...createLaneFailure({ lane, step, stepResult }),
        stepResults,
        hasFormatWarn: false,
        durationMs: Date.now() - startedAt,
      };
    }
  }

  log(`[WardrobePro] verify parallel: lane passed: ${lane.id}`);
  return {
    id: lane.id,
    label: lane.label,
    ok: true,
    exitCode: 0,
    stepResults,
    hasFormatWarn: stepResults.some(result => result.step === 'npm run format:check' && result.code !== 0),
    durationMs: Date.now() - startedAt,
  };
}

async function runLanePool({ projectRoot, childEnv, lanes, flags, runStep, log }) {
  const results = new Array(lanes.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(flags.parallelJobs || 1, lanes.length));

  async function worker() {
    while (nextIndex < lanes.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await runLane({
        projectRoot,
        childEnv,
        lane: lanes[index],
        flags,
        runStep,
        log,
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function runStepsSerial({ projectRoot, childEnv, steps, runStep, log }) {
  const results = [];
  const lane = { id: 'bundle', label: 'Bundle phase' };
  for (const step of steps) {
    log(`[WardrobePro] verify parallel: bundle: ${step.label}`);
    const result = await runStep({ projectRoot, childEnv, step, lane });
    results.push({ step: step.label, ...result });
    if (!result?.ok) break;
  }
  return results;
}

function distEntryPath(projectRoot) {
  return path.join(projectRoot, 'dist', 'esm', 'main.js');
}

async function prepareDist({ projectRoot, childEnv, flags, prepareStep, runStep, log }) {
  if (flags.noBuild) {
    const entry = distEntryPath(projectRoot);
    if (!fs.existsSync(entry)) {
      return {
        ok: false,
        code: 1,
        error: new Error('[WardrobePro] verify parallel: dist is missing. Build first: npm run build:dist'),
      };
    }
    log('[WardrobePro] verify parallel: reusing existing dist/esm/main.js (--no-build).');
    return { ok: true, code: 0, skipped: true };
  }

  log(`[WardrobePro] verify parallel: prepare: ${prepareStep.label}`);
  return runStep({
    projectRoot,
    childEnv,
    step: prepareStep,
    lane: { id: 'prepare', label: 'Prepare dist' },
  });
}

export async function runVerifyParallelPlan({
  projectRoot,
  childEnv,
  flags,
  runners = {},
  log = console.log,
} = {}) {
  const plan = createVerifyParallelPlan({ flags });
  const runStep = runners.runStep || runCommandStep;
  const prepareResult = runners.prepareDist
    ? await runners.prepareDist({ projectRoot, childEnv, flags, plan, runStep, log })
    : await prepareDist({ projectRoot, childEnv, flags, prepareStep: plan.prepareStep, runStep, log });

  if (!prepareResult?.ok) {
    return {
      ok: false,
      prepareResult,
      laneResults: [],
      bundleResults: [],
      hasFormatWarn: false,
      plan,
    };
  }

  log(
    `[WardrobePro] verify parallel: running ${plan.lanes.length} lane(s), max ${flags.parallelJobs} at a time.`
  );
  const laneResults = await runLanePool({
    projectRoot,
    childEnv,
    lanes: plan.lanes,
    flags,
    runStep,
    log,
  });
  const lanesOk = laneResults.every(result => result?.ok);
  const hasFormatWarn = laneResults.some(result => result?.hasFormatWarn);

  let bundleResults = [];
  if (lanesOk && plan.bundleSteps.length) {
    bundleResults = await runStepsSerial({ projectRoot, childEnv, steps: plan.bundleSteps, runStep, log });
  } else if (lanesOk) {
    log('[WardrobePro] verify parallel: bundle steps are disabled (--ci/--no-bundle/--no-bundles).');
  } else {
    log('[WardrobePro] verify parallel: skipping bundle phase because at least one lane failed.');
  }

  const bundlesOk = bundleResults.every(result => result?.ok);
  return {
    ok: lanesOk && bundlesOk,
    prepareResult,
    laneResults,
    bundleResults,
    hasFormatWarn,
    plan,
  };
}
