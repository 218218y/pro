import type {
  AppContainer,
  UnknownRecord,
  BuildRequestOptsLike,
  BuilderSchedulerDepsLike,
  BuilderSchedulerStateSummaryLike,
  BuilderDebugStatsLike,
  BuildDebugBudgetSummaryLike,
  BuilderSchedulerStateInternalLike,
  BuildStateLike,
} from '../../../types/index.js';

import { assertApp, reportError } from '../runtime/api.js';
import {
  ensureSchedulerState,
  normalizeSchedulerDeps,
  readActiveId,
  isBootReady,
  hasBuilder,
  callBuild,
  getBuildStateForScheduler,
  getBuildPlanForScheduler,
  readPlanState,
  withTransientBuildFlags,
  makeDebouncedBuild,
  scheduleBuilderWait,
  createPendingPlanFromState,
} from './scheduler_shared.js';
import {
  nowForBuildStats,
  normalizeBuildReason,
  ensureBuildDebugStats,
  shouldSuppressDuplicatePendingRequest,
  recordSkippedDuplicatePendingRequest,
  shouldSuppressRepeatedExecute,
  recordSkippedRepeatedExecute,
  shouldSuppressSatisfiedRequest,
  recordDebouncedSchedule,
  recordBuilderWaitSchedule,
  recordStaleDebouncedTimerFire,
  recordStaleBuilderWaitWakeup,
  recordSkippedSatisfiedRequest,
  recordBuildRequest,
  recordBuildExecute,
  cloneBuildDebugStats,
  createBuildDebugStats,
  summarizeBuildDebugBudget,
} from './scheduler_debug_stats.js';

function nextScheduleVersion(state: BuilderSchedulerStateInternalLike): number {
  const next = (typeof state.scheduleVersionSeq === 'number' ? state.scheduleVersionSeq : 0) + 1;
  state.scheduleVersionSeq = next;
  return next;
}

function ensurePendingScheduleVersion(state: BuilderSchedulerStateInternalLike): number {
  const current = typeof state.pendingScheduleVersion === 'number' ? state.pendingScheduleVersion : 0;
  if (current > 0) return current;
  const next = nextScheduleVersion(state);
  state.pendingScheduleVersion = next;
  return next;
}

function invalidateBuilderWait(state: BuilderSchedulerStateInternalLike): void {
  state.waitingForBuilder = false;
  state.waitingForBuilderVersion = 0;
}

function clearPendingBuildState(state: BuilderSchedulerStateInternalLike): void {
  state.pendingPlan = null;
  state.pendingReason = '';
  state.pendingImmediate = false;
  state.pendingForceBuild = false;
  state.pendingScheduleVersion = 0;
}

function clearScheduledDebouncedRun(state: BuilderSchedulerStateInternalLike): void {
  state.debouncedRunScheduled = false;
  state.debouncedRunVersion = 0;
}

function stagePendingBuildState(
  state: BuilderSchedulerStateInternalLike,
  buildState: BuildStateLike,
  reason: string,
  immediate: boolean,
  forceBuild: boolean,
  scheduleVersion?: number
): void {
  state.pendingPlan = createPendingPlanFromState(buildState);
  state.pendingReason = reason;
  state.pendingImmediate = immediate;
  state.pendingForceBuild = forceBuild;
  state.pendingScheduleVersion =
    typeof scheduleVersion === 'number' && scheduleVersion > 0
      ? scheduleVersion
      : ensurePendingScheduleVersion(state);
}

function hasRecoverablePendingPlan(state: BuilderSchedulerStateInternalLike): boolean {
  return !!readPlanState(state.pendingPlan);
}

function runRecoverablePendingBuildAfterRequestFailure(
  App: AppContainer,
  state: BuilderSchedulerStateInternalLike,
  reason: string,
  forceBuild: boolean
): unknown {
  if (!hasRecoverablePendingPlan(state)) return undefined;

  try {
    return runPendingBuildRuntime(App, reason, forceBuild);
  } catch (e) {
    reportError(App, e, {
      where: 'builder/scheduler.requestBuild.recovery',
      reason,
      forceBuild,
    });
    return undefined;
  }
}

