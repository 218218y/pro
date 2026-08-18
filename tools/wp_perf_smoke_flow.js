import { spawnSync } from 'node:child_process';

import {
  createPerfSmokeBaseline,
  createPerfSmokeChildEnv,
  createPerfSmokeMarkdownReport,
  evaluatePerfSmokeBaseline,
  readJsonFile,
  resolvePerfSmokePlan,
  runPerfSmokeTask,
  summarizePerfSmokeRun,
  writeJsonFile,
  writeTextFile,
} from './wp_perf_smoke_shared.js';
import { resolvePerfSmokePaths } from './wp_perf_smoke_state.js';

export const PERF_SMOKE_CONFIRMATION_FLAG = '--confirm-regression';

function createPerfSmokeError(message, exitCode = 1, cause = null) {
  const err = new Error(message);
  err.exitCode = exitCode;
  err.verifyHandled = true;
  if (cause) err.cause = cause;
  return err;
}

function isPurePerfBudgetFailure(evaluation) {
  const failures = Array.isArray(evaluation?.failures) ? evaluation.failures : [];
  return (
    failures.length > 0 &&
    failures.every(failure => failure?.kind === 'script-budget' || failure?.kind === 'total-budget')
  );
}

export function runPerfSmokeConfirmation({
  argv = process.argv.slice(1),
  projectRoot = process.cwd(),
  env = process.env,
  spawnImpl = spawnSync,
} = {}) {
  return spawnImpl(process.execPath, [...argv, PERF_SMOKE_CONFIRMATION_FLAG], {
    cwd: projectRoot,
    stdio: 'inherit',
    env,
  });
}

export function runPerfSmokeFlow({ projectRoot, args, env = process.env, runners = {} } = {}) {
  const childEnvInfo = createPerfSmokeChildEnv(env);
  const childEnv = childEnvInfo.env;
  const dedupe = !(args && args.noDedupe === true);
  const plan = resolvePerfSmokePlan({
    laneNames: args?.laneNames || [],
    scriptNames: args?.scriptNames || [],
    dedupe,
  });
  const paths = resolvePerfSmokePaths(args || {}, projectRoot);
  const results = [];
  const runTask =
    typeof runners.runPerfSmokeTask === 'function' ? runners.runPerfSmokeTask : runPerfSmokeTask;

  if (args?.dryRun) {
    return {
      childEnvInfo,
      plan,
      paths,
      summary: summarizePerfSmokeRun({ laneNames: plan.laneNames, results: [] }),
      baseline: null,
      evaluation: null,
      baselineUpdated: false,
      dryRun: true,
    };
  }

  for (const task of plan.tasks) {
    const result = runTask({ projectRoot, childEnv, task });
    results.push(result);
    if (!result.ok) {
      const summary = summarizePerfSmokeRun({ laneNames: plan.laneNames, results });
      writeJsonFile(paths.jsonOutPath, summary);
      const markdown = createPerfSmokeMarkdownReport({ summary });
      writeTextFile(paths.mdOutPath, markdown);
      throw createPerfSmokeError(
        `[WP Perf Smoke] ${result.scriptName} failed.`,
        result.exitCode,
        result.error
      );
    }
  }

  const summary = summarizePerfSmokeRun({ laneNames: plan.laneNames, results });
  let baseline = readJsonFile(paths.baselinePath);
  let baselineUpdated = false;

  if (args?.updateBaseline) {
    baseline = createPerfSmokeBaseline(summary);
    writeJsonFile(paths.baselinePath, baseline);
    baselineUpdated = true;
  }

  let evaluation = null;
  if (args?.enforce) {
    if (!baseline) {
      if (args.allowMissingBaseline) {
        evaluation = { ok: true, failures: [] };
      } else {
        throw createPerfSmokeError(
          '[WP Perf Smoke] baseline is missing. Run with --update-baseline first.',
          1
        );
      }
    } else {
      evaluation = evaluatePerfSmokeBaseline(summary, baseline);
      if (!evaluation.ok) {
        const markdown = createPerfSmokeMarkdownReport({ summary, baseline, evaluation });
        writeJsonFile(paths.jsonOutPath, summary);
        writeTextFile(paths.mdOutPath, markdown);
        const error = createPerfSmokeError('[WP Perf Smoke] performance budget regression detected.', 1);
        error.performanceBudgetFailure = isPurePerfBudgetFailure(evaluation);
        error.performanceBudgetFailures = evaluation.failures.slice();
        throw error;
      }
    }
  }

  const markdown = createPerfSmokeMarkdownReport({ summary, baseline, evaluation });
  writeJsonFile(paths.jsonOutPath, summary);
  writeTextFile(paths.mdOutPath, markdown);
  if (args?.updateBaseline || args?.docOutPath) {
    writeTextFile(paths.docOutPath, markdown);
  }

  return {
    childEnvInfo,
    plan,
    paths,
    summary,
    baseline,
    evaluation,
    baselineUpdated,
    dryRun: false,
  };
}
