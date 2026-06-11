#!/usr/bin/env node

import { createPerfSmokeHelpText, parsePerfSmokeArgs } from './wp_perf_smoke_state.js';
import { resolvePerfSmokeProjectRoot } from './wp_perf_smoke_shared.js';
import { runPerfSmokeFlow } from './wp_perf_smoke_flow.js';

function printPlan(plan) {
  console.log(
    `[WP Perf Smoke] verify lane${plan.laneNames.length === 1 ? '' : 's'}: ${
      plan.laneNames.length ? plan.laneNames.join(', ') : 'none'
    }`
  );
  for (const scriptName of plan.scriptNames) console.log(` - ${scriptName}`);
}

function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    console.log(createPerfSmokeHelpText());
    process.exit(0);
    return;
  }

  const args = parsePerfSmokeArgs(rawArgs);
  if (args.listDefaults) {
    console.log(createPerfSmokeHelpText());
    process.exit(0);
    return;
  }

  const projectRoot = resolvePerfSmokeProjectRoot(import.meta.url);

  try {
    const result = runPerfSmokeFlow({ projectRoot, args });
    if (args.print || args.dryRun) printPlan(result.plan);
    if (result.childEnvInfo.removedInvalidLocalStorageFile) {
      const sourceLabel =
        result.childEnvInfo.touchedKeys && result.childEnvInfo.touchedKeys.length
          ? result.childEnvInfo.touchedKeys.join(', ')
          : 'NODE_OPTIONS';
      console.warn(
        `[WP Perf Smoke] ignoring invalid localstorage node-option flag for child processes (${sourceLabel}).`
      );
    }
    if (result.baselineUpdated) {
      console.log(`[WP Perf Smoke] baseline updated: ${result.paths.baselinePath}`);
    }
    if (result.evaluation && result.evaluation.ok) {
      console.log('[WP Perf Smoke] budgets passed.');
    }
    console.log(`[WP Perf Smoke] summary json: ${result.paths.jsonOutPath}`);
    console.log(`[WP Perf Smoke] summary md: ${result.paths.mdOutPath}`);
    if (args.updateBaseline || args.docOutPath) {
      console.log(`[WP Perf Smoke] doc md: ${result.paths.docOutPath}`);
    }
    if (!result.dryRun) {
      console.log('[WP Perf Smoke] completed.');
    }
  } catch (err) {
    if (err && err.verifyHandled) {
      if (err.cause) console.error(err.cause);
      console.error(err.message || String(err));
      process.exit(typeof err.exitCode === 'number' ? err.exitCode : 1);
      return;
    }
    console.error(err);
    process.exit(1);
  }
}

main();