export function ensureSchedulerDebouncedRunner(
  App: AppContainer,
  state: BuilderSchedulerStateInternalLike,
  runPendingBuild: (reason: string) => unknown
): () => void {
  if (!state.buildWardrobeDebounced) {
    state.buildWardrobeDebounced = makeDebouncedBuild(App, nextReason => runPendingBuild(nextReason), {
      readScheduledVersion: () =>
        typeof state.debouncedRunVersion === 'number' ? state.debouncedRunVersion : 0,
      onStaleTimerFire: () => {
        recordStaleDebouncedTimerFire(state, state.pendingReason || 'debounced:stale');
      },
    });
  }
  return state.buildWardrobeDebounced;
}

function schedulePendingBuildDebounced(
  state: BuilderSchedulerStateInternalLike,
  App: AppContainer,
  reason: string,
  runPendingBuild: (reason: string) => unknown,
  preserveExistingSchedule = false
): void {
  const scheduleVersion = ensurePendingScheduleVersion(state);
  if (preserveExistingSchedule && state.debouncedRunScheduled) {
    const usingFallbackTimer = state.debouncedUsesFallbackTimer === true;
    if (!usingFallbackTimer || state.debouncedRunVersion === scheduleVersion) {
      state.debouncedRunVersion = scheduleVersion;
      recordDebouncedSchedule(state, reason, true);
      return;
    }
  }

  const debounced = ensureSchedulerDebouncedRunner(App, state, runPendingBuild);
  state.debouncedRunScheduled = true;
  state.debouncedRunVersion = scheduleVersion;
  recordDebouncedSchedule(state, reason, false);
  debounced();
}

function executePendingBuild(
  App: AppContainer,
  state: BuilderSchedulerStateInternalLike,
  buildState: BuildStateLike,
  reason: string,
  immediate: boolean,
  forceBuild: boolean,
  runPendingBuild: (reason: string) => unknown
): unknown {
  if (!hasBuilder(App)) {
    const scheduleVersion = ensurePendingScheduleVersion(state);
    stagePendingBuildState(state, buildState, reason, immediate, forceBuild, scheduleVersion);
    recordBuilderWaitSchedule(state, reason);
    scheduleBuilderWait(App, nextReason => runPendingBuild(nextReason), reason, {
      version: scheduleVersion,
      onStaleWakeup: () => {
        recordStaleBuilderWaitWakeup(state, state.pendingReason || reason);
      },
    });
    return;
  }

  if (shouldSuppressRepeatedExecute(state, buildState, immediate, forceBuild, immediate)) {
    recordSkippedRepeatedExecute(state, reason);
    clearPendingBuildState(state);
    return null;
  }

  recordBuildExecute(state, reason, immediate, buildState, nowForBuildStats());
  clearPendingBuildState(state);
  invalidateBuilderWait(state);
  return callBuild(App, buildState);
}

export function runPendingBuildRuntime(App: AppContainer, reason: string, forceBuild = false): unknown {
  const A = assertApp(App, 'native/builder/scheduler.runPending');
  const s = ensureSchedulerState(A);
  const rerunPendingBuild = (nextReason: string) => runPendingBuildRuntime(A, nextReason);

  clearScheduledDebouncedRun(s);
  const pendingForceBuild = !!s.pendingForceBuild;
  const effectiveForceBuild = !!forceBuild || pendingForceBuild;

  const plan = s.pendingPlan || getBuildPlanForScheduler(A, null);
  const state = readPlanState(plan) || getBuildStateForScheduler(A, null);
  const buildState = withTransientBuildFlags(state, readActiveId(A), effectiveForceBuild);
  const execReason = normalizeBuildReason(s.pendingReason || reason);
  const immediate = !!s.pendingImmediate;

  if (!isBootReady(A)) {
    stagePendingBuildState(
      s,
      buildState,
      execReason,
      immediate,
      effectiveForceBuild,
      ensurePendingScheduleVersion(s)
    );
    return;
  }

  return executePendingBuild(A, s, buildState, execReason, immediate, effectiveForceBuild, rerunPendingBuild);
}

