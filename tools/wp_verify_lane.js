#!/usr/bin/env node

import { createSanitizedChildEnv } from './wp_node_child_env.js';
import { resolveProjectRoot } from './wp_verify_shared.js';
import { planVerifyLaneRun, runVerifyLanePlan } from './wp_verify_lane_flow.js';
import { createVerifyLaneHelpText, parseVerifyLaneArgs } from './wp_verify_lane_state.js';

function main() {
  const flags = parseVerifyLaneArgs(process.argv.slice(2));
  if (flags.list || !flags.laneNames.length) {
    console.log(createVerifyLaneHelpText());
    process.exit(flags.list ? 0 : 1);
    return;
  }

  const projectRoot = resolveProjectRoot(import.meta.url);
  const childEnvInfo = createSanitizedChildEnv(process.env);
  const childEnv = childEnvInfo.env;
  const plan = planVerifyLaneRun({ laneNames: flags.laneNames, dedupe: !flags.noDedupe });

  if (childEnvInfo.removedInvalidLocalStorageFile) {
    const sourceLabel =
      childEnvInfo.touchedKeys && childEnvInfo.touchedKeys.length
        ? childEnvInfo.touchedKeys.join(', ')
        : 'NODE_OPTIONS';
    console.warn(
      `[WardrobePro] verify lane: ignoring invalid localstorage node-option flag for child processes (${sourceLabel}).`
    );
  }

  if (flags.print || flags.dryRun) {
    console.log(
      `[WardrobePro] verify lane${plan.laneNames.length > 1 ? 's' : ''}: ${plan.laneNames.join(', ')}`
    );
    for (const scriptName of plan.scripts) console.log(` - ${scriptName}`);
    if (flags.dryRun) return;
  }

  runVerifyLanePlan({ projectRoot, childEnv, laneNames: plan.laneNames, dedupe: !flags.noDedupe });
  console.log(
    `[WardrobePro] verify lane${plan.laneNames.length > 1 ? 's' : ''}: ${plan.laneNames.join(', ')} passed.`
  );
}

main();
