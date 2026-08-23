import type {
  AppContainer,
  BuildDebugBudgetSummaryLike,
  BuilderDebugStatsLike,
  ErrorsHistoryEntryLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  StoreDebugStats,
  WardrobeProBrowserPerfMetrics,
  WardrobeProPerfConsoleSurface,
  WardrobeProPerfEntry,
  WardrobeProPerfMetricSummary,
  WardrobeProRendererInfoSnapshot,
  WardrobeProSceneContentSnapshot,
  WardrobeProPerfStateFingerprint,
  VisualContentGeometryCacheStatsLike,
} from '../../../types/index.js';

import {
  buildPerfEntryOptionsFromActionResult,
  clearPerfEntries,
  endPerfSpan,
  getPerfEntries,
  getPerfSummary,
  isNonErrorPerfResultReason,
  markPerfPoint,
  markPerfRenderSettle,
  recordPerfMetric,
  runPerfAction,
  runPerfInteractionWait,
  runPerfPhase,
  runWithPerfSpan,
  startPerfSpan,
} from './perf_runtime_core.js';
import { getErrorsServiceMaybe } from './errors_access.js';
import {
  getBrowserPerformanceMetrics,
  installBrowserPerformanceObservers,
  resetBrowserPerformanceMetrics,
} from './perf_runtime_browser_observer.js';
import {
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  getStoreDebugStats,
  resetBuildRuntimeDebugStats,
  resetRenderRuntimeDebugStats,
  resetStoreDebugStats,
  getVisualContentGeometryCacheRuntimeStats,
  resetVisualContentGeometryCacheRuntimeStats,
} from './perf_runtime_debug_surfaces.js';
import { getPerfStateFingerprint } from './perf_runtime_state_fingerprint.js';
import { getRendererInfoSnapshot, getSceneContentSnapshot } from './perf_runtime_render_snapshot.js';
import { requestPerfRenderFrameSample } from './perf_runtime_frame_sampler.js';
import { setDoorsOpenViaService } from './doors_access.js';
import { triggerAdhesiveGlassDesignIntentWarmup } from './adhesive_glass_shader_warmup_design_intent.js';

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
  markPerfRenderSettle,
  recordPerfMetric,
  resetBuildRuntimeDebugStats,
  resetRenderRuntimeDebugStats,
  resetStoreDebugStats,
  runPerfAction,
  runPerfInteractionWait,
  runPerfPhase,
  runWithPerfSpan,
  startPerfSpan,
};

export function getRuntimeErrorHistory(App: AppContainer): ErrorsHistoryEntryLike[] {
  try {
    const history = getErrorsServiceMaybe(App)?.getHistory?.();
    return Array.isArray(history) ? history.slice() : [];
  } catch {
    return [];
  }
}

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
      resetBrowserPerformanceMetrics(App);
    },
    getSummary(): Record<string, WardrobeProPerfMetricSummary> {
      return getPerfSummary(App);
    },
    getBrowserMetrics(): WardrobeProBrowserPerfMetrics {
      return getBrowserPerformanceMetrics(App);
    },
    getStateFingerprint(): WardrobeProPerfStateFingerprint | null {
      return getPerfStateFingerprint(App);
    },
    getRendererInfoSnapshot(): WardrobeProRendererInfoSnapshot | null {
      return getRendererInfoSnapshot(App);
    },
    getSceneContentSnapshot(): WardrobeProSceneContentSnapshot | null {
      return getSceneContentSnapshot(App);
    },
    getVisualContentGeometryCacheStats(): VisualContentGeometryCacheStatsLike | null {
      return getVisualContentGeometryCacheRuntimeStats(App);
    },
    resetVisualContentGeometryCacheStats(): VisualContentGeometryCacheStatsLike | null {
      return resetVisualContentGeometryCacheRuntimeStats(App);
    },
    sampleRendererFrames(count: number): Promise<WardrobeProPerfEntry[]> {
      return requestPerfRenderFrameSample(App, count, () => getPerfEntries(App));
    },
    scheduleAdhesiveGlassWarmupForDesignIntent(): void {
      triggerAdhesiveGlassDesignIntentWarmup(App);
    },
    setDoorsOpenForVisualProbe(open: boolean): boolean {
      return setDoorsOpenViaService(App, open, {
        touch: true,
        forceUpdate: true,
        source: 'perf:visual-probe',
      });
    },
    getErrorHistory(): ErrorsHistoryEntryLike[] {
      return getRuntimeErrorHistory(App);
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
    installBrowserPerformanceObservers(App, win);
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
