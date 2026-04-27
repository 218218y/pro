// Browser-console debug helpers (installed at boot)
//
// Goals:
// - Do NOT expose the full App object globally.
// - Provide a tiny, explicit console surface for inspecting store churn.
// - Keep helpers browser-only and boot-time only (no import side effects).

import type {
  AppContainer,
  StoreDebugStats,
  StoreLike,
  StoreSourceDebugStat,
  WardrobeProDebugConsoleSurface,
  BuilderDebugStatsLike,
  BuildReasonDebugStatLike,
  BuildDebugBudgetSummaryLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
} from '../../../types/index.js';

import {
  getPlatformRenderDebugBudget,
  getPlatformRenderDebugStats,
  resetPlatformRenderDebugStats,
} from './platform_access.js';
import { getBuilderService } from './builder_service_access.js';
import {
  getCanvasPickingClickHandler,
  getCanvasPickingHoverHandler,
  inspectCanvasPickingClickNdc,
} from './canvas_picking_access.js';
import { asRecord } from './record.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';

type StoreWithDebug = StoreLike & {
  getDebugStats?: () => StoreDebugStats;
  resetDebugStats?: () => void;
};

type BuilderServiceWithDebug = {
  getBuildDebugStats?: () => BuilderDebugStatsLike;
  resetBuildDebugStats?: () => BuilderDebugStatsLike;
  getBuildDebugBudget?: () => BuildDebugBudgetSummaryLike;
};

type PlatformRenderDebugSurface = {
  getRenderDebugStats?: () => RenderFollowThroughDebugStatsLike | null;
  resetRenderDebugStats?: () => RenderFollowThroughDebugStatsLike | null;
  getRenderDebugBudget?: () => RenderFollowThroughBudgetSummaryLike | null;
};

function isBuilderServiceWithDebug(value: unknown): value is BuilderServiceWithDebug {
  const rec = asRecord(value);
  return (
    !!rec &&
    (typeof rec.getBuildDebugStats === 'function' || typeof rec.getBuildDebugStats === 'undefined') &&
    (typeof rec.resetBuildDebugStats === 'function' || typeof rec.resetBuildDebugStats === 'undefined') &&
    (typeof rec.getBuildDebugBudget === 'function' || typeof rec.getBuildDebugBudget === 'undefined')
  );
}

function isStoreWithDebug(value: unknown): value is StoreWithDebug {
  const rec = asRecord(value);
  return (
    !!rec &&
    typeof rec.getState === 'function' &&
    (typeof rec.getDebugStats === 'function' || typeof rec.getDebugStats === 'undefined') &&
    (typeof rec.resetDebugStats === 'function' || typeof rec.resetDebugStats === 'undefined')
  );
}

function getBuilderDebug(App: AppContainer | null | undefined): BuilderServiceWithDebug | null {
  try {
    const builder = getBuilderService(App);
    return isBuilderServiceWithDebug(builder) ? builder : null;
  } catch {
    return null;
  }
}

function getStore(App: AppContainer | null | undefined): StoreWithDebug | null {
  try {
    const store = getStoreSurfaceMaybe(App);
    return isStoreWithDebug(store) ? store : null;
  } catch {
    return null;
  }
}

function getRenderDebug(App: AppContainer | null | undefined): PlatformRenderDebugSurface | null {
  const platform = asRecord<PlatformRenderDebugSurface>(App?.services?.platform);
  return platform || null;
}

function normalizeLimit(limit: unknown): number {
  const n = typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : 10;
  if (n <= 0) return 1;
  if (n > 100) return 100;
  return n;
}

function normalizeNdc(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  if (n < -1) return -1;
  if (n > 1) return 1;
  return n;
}

function getTopBuildReasons(
  stats: BuilderDebugStatsLike | null | undefined,
  limit: unknown
): BuildReasonDebugStatLike[] {
  if (!stats || !stats.reasons || typeof stats.reasons !== 'object') return [];
  return Object.values(stats.reasons)
    .slice()
    .sort((a, b) => {
      const aExec = typeof a.executeCount === 'number' ? a.executeCount : 0;
      const bExec = typeof b.executeCount === 'number' ? b.executeCount : 0;
      if (bExec !== aExec) return bExec - aExec;
      const aReq = typeof a.requestCount === 'number' ? a.requestCount : 0;
      const bReq = typeof b.requestCount === 'number' ? b.requestCount : 0;
      return bReq - aReq;
    })
    .slice(0, normalizeLimit(limit));
}

