import type { AppContainer, BuildPlanLike, BuildStateLike, UnknownRecord } from '../../../types/index.js';

import { reportError } from '../runtime/api.js';
import { getBuildStateMaybe } from './store_access.js';
import { readGetBuildStateDep } from './scheduler_shared_deps.js';
import {
  createFallbackBuildPlan,
  readBuildPlan,
  readBuildState,
  readPlanState,
} from './scheduler_shared_records.js';
import { ensureSchedulerState } from './scheduler_shared_state.js';

export function getBuildStateForScheduler(
  App: AppContainer,
  uiOverride: UnknownRecord | null
): BuildStateLike {
  const fromCanonical = getBuildStateMaybe(App, uiOverride);
  if (fromCanonical && typeof fromCanonical === 'object') return fromCanonical;

  const s = ensureSchedulerState(App);
  const getBuildStateDep = readGetBuildStateDep(s.deps);
  if (typeof getBuildStateDep === 'function') {
    const st = getBuildStateDep(uiOverride);
    return readBuildState(st) || {};
  }

  throw new Error('[WardrobePro] builder getBuildState seam is missing (actions/store seam not installed?)');
}

export function getBuildPlanForScheduler(App: AppContainer, uiOverride: UnknownRecord | null): BuildPlanLike {
  const s = ensureSchedulerState(App);
  const state = getBuildStateForScheduler(App, uiOverride);

  const createBuildPlan = typeof s.deps.createBuildPlan === 'function' ? s.deps.createBuildPlan : null;
  if (typeof createBuildPlan === 'function') {
    let plan: unknown = null;
    try {
      plan = createBuildPlan(state);
    } catch (e) {
      reportError(App, e, { where: 'builder/scheduler', op: 'createBuildPlan' });
      plan = null;
    }

    const planObj = readBuildPlan(plan);
    if (planObj) {
      if (!readBuildState(planObj.state)) planObj.state = state;
      return planObj;
    }
  }

  return createFallbackBuildPlan(readPlanState({ state }) || state);
}
