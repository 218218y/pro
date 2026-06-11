#!/usr/bin/env node

import { createSanitizedChildEnv } from './wp_node_child_env.js';
import { resolveProjectRoot } from './wp_verify_shared.js';
import { createVerifySuccessMessage } from './wp_verify_state.js';
import {
  createVerifyParallelPlan,
  formatVerifyParallelPlan,
  runVerifyParallelPlan,
} from './wp_verify_parallel_flow.js';
import { createVerifyParallelHelpText, parseVerifyParallelArgs } from './wp_verify_parallel_state.js';

function printFailureSummary(result) {
  if (result.prepareResult && !result.prepareResult.ok) {
    console.error('[WardrobePro] verify parallel failed during prepare.');
    if (result.prepareResult.error)
      console.error(result.prepareResult.error.message || result.prepareResult.error);
    return;
  }

  for (const lane of result.laneResults || []) {
    if (lane?.ok) continue;
    console.error(`[WardrobePro] verify parallel failed lane: ${lane.id}`);
    if (lane.failedStep) console.error(`[WardrobePro] failed step: ${lane.failedStep}`);
    if (lane.message) console.error(lane.message);
  }

  for (const step of result.bundleResults || []) {
    if (step?.ok) continue;
    console.error(`[WardrobePro] verify parallel failed bundle step: ${step.step}`);
    break;
  }
}

async function main() {
  const flags = parseVerifyParallelArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(createVerifyParallelHelpText());
    return;
  }

  const projectRoot = resolveProjectRoot(import.meta.url);
  const childEnvInfo = createSanitizedChildEnv(process.env);
  const childEnv = childEnvInfo.env;

  if (childEnvInfo.removedInvalidLocalStorageFile) {
    const sourceLabel =
      childEnvInfo.touchedKeys && childEnvInfo.touchedKeys.length
        ? childEnvInfo.touchedKeys.join(', ')
        : 'NODE_OPTIONS';
    console.warn(
      `[WardrobePro] verify parallel: ignoring invalid localstorage node-option flag for child processes (${sourceLabel}).`
    );
  }

  const plan = createVerifyParallelPlan({ flags });
  if (flags.print || flags.dryRun) {
    console.log(formatVerifyParallelPlan(plan, flags));
    if (flags.dryRun) return;
  }

  const result = await runVerifyParallelPlan({ projectRoot, childEnv, flags });
  if (!result.ok) {
    printFailureSummary(result);
    process.exit(1);
    return;
  }

  console.log(createVerifySuccessMessage({ gate: flags.gate, hasFormatWarn: result.hasFormatWarn }));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
