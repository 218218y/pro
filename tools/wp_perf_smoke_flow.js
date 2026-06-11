import {
  createPerfSmokeBaseline,
  createPerfSmokeChildEnv,
  createPerfSmokeMarkdownReport,
  evaluatePerfSmokeBaseline,
  readJsonFile,
  resolvePerfSmokePlan,
  runPerfSmokeScript,
  summarizePerfSmokeRun,
  writeJsonFile,
  writeTextFile,
} from './wp_perf_smoke_shared.js';
import { resolvePerfSmokePaths } from './wp_perf_smoke_state.js';

function createPerfSmokeError(message, exitCode = 1, cause = null) {
  const err = new Error(message);
  err.exitCode = exitCode;
  err.verifyHandled = true;
  if (cause) err.cause = cause;
  return err;
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
  const runScript =
    typeof runners.runPerfSmokeScript === 'function' ? runners.runPerfSmokeScript : runPerfSmokeScript;

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

  for (const scriptName of plan.scriptNames) {
    const result = runScript({ projectRoot, childEnv, scriptName });
    results.push(result);
    if (!result.ok) {
      const summary = summarizePerfSmokeRun({ laneNames: plan.laneNames, results });
      writeJsonFile(paths.jsonOutPath, summary);
      const markdown = createPerfSmokeMarkdownReport({ summary });
      writeTextFile(paths.mdOutPath, markdown);
      throw createPerfSmokeError(
        `[WP Perf Smoke] npm run ${scriptName} failed.`,
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
        throw createPerfSmokeError('[WP Perf Smoke] performance budget regression detected.', 1);
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
