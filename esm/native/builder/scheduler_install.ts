import type {
  AppContainer,
  UnknownRecord,
  BuildRequestOptsLike,
  BuilderSchedulerDepsLike,
  BuilderSchedulerPublicLike,
  BuilderSchedulerStateSummaryLike,
  BuilderServiceLike,
  BuilderDebugStatsLike,
  BuildDebugBudgetSummaryLike,
  BuildStateLike,
} from '../../../types/index.js';

import { assertApp } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { ensureSchedulerState, readPlanState } from './scheduler_shared.js';
import { ensureSchedulerDebouncedRunner } from './scheduler_runtime.js';

type SchedulerInstallCallbacks = {
  requestBuild: (App: AppContainer, uiOverride: UnknownRecord | null, opts?: BuildRequestOptsLike) => unknown;
  runPendingBuild: (App: AppContainer, reason: string, forceBuild?: boolean) => unknown;
  getBuildDebugStats: (App: AppContainer) => BuilderDebugStatsLike;
  resetBuildDebugStats: (App: AppContainer) => BuilderDebugStatsLike;
  getBuildDebugBudget: (App: AppContainer) => BuildDebugBudgetSummaryLike;
  getSchedulerState: (App: AppContainer) => BuilderSchedulerStateSummaryLike;
  setSchedulerDeps: (App: AppContainer, deps: unknown) => BuilderSchedulerDepsLike;
  isBuilderReady: (App: AppContainer) => boolean;
};

type SchedulerInstallContext = {
  app: AppContainer;
  callbacks: SchedulerInstallCallbacks;
};

type SchedulerInstallRefs = {
  requestBuild: (uiOverride?: UnknownRecord | null, opts?: BuildRequestOptsLike) => unknown;
  runPendingBuild: (reason?: string, forceBuild?: boolean) => unknown;
  getBuildDebugStats: () => BuilderDebugStatsLike;
  resetBuildDebugStats: () => BuilderDebugStatsLike;
  getBuildDebugBudget: () => BuildDebugBudgetSummaryLike;
  getPendingState: () => BuildStateLike | null;
  getLastTs: () => number;
  flush: () => unknown;
  isBuilderReady: () => boolean;
  getState: () => BuilderSchedulerStateSummaryLike;
};

