import type { AppContainer, BuilderSchedulerStateInternalLike } from '../../../types/index.js';

import { ensureSchedulerState as ensureSchedulerStateImpl } from './scheduler_shared_state.js';

export type { AnyObj, SchedulerPendingPlan } from './scheduler_shared_records.js';
export type { DebounceDep, GetBuildStateDep } from './scheduler_shared_deps.js';
export type { BuilderCoreLike } from './scheduler_shared_environment.js';

export {
  createFallbackBuildPlan,
  createPendingPlanFromState,
  readBuildPlan,
  readBuildSignature,
  readBuildState,
  readObject,
  readPlanState,
  withTransientBuildFlags,
} from './scheduler_shared_records.js';
export { normalizeSchedulerDeps, readDebounceDep, readGetBuildStateDep } from './scheduler_shared_deps.js';
export { readActiveId } from './scheduler_shared_state.js';
export { callBuild, getBuilderCore, hasBuilder, isBootReady } from './scheduler_shared_environment.js';
export { getBuildPlanForScheduler, getBuildStateForScheduler } from './scheduler_shared_build_plan.js';
export { makeDebouncedBuild, scheduleBuilderWait } from './scheduler_shared_timers.js';

export function ensureSchedulerState(App: AppContainer): BuilderSchedulerStateInternalLike {
  return ensureSchedulerStateImpl(App);
}