function summarizeBuildBudgetLocal(
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
function getTopSourcesFromStats(
  stats: StoreDebugStats | null | undefined,
  limit: unknown
): StoreSourceDebugStat[] {
  if (!stats || !stats.sources || typeof stats.sources !== 'object') return [];
  return Object.values(stats.sources)
    .slice()
    .sort((a, b) => {
      const aTotal = typeof a.totalMs === 'number' ? a.totalMs : 0;
      const bTotal = typeof b.totalMs === 'number' ? b.totalMs : 0;
      if (bTotal !== aTotal) return bTotal - aTotal;
      const aCount = typeof a.count === 'number' ? a.count : 0;
      const bCount = typeof b.count === 'number' ? b.count : 0;
      return bCount - aCount;
    })
    .slice(0, normalizeLimit(limit));
}

export function createDebugConsoleSurface(App: AppContainer): WardrobeProDebugConsoleSurface {
  return {
    store: {
      getStats(): StoreDebugStats | null {
        const store = getStore(App);
        return store && typeof store.getDebugStats === 'function' ? store.getDebugStats() : null;
      },
      resetStats(): StoreDebugStats | null {
        const store = getStore(App);
        if (
          !store ||
          typeof store.getDebugStats !== 'function' ||
          typeof store.resetDebugStats !== 'function'
        )
          return null;
        const before = store.getDebugStats();
        store.resetDebugStats();
        return before;
      },
      getState(): unknown {
        const store = getStore(App);
        return store ? store.getState() : null;
      },
      getTopSources(limit?: number): StoreSourceDebugStat[] {
        const store = getStore(App);
        const stats = store && typeof store.getDebugStats === 'function' ? store.getDebugStats() : null;
        return getTopSourcesFromStats(stats, limit);
      },
    },
    build: {
      getStats(): BuilderDebugStatsLike | null {
        const builder = getBuilderDebug(App);
        return builder && typeof builder.getBuildDebugStats === 'function'
          ? builder.getBuildDebugStats()
          : null;
      },
      resetStats(): BuilderDebugStatsLike | null {
        const builder = getBuilderDebug(App);
        return builder && typeof builder.resetBuildDebugStats === 'function'
          ? builder.resetBuildDebugStats()
          : null;
      },
      getTopReasons(limit?: number): BuildReasonDebugStatLike[] {
        const builder = getBuilderDebug(App);
        const stats =
          builder && typeof builder.getBuildDebugStats === 'function' ? builder.getBuildDebugStats() : null;
        return getTopBuildReasons(stats, limit);
      },
      getBudget(): BuildDebugBudgetSummaryLike | null {
        const builder = getBuilderDebug(App);
        if (!builder) return null;
        if (typeof builder.getBuildDebugBudget === 'function') return builder.getBuildDebugBudget();
        const stats = typeof builder.getBuildDebugStats === 'function' ? builder.getBuildDebugStats() : null;
        return summarizeBuildBudgetLocal(stats);
      },
    },
    render: {
      getStats(): RenderFollowThroughDebugStatsLike | null {
        const platform = getRenderDebug(App);
        if (platform && typeof platform.getRenderDebugStats === 'function')
          return platform.getRenderDebugStats();
        return getPlatformRenderDebugStats(App);
      },
      resetStats(): RenderFollowThroughDebugStatsLike | null {
        const platform = getRenderDebug(App);
        if (platform && typeof platform.resetRenderDebugStats === 'function')
          return platform.resetRenderDebugStats();
        return resetPlatformRenderDebugStats(App);
      },
      getBudget(): RenderFollowThroughBudgetSummaryLike | null {
        const platform = getRenderDebug(App);
        if (platform && typeof platform.getRenderDebugBudget === 'function')
          return platform.getRenderDebugBudget();
        return getPlatformRenderDebugBudget(App);
      },
    },
    canvas: {
      clickNdc(x: number, y: number): boolean {
        const handleClick = getCanvasPickingClickHandler(App);
        if (typeof handleClick !== 'function') return false;
        handleClick(normalizeNdc(x), normalizeNdc(y));
        return true;
      },
      hoverNdc(x: number, y: number): boolean {
        const handleHover = getCanvasPickingHoverHandler(App);
        if (typeof handleHover !== 'function') return false;
        handleHover(normalizeNdc(x), normalizeNdc(y));
        return true;
      },
      inspectNdc(x: number, y: number) {
        return inspectCanvasPickingClickNdc(App, normalizeNdc(x), normalizeNdc(y));
      },
    },
  };
}

export function installDebugConsoleSurface(
  App: AppContainer,
  win: Window | null | undefined
): WardrobeProDebugConsoleSurface | null {
  try {
    if (!win || typeof win !== 'object') return null;
    const surface = createDebugConsoleSurface(App);
    Object.defineProperty(win, '__WP_DEBUG__', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: surface,
    });
    return surface;
  } catch {
    return null;
  }
}
