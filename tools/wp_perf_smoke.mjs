#!/usr/bin/env node

import { formatVerifyTask } from './wp_verify_lane_catalog.js';
import { createPerfSmokeHelpText, parsePerfSmokeArgs } from './wp_perf_smoke_state.js';
import { resolvePerfSmokeProjectRoot } from './wp_perf_smoke_shared.js';
import * as perfSmokeFlow from './wp_perf_smoke_flow.js';

function printPlan(plan) {
  console.log(
    `[WP Perf Smoke] verify lane${plan.laneNames.length === 1 ? '' : 's'}: ${
      plan.laneNames.length ? plan.laneNames.join(', ') : 'none'
    }`
  );
  for (const task of plan.tasks) console.log(` - ${formatVerifyTask(task)}`);
}

function main() {
  const rawArgs = process.argv.slice(2);
  const confirmationRun = rawArgs.includes(perfSmokeFlow.PERF_SMOKE_CONFIRMATION_FLAG);
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    console.log(createPerfSmokeHelpText());
    return;
  }

  const args = parsePerfSmokeArgs(rawArgs.filter(arg => arg !== perfSmokeFlow.PERF_SMOKE_CONFIRMATION_FLAG));
  if (args.listDefaults) {
    console.log(createPerfSmokeHelpText());
    return;
  }

  const projectRoot = resolvePerfSmokeProjectRoot(import.meta.url);

  try {
    const result = perfSmokeFlow.runPerfSmokeFlow({ projectRoot, args });
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
    if (err?.performanceBudgetFailure === true && !confirmationRun) {
      for (const failure of err.performanceBudgetFailures || []) {
        console.warn('[WP Perf Smoke][candidate]', failure?.message || String(failure));
      }
      console.warn('[WP Perf Smoke] quantitative regression candidate; running one clean confirmation');
      const confirmation = perfSmokeFlow.runPerfSmokeConfirmation({
        argv: process.argv.slice(1),
        projectRoot,
      });
      if (confirmation.status === 0) {
        console.log('[WP Perf Smoke] regression candidate was not reproduced by the confirmation run');
        return;
      }
      process.exit(confirmation.status ?? 1);
      return;
    }
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
