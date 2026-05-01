import type {
  AppContainer,
  BuildDebugBudgetSummaryLike,
  BuilderDebugStatsLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  StoreDebugStats,
} from '../../../types/index.js';

import { getBuilderService } from './builder_service_access.js';
import {
  getPlatformRenderDebugBudget,
  getPlatformRenderDebugStats,
  resetPlatformRenderDebugStats,
} from './platform_access_ops.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';

type StoreWithDebugSurface = {
  getDebugStats?: () => StoreDebugStats;
  resetDebugStats?: () => void;
};

type BuilderServiceWithDebugSurface = {
  getBuildDebugStats?: () => BuilderDebugStatsLike;
  resetBuildDebugStats?: () => BuilderDebugStatsLike;
  getBuildDebugBudget?: () => BuildDebugBudgetSummaryLike;
};

function getStoreWithDebugSurface(App: AppContainer): StoreWithDebugSurface | null {
  const store = getStoreSurfaceMaybe(App) as StoreWithDebugSurface | null;
  if (!store) return null;
  return typeof store.getDebugStats === 'function' || typeof store.resetDebugStats === 'function'
    ? store
    : null;
}

export function getStoreDebugStats(App: AppContainer): StoreDebugStats | null {
  try {
    const store = getStoreWithDebugSurface(App);
    return store && typeof store.getDebugStats === 'function' ? store.getDebugStats() : null;
  } catch {
    return null;
  }
}

export function resetStoreDebugStats(App: AppContainer): StoreDebugStats | null {
  try {
    const store = getStoreWithDebugSurface(App);
    if (!store || typeof store.getDebugStats !== 'function' || typeof store.resetDebugStats !== 'function') {
      return null;
    }
    const before = store.getDebugStats();
    store.resetDebugStats();
    return before;
  } catch {
    return null;
  }
}

function getBuilderWithDebugSurface(App: AppContainer): BuilderServiceWithDebugSurface | null {
  try {
    const builder = getBuilderService(App) as BuilderServiceWithDebugSurface | null;
    if (!builder) return null;
    return typeof builder.getBuildDebugStats === 'function' ||
      typeof builder.resetBuildDebugStats === 'function' ||
      typeof builder.getBuildDebugBudget === 'function'
      ? builder
      : null;
  } catch {
    return null;
  }
}

function createEmptyBuildDebugStats(): BuilderDebugStatsLike {
  return {
    requestCount: 0,
    immediateRequestCount: 0,
    debouncedRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    pendingOverwriteCount: 0,
    debouncedScheduleCount: 0,
    reusedDebouncedScheduleCount: 0,
    builderWaitScheduleCount: 0,
    staleDebouncedTimerFireCount: 0,
    staleBuilderWaitWakeupCount: 0,
    duplicatePendingSignatureCount: 0,
    skippedDuplicatePendingRequestCount: 0,
    skippedSatisfiedRequestCount: 0,
    repeatedExecuteCount: 0,
    skippedRepeatedExecuteCount: 0,
    lastRequestReason: '',
    lastExecuteReason: '',
    reasons: {},
  };
}