type SchedulerCompatSurface = BuilderSchedulerPublicLike & {
  __installContext?: SchedulerInstallContext;
  __installRefs?: SchedulerInstallRefs;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isSchedulerCompatSurface(value: unknown): value is SchedulerCompatSurface {
  return isRecord(value);
}

function hasSchedulerCallbacks(value: unknown): value is SchedulerInstallCallbacks {
  return (
    isRecord(value) &&
    typeof value.requestBuild === 'function' &&
    typeof value.runPendingBuild === 'function' &&
    typeof value.getBuildDebugStats === 'function' &&
    typeof value.resetBuildDebugStats === 'function' &&
    typeof value.getBuildDebugBudget === 'function' &&
    typeof value.getSchedulerState === 'function' &&
    typeof value.setSchedulerDeps === 'function' &&
    typeof value.isBuilderReady === 'function'
  );
}

function isSchedulerInstallContext(value: unknown): value is SchedulerInstallContext {
  return isRecord(value) && hasSchedulerCallbacks(value.callbacks);
}

function hasSchedulerInstallRefs(value: unknown): value is SchedulerInstallRefs {
  return (
    isRecord(value) &&
    typeof value.requestBuild === 'function' &&
    typeof value.runPendingBuild === 'function' &&
    typeof value.getBuildDebugStats === 'function' &&
    typeof value.resetBuildDebugStats === 'function' &&
    typeof value.getBuildDebugBudget === 'function' &&
    typeof value.getPendingState === 'function' &&
    typeof value.getLastTs === 'function' &&
    typeof value.flush === 'function' &&
    typeof value.isBuilderReady === 'function' &&
    typeof value.getState === 'function'
  );
}

function ensureSchedulerCompatSurface(builder: BuilderServiceLike): SchedulerCompatSurface {
  const existing = builder.__scheduler;
  if (isSchedulerCompatSurface(existing)) return existing;
  const next: SchedulerCompatSurface = {};
  builder.__scheduler = next;
  return next;
}

function ensureSchedulerInstallContext(
  scheduler: SchedulerCompatSurface,
  app: AppContainer,
  callbacks: SchedulerInstallCallbacks
): SchedulerInstallContext {
  const current = isSchedulerInstallContext(scheduler.__installContext) ? scheduler.__installContext : null;
  if (current) {
    current.app = app;
    current.callbacks = callbacks;
    scheduler.__installContext = current;
    return current;
  }

  const next: SchedulerInstallContext = { app, callbacks };
  scheduler.__installContext = next;
  return next;
}

function ensureSchedulerInstallRefs(
  scheduler: SchedulerCompatSurface,
  state: ReturnType<typeof ensureSchedulerState>,
  context: SchedulerInstallContext
): SchedulerInstallRefs {
  const current = hasSchedulerInstallRefs(scheduler.__installRefs) ? scheduler.__installRefs : null;
  if (current) return current;

  const refs: SchedulerInstallRefs = {
    requestBuild(uiOverride?: UnknownRecord | null, opts?: BuildRequestOptsLike) {
      return context.callbacks.requestBuild(context.app, uiOverride || null, opts);
    },
    runPendingBuild(reason?: string, forceBuild?: boolean) {
      return context.callbacks.runPendingBuild(context.app, reason || 'manual', !!forceBuild);
    },
    getBuildDebugStats() {
      return context.callbacks.getBuildDebugStats(context.app);
    },
    resetBuildDebugStats() {
      return context.callbacks.resetBuildDebugStats(context.app);
    },
    getBuildDebugBudget() {
      return context.callbacks.getBuildDebugBudget(context.app);
    },
    getPendingState() {
      try {
        return readPlanState(state.pendingPlan);
      } catch {
        return null;
      }
    },
    getLastTs() {
      return state.lastTs;
    },
    flush() {
      try {
        state.waitingForBuilder = false;
        return context.callbacks.runPendingBuild(context.app, 'flush');
      } catch {
        return undefined;
      }
    },
    isBuilderReady() {
      try {
        return context.callbacks.isBuilderReady(context.app);
      } catch {
        return false;
      }
    },
    getState() {
      return context.callbacks.getSchedulerState(context.app);
    },
  };

  scheduler.__installRefs = refs;
  return refs;
}

export function installBuilderSchedulerSurface(
  App: AppContainer,
  deps: BuilderSchedulerDepsLike,
  callbacks: SchedulerInstallCallbacks
): BuilderServiceLike {
  const a = assertApp(App, 'native/builder/scheduler.install');
  const s = ensureSchedulerState(a);
  callbacks.setSchedulerDeps(a, deps);

  ensureSchedulerDebouncedRunner(a, s, nextReason => callbacks.runPendingBuild(a, nextReason));
  const builder = ensureBuilderService(a, 'native/builder/scheduler.install');
  const scheduler = ensureSchedulerCompatSurface(builder);
  const context = ensureSchedulerInstallContext(scheduler, a, callbacks);
  const refs = ensureSchedulerInstallRefs(scheduler, s, context);

  if (builder.requestBuild !== refs.requestBuild) builder.requestBuild = refs.requestBuild;
  if (builder._runPendingBuild !== refs.runPendingBuild) builder._runPendingBuild = refs.runPendingBuild;
  if (builder.getBuildDebugStats !== refs.getBuildDebugStats)
    builder.getBuildDebugStats = refs.getBuildDebugStats;
  if (builder.resetBuildDebugStats !== refs.resetBuildDebugStats)
    builder.resetBuildDebugStats = refs.resetBuildDebugStats;
  if (builder.getBuildDebugBudget !== refs.getBuildDebugBudget)
    builder.getBuildDebugBudget = refs.getBuildDebugBudget;
  builder.buildWardrobeDebounced = s.buildWardrobeDebounced;

  if (scheduler.getPendingState !== refs.getPendingState) scheduler.getPendingState = refs.getPendingState;
  if (scheduler.getLastTs !== refs.getLastTs) scheduler.getLastTs = refs.getLastTs;
  if (scheduler.flush !== refs.flush) scheduler.flush = refs.flush;
  if (scheduler.isBuilderReady !== refs.isBuilderReady) scheduler.isBuilderReady = refs.isBuilderReady;
  if (scheduler.getState !== refs.getState) scheduler.getState = refs.getState;
  scheduler.__esm_v1 = true;

  return builder;
}
