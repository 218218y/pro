import type {
  AppContainer,
  BuildDebugBudgetSummaryLike,
  BuilderDebugStatsLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  StoreDebugStats,
  WardrobeProPerfConsoleSurface,
  WardrobeProPerfEntry,
  WardrobeProPerfMetricSummary,
  WardrobeProPerfStateFingerprint,
} from '../../../types/index.js';

import {
  buildPerfEntryOptionsFromActionResult,
  clearPerfEntries,
  endPerfSpan,
  getPerfEntries,
  getPerfSummary,
  isNonErrorPerfResultReason,
  markPerfPoint,
  runPerfAction,
  runWithPerfSpan,
  startPerfSpan,
} from './perf_runtime_core.js';
import {
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  getStoreDebugStats,
  resetBuildRuntimeDebugStats,
  resetRenderRuntimeDebugStats,
  resetStoreDebugStats,
} from './perf_runtime_debug_surfaces.js';
import { getPerfStateFingerprint } from './perf_runtime_state_fingerprint.js';

export type { PerfActionOptions, PerfEntryOptions, PerfSpanOptions } from './perf_runtime_surface_types.js';
export {
  buildPerfEntryOptionsFromActionResult,
  clearPerfEntries,
  endPerfSpan,
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getPerfEntries,
  getPerfStateFingerprint,
  getPerfSummary,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  getStoreDebugStats,
  isNonErrorPerfResultReason,
  markPerfPoint,
  resetBuildRuntimeDebugStats,
  resetRenderRuntimeDebugStats,
  resetStoreDebugStats,
  runPerfAction,
  runWithPerfSpan,
  startPerfSpan,
};

export function createPerfConsoleSurface(App: AppContainer): WardrobeProPerfConsoleSurface {
  return {
    mark(name: string, detail?: unknown): WardrobeProPerfEntry {
      return markPerfPoint(App, name, { detail });
    },
    start(name: string, detail?: unknown): string {
      return startPerfSpan(App, name, { detail });
    },
    end(spanId: string, detail?: unknown): WardrobeProPerfEntry | null {
      return endPerfSpan(App, spanId, { detail });
    },
    getEntries(name?: string): WardrobeProPerfEntry[] {
      return getPerfEntries(App, name);
    },
    clear(): void {
      clearPerfEntries(App);
    },
    getSummary(): Record<string, WardrobeProPerfMetricSummary> {
      return getPerfSummary(App);
    },
    getStateFingerprint(): WardrobeProPerfStateFingerprint | null {
      return getPerfStateFingerprint(App);
    },
    getStoreDebugStats(): StoreDebugStats | null {
      return getStoreDebugStats(App);
    },
    resetStoreDebugStats(): StoreDebugStats | null {
      return resetStoreDebugStats(App);
    },
    getBuildDebugStats(): BuilderDebugStatsLike | null {
      return getBuildRuntimeDebugStats(App);
    },
    resetBuildDebugStats(): BuilderDebugStatsLike | null {
      return resetBuildRuntimeDebugStats(App);
    },
    getBuildDebugBudget(): BuildDebugBudgetSummaryLike | null {
      return getBuildRuntimeDebugBudget(App);
    },
    getRenderDebugStats(): RenderFollowThroughDebugStatsLike | null {
      return getRenderRuntimeDebugStats(App);
    },
    resetRenderDebugStats(): RenderFollowThroughDebugStatsLike | null {
      return resetRenderRuntimeDebugStats(App);
    },
    getRenderDebugBudget(): RenderFollowThroughBudgetSummaryLike | null {
      return getRenderRuntimeDebugBudget(App);
    },
  };
}

export function installPerfRuntimeSurface(
  App: AppContainer,
  win: Window | null | undefined
): WardrobeProPerfConsoleSurface | null {
  try {
    if (!win || typeof win !== 'object') return null;
    const surface = createPerfConsoleSurface(App);
    Object.defineProperty(win, '__WP_PERF__', {
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