export function requestBuildRuntime(
  App: AppContainer,
  uiOverride: UnknownRecord | null,
  opts?: BuildRequestOptsLike
): unknown {
  const A = assertApp(App, 'native/builder/scheduler.requestBuild');
  const s = ensureSchedulerState(A);
  const rerunPendingBuild = (nextReason: string) => runPendingBuildRuntime(A, nextReason);

  const now = nowForBuildStats();
  const immediate = !!opts?.immediate;
  const forceBuild = !!opts?.force;

  try {
    const plan = getBuildPlanForScheduler(A, uiOverride);
    const state = readPlanState(plan) || getBuildStateForScheduler(A, uiOverride);
    const buildState = withTransientBuildFlags(state, readActiveId(A), forceBuild);

    const nextPendingPlan = createPendingPlanFromState(buildState);
    const suppressDuplicatePending = shouldSuppressDuplicatePendingRequest(
      s,
      nextPendingPlan,
      immediate,
      forceBuild
    );
    const suppressSatisfiedRequest = shouldSuppressSatisfiedRequest(s, buildState, immediate, forceBuild);
    const requestReason = recordBuildRequest(s, opts?.reason, immediate, nextPendingPlan, now);

    if (suppressDuplicatePending) {
      recordSkippedDuplicatePendingRequest(s, requestReason);
      s.pendingReason = requestReason;
      s.lastTs = now;
      return;
    }

    if (suppressSatisfiedRequest) {
      recordSkippedSatisfiedRequest(s, requestReason);
      s.lastTs = now;
      return;
    }

    s.pendingPlan = nextPendingPlan;
    s.pendingReason = requestReason;
    s.pendingImmediate = immediate;
    s.pendingForceBuild = forceBuild;
    s.pendingScheduleVersion = nextScheduleVersion(s);
    s.lastTs = now;

    if (immediate) {
      if (!isBootReady(A)) {
        schedulePendingBuildDebounced(s, A, requestReason, rerunPendingBuild, true);
        return;
      }
      clearScheduledDebouncedRun(s);
      return executePendingBuild(A, s, buildState, requestReason, true, forceBuild, rerunPendingBuild);
    }

    schedulePendingBuildDebounced(s, A, requestReason, rerunPendingBuild);
    return;
  } catch (e) {
    reportError(A, e, {
      where: 'builder/scheduler.requestBuild',
      reason: opts?.reason || null,
      immediate,
      forceBuild,
    });

    return runRecoverablePendingBuildAfterRequestFailure(
      A,
      s,
      opts?.reason || 'requestBuild:recovery',
      forceBuild
    );
  }
}

export function getSchedulerStateRuntime(App: AppContainer): BuilderSchedulerStateSummaryLike {
  try {
    const a = assertApp(App, 'native/builder/scheduler.getState');
    const s = ensureSchedulerState(a);
    return {
      pendingState: readPlanState(s.pendingPlan),
      lastTs: s.lastTs,
      waiting: !!s.waitingForBuilder,
      debugStats: ensureBuildDebugStats(s),
    };
  } catch {
    return { pendingState: null, lastTs: 0, waiting: false };
  }
}

export function getBuildDebugStatsRuntime(App: AppContainer): BuilderDebugStatsLike {
  const A = assertApp(App, 'native/builder/scheduler.getBuildDebugStats');
  const s = ensureSchedulerState(A);
  return ensureBuildDebugStats(s);
}

export function resetBuildDebugStatsRuntime(App: AppContainer): BuilderDebugStatsLike {
  const A = assertApp(App, 'native/builder/scheduler.resetBuildDebugStats');
  const s = ensureSchedulerState(A);
  const before = cloneBuildDebugStats(ensureBuildDebugStats(s));
  s.debugStats = createBuildDebugStats();
  return before;
}

export function getBuildDebugBudgetRuntime(App: AppContainer): BuildDebugBudgetSummaryLike {
  return summarizeBuildDebugBudget(getBuildDebugStatsRuntime(App));
}

export function flushSchedulerRuntime(App: AppContainer): unknown {
  const A = assertApp(App, 'native/builder/scheduler.flush');
  const s = ensureSchedulerState(A);
  invalidateBuilderWait(s);
  clearScheduledDebouncedRun(s);
  return runPendingBuildRuntime(A, 'flush');
}

export function isBuilderReadyRuntime(App: AppContainer): boolean {
  try {
    const a = assertApp(App, 'native/builder/scheduler.isReady');
    return hasBuilder(a);
  } catch {
    return false;
  }
}

export function setSchedulerDepsRuntime(App: AppContainer, deps: unknown): BuilderSchedulerDepsLike {
  const A = assertApp(App, 'native/builder/scheduler.setDeps');
  const s = ensureSchedulerState(A);
  const d = normalizeSchedulerDeps(deps);
  s.deps = Object.assign({}, s.deps || {}, d);
  return s.deps;
}
