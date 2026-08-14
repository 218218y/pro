import { flattenVerifyLanePlan, normalizeVerifyLaneName } from './wp_verify_lane_catalog.js';
import { npmRun, runCmd } from './wp_verify_shared.js';

export function planVerifyLaneRun({ laneName, laneNames, dedupe = true } = {}) {
  const requestedLaneNames = Array.isArray(laneNames) ? laneNames : [laneName];
  return flattenVerifyLanePlan(requestedLaneNames, { dedupe });
}

function runVerifyTask({ projectRoot, childEnv, task, runners = {} }) {
  if (task.kind === 'package-script') {
    const exec = typeof runners.npmRun === 'function' ? runners.npmRun : npmRun;
    exec({ projectRoot, childEnv, scriptName: task.name });
    return;
  }
  if (task.kind === 'test-group') {
    if (typeof runners.runTestGroup === 'function') {
      runners.runTestGroup({ projectRoot, childEnv, groupName: task.name });
      return;
    }
    runCmd({
      projectRoot,
      childEnv,
      cmd: process.execPath,
      args: ['tools/wp_test_group.mjs', task.name],
      label: `test group ${task.name}`,
    });
    return;
  }
  throw new Error(`[WardrobePro] unsupported verify task kind: ${task.kind}`);
}

export function runVerifyLanePlan({ projectRoot, childEnv, laneNames, dedupe = true, runners } = {}) {
  const plan = planVerifyLaneRun({ laneNames, dedupe });
  for (const task of plan.tasks) runVerifyTask({ projectRoot, childEnv, task, runners });
  return plan;
}

export function runVerifyLane({ projectRoot, childEnv, laneName, runners } = {}) {
  const normalized = normalizeVerifyLaneName(laneName);
  if (!normalized) throw new Error('[WardrobePro] verify lane name is required.');
  const plan = runVerifyLanePlan({ projectRoot, childEnv, laneNames: [normalized], runners });
  return { laneName: normalized, tasks: plan.tasks };
}
