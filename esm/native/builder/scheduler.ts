// Native Builder Scheduler (ESM)
//
// Public scheduler surface stays intentionally thin while scheduler_runtime owns
// pending queue orchestration, debug bookkeeping, and execution gating.

import type {
  AppContainer,
  UnknownRecord,
  BuildRequestOptsLike,
  BuilderSchedulerDepsLike,
  BuilderSchedulerStateSummaryLike,
  BuilderServiceLike,
  BuilderDebugStatsLike,
  BuildDebugBudgetSummaryLike,
} from '../../../types/index.js';

import {
  requestBuildRuntime,
  runPendingBuildRuntime,
  getSchedulerStateRuntime,
  getBuildDebugStatsRuntime,
  resetBuildDebugStatsRuntime,
  getBuildDebugBudgetRuntime,
  flushSchedulerRuntime,
  isBuilderReadyRuntime,
  setSchedulerDepsRuntime,
} from './scheduler_runtime.js';
import { installBuilderSchedulerSurface } from './scheduler_install.js';

export function _runPendingBuild(App: AppContainer, reason: string, forceBuild = false): unknown {
  return runPendingBuildRuntime(App, reason, forceBuild);
}

export function requestBuild(
  App: AppContainer,
  uiOverride: UnknownRecord | null,
  opts?: BuildRequestOptsLike
): unknown {
  return requestBuildRuntime(App, uiOverride, opts);
}

export function getSchedulerState(App: AppContainer): BuilderSchedulerStateSummaryLike {
  return getSchedulerStateRuntime(App);
}

export function getBuildDebugStats(App: AppContainer): BuilderDebugStatsLike {
  return getBuildDebugStatsRuntime(App);
}

export function resetBuildDebugStats(App: AppContainer): BuilderDebugStatsLike {
  return resetBuildDebugStatsRuntime(App);
}

export function getBuildDebugBudget(App: AppContainer): BuildDebugBudgetSummaryLike {
  return getBuildDebugBudgetRuntime(App);
}

export function flushScheduler(App: AppContainer): unknown {
  return flushSchedulerRuntime(App);
}

export function isBuilderReady(App: AppContainer): boolean {
  return isBuilderReadyRuntime(App);
}

export function setSchedulerDeps(App: AppContainer, deps: unknown): BuilderSchedulerDepsLike {
  return setSchedulerDepsRuntime(App, deps);
}

export function installBuilderScheduler(
  App: AppContainer,
  deps: BuilderSchedulerDepsLike
): BuilderServiceLike {
  return installBuilderSchedulerSurface(App, deps, {
    requestBuild,
    runPendingBuild: _runPendingBuild,
    getBuildDebugStats,
    resetBuildDebugStats,
    getBuildDebugBudget,
    getSchedulerState,
    setSchedulerDeps,
    isBuilderReady,
  });
}
