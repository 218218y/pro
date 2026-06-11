import { flattenVerifyLanePlan, normalizeVerifyLaneName } from './wp_verify_lane_catalog.js';
import { npmRun } from './wp_verify_shared.js';

export function planVerifyLaneRun({ laneName, laneNames, dedupe = true } = {}) {
  const requestedLaneNames = Array.isArray(laneNames) ? laneNames : [laneName];
  return flattenVerifyLanePlan(requestedLaneNames, { dedupe });
}

export function runVerifyLanePlan({ projectRoot, childEnv, laneNames, dedupe = true, runners } = {}) {
  const plan = planVerifyLaneRun({ laneNames, dedupe });
  const exec = runners && typeof runners.npmRun === 'function' ? runners.npmRun : npmRun;
  for (const scriptName of plan.scripts) {
    exec({ projectRoot, childEnv, scriptName });
  }
  return plan;
}

export function runVerifyLane({ projectRoot, childEnv, laneName, runners } = {}) {
  const normalized = normalizeVerifyLaneName(laneName);
  if (!normalized) throw new Error('[WardrobePro] verify lane name is required.');
  const plan = runVerifyLanePlan({ projectRoot, childEnv, laneNames: [normalized], runners });
  return { laneName: normalized, scripts: plan.scripts };
}