function summarizeBuildDebugBudgetLocal(
  stats: BuilderDebugStatsLike | null | undefined
): BuildDebugBudgetSummaryLike {
  const requestCount = typeof stats?.requestCount === 'number' ? Math.max(0, stats.requestCount) : 0;
  const executeCount = typeof stats?.executeCount === 'number' ? Math.max(0, stats.executeCount) : 0;
  const skippedDuplicatePendingRequestCount =
    typeof stats?.skippedDuplicatePendingRequestCount === 'number'
      ? Math.max(0, stats.skippedDuplicatePendingRequestCount)
      : 0;
  const skippedSatisfiedRequestCount =
    typeof stats?.skippedSatisfiedRequestCount === 'number'
      ? Math.max(0, stats.skippedSatisfiedRequestCount)
      : 0;
  const skippedRepeatedExecuteCount =
    typeof stats?.skippedRepeatedExecuteCount === 'number'
      ? Math.max(0, stats.skippedRepeatedExecuteCount)
      : 0;
  const debouncedScheduleCount =
    typeof stats?.debouncedScheduleCount === 'number' ? Math.max(0, stats.debouncedScheduleCount) : 0;
  const reusedDebouncedScheduleCount =
    typeof stats?.reusedDebouncedScheduleCount === 'number'
      ? Math.max(0, stats.reusedDebouncedScheduleCount)
      : 0;
  const builderWaitScheduleCount =
    typeof stats?.builderWaitScheduleCount === 'number' ? Math.max(0, stats.builderWaitScheduleCount) : 0;
  const staleDebouncedTimerFireCount =
    typeof stats?.staleDebouncedTimerFireCount === 'number'
      ? Math.max(0, stats.staleDebouncedTimerFireCount)
      : 0;
  const staleBuilderWaitWakeupCount =
    typeof stats?.staleBuilderWaitWakeupCount === 'number'
      ? Math.max(0, stats.staleBuilderWaitWakeupCount)
      : 0;
  const staleWakeupCount = staleDebouncedTimerFireCount + staleBuilderWaitWakeupCount;
  const suppressedRequestCount = skippedDuplicatePendingRequestCount + skippedSatisfiedRequestCount;
  const suppressedExecuteCount = skippedRepeatedExecuteCount;
  const totalDebounceEvents = debouncedScheduleCount + reusedDebouncedScheduleCount;
  const ratio = (num: number, den: number): number => (den > 0 ? Number((num / den).toFixed(4)) : 0);

  return {
    requestCount,
    executeCount,
    suppressedRequestCount,
    suppressedExecuteCount,
    duplicatePendingRate: ratio(skippedDuplicatePendingRequestCount, requestCount),
    noOpRequestRate: ratio(skippedSatisfiedRequestCount, requestCount),
    noOpExecuteRate: ratio(skippedRepeatedExecuteCount, requestCount),
    debouncedScheduleCount,
    reusedDebouncedScheduleCount,
    builderWaitScheduleCount,
    staleWakeupCount,
    debouncedScheduleReuseRate: ratio(reusedDebouncedScheduleCount, totalDebounceEvents),
  };
}

export function getBuildRuntimeDebugStats(App: AppContainer): BuilderDebugStatsLike | null {
  try {
    const builder = getBuilderWithDebugSurface(App);
    return builder && typeof builder.getBuildDebugStats === 'function'
      ? builder.getBuildDebugStats()
      : createEmptyBuildDebugStats();
  } catch {
    return createEmptyBuildDebugStats();
  }
}

export function resetBuildRuntimeDebugStats(App: AppContainer): BuilderDebugStatsLike | null {
  try {
    const builder = getBuilderWithDebugSurface(App);
    return builder && typeof builder.resetBuildDebugStats === 'function'
      ? builder.resetBuildDebugStats()
      : createEmptyBuildDebugStats();
  } catch {
    return createEmptyBuildDebugStats();
  }
}

export function getBuildRuntimeDebugBudget(App: AppContainer): BuildDebugBudgetSummaryLike | null {
  try {
    const builder = getBuilderWithDebugSurface(App);
    if (builder && typeof builder.getBuildDebugBudget === 'function') return builder.getBuildDebugBudget();
    return summarizeBuildDebugBudgetLocal(getBuildRuntimeDebugStats(App));
  } catch {
    return summarizeBuildDebugBudgetLocal(createEmptyBuildDebugStats());
  }
}

export function getRenderRuntimeDebugStats(App: AppContainer): RenderFollowThroughDebugStatsLike | null {
  try {
    return getPlatformRenderDebugStats(App);
  } catch {
    return null;
  }
}

export function resetRenderRuntimeDebugStats(App: AppContainer): RenderFollowThroughDebugStatsLike | null {
  try {
    return resetPlatformRenderDebugStats(App);
  } catch {
    return null;
  }
}

export function getRenderRuntimeDebugBudget(App: AppContainer): RenderFollowThroughBudgetSummaryLike | null {
  try {
    return getPlatformRenderDebugBudget(App);
  } catch {
    return null;
  }
}
