import type {
  AppContainer,
  BuildDebugBudgetSummaryLike,
  BuilderDebugStatsLike,
  ErrorsHistoryEntryLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  StoreDebugStats,
  WardrobeProBrowserPerfMetrics,
  WardrobeProDebugConsoleSurface,
  WardrobeProPerfConsoleSurface,
  WardrobeProPerfEntry,
  WardrobeProPerfMetricSummary,
  WardrobeProPerfStateFingerprint,
} from '../../../types/index.js';

export type ObservabilityInstallResult = {
  perf: WardrobeProPerfConsoleSurface | null;
  debug: WardrobeProDebugConsoleSurface | null;
};

type PerfEntryOptions = {
  detail?: unknown;
  status?: 'ok' | 'error' | 'mark';
  error?: unknown;
  metricValue?: number;
  metricUnit?: 'ms' | 'score' | 'count';
};

type PerfSpanOptions = {
  detail?: unknown;
  kind?: 'action' | 'phase' | 'interaction-wait' | 'render-settle';
  phase?: string;
  parentId?: string;
};

type PerfActionOptions<T> = PerfSpanOptions & {
  resolveEndOptions?: ((result: T) => PerfEntryOptions | void) | undefined;
  settleAfterRender?: boolean | string;
};

function normalizeNoopPerfEntryName(name: string): string {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  return trimmed || 'unknown';
}

function createNoopEntry(
  name: string,
  status: WardrobeProPerfEntry['status'],
  detail?: unknown
): WardrobeProPerfEntry {
  return {
    id: 'noop',
    name: normalizeNoopPerfEntryName(name),
    kind: status === 'mark' ? 'mark' : 'action',
    startTime: 0,
    endTime: 0,
    uxTotalMs: 0,
    codeExecutionMs: 0,
    interactionWaitMs: 0,
    status,
    ...(typeof detail !== 'undefined' ? { detail } : {}),
  };
}

export function getObservabilityBuildMode(): 'client' {
  return 'client';
}

export function isNonErrorPerfResultReason(reason: unknown): boolean {
  if (typeof reason !== 'string') return false;
  switch (reason.trim()) {
    case 'busy':
    case 'cancelled':
    case 'superseded':
    case 'noop':
    case 'same-hash':
    case 'same-client':
    case 'missing-file':
    case 'missing-autosave':
    case 'prompt':
    case 'prompt-unavailable':
    case 'confirm-unavailable':
    case 'focus':
    case 'typing':
      return true;
    default:
      return false;
  }
}

export function buildPerfEntryOptionsFromActionResult(_result?: unknown): PerfEntryOptions | undefined {
  return undefined;
}

export function markPerfPoint(
  _App: AppContainer,
  name: string,
  options: PerfEntryOptions = {}
): WardrobeProPerfEntry {
  return createNoopEntry(name, 'mark', options.detail);
}

export function startPerfSpan(_App: AppContainer, _name: string, _options: PerfSpanOptions = {}): string {
  return 'noop-span';
}

export function endPerfSpan(
  _App: AppContainer,
  _spanId: string,
  _options: PerfEntryOptions = {}
): WardrobeProPerfEntry | null {
  return null;
}

export async function runWithPerfSpan<T>(
  _App: AppContainer,
  _name: string,
  run: () => T | Promise<T>,
  _options: PerfSpanOptions = {}
): Promise<T> {
  return await run();
}

export function runPerfAction<T>(
  _App: AppContainer,
  _name: string,
  run: () => T,
  _options: PerfActionOptions<T> = {}
): T {
  return run();
}

export function recordPerfMetric(
  _App: AppContainer,
  name: string,
  metricValue: number,
  metricUnit: 'ms' | 'score' | 'count',
  options: PerfEntryOptions = {}
): WardrobeProPerfEntry {
  return {
    ...createNoopEntry(name, options.status === 'error' ? 'error' : 'ok', options.detail),
    kind: 'browser-metric',
    metricValue: Number.isFinite(metricValue) ? metricValue : 0,
    metricUnit,
  };
}

export function runPerfPhase<T>(_App: AppContainer, _name: string, _phase: string, run: () => T): T {
  return run();
}

export function runPerfInteractionWait<T>(_App: AppContainer, _name: string, run: () => T): T {
  return run();
}

export async function markPerfRenderSettle(
  _App: AppContainer,
  _reason: string,
  _detail?: unknown
): Promise<WardrobeProPerfEntry | null> {
  return null;
}

export function getPerfEntries(_App: AppContainer, _name?: string): WardrobeProPerfEntry[] {
  return [];
}

export function clearPerfEntries(_App: AppContainer): void {}

export function getPerfSummary(_App: AppContainer): Record<string, WardrobeProPerfMetricSummary> {
  return {};
}

export function getPerfStateFingerprint(_App: AppContainer): WardrobeProPerfStateFingerprint | null {
  return null;
}

export function getRuntimeErrorHistory(_App: AppContainer): ErrorsHistoryEntryLike[] {
  return [];
}

export function getStoreDebugStats(_App: AppContainer): StoreDebugStats | null {
  return null;
}

export function resetStoreDebugStats(_App: AppContainer): StoreDebugStats | null {
  return null;
}

export function getBuildRuntimeDebugStats(_App: AppContainer): BuilderDebugStatsLike | null {
  return null;
}

export function resetBuildRuntimeDebugStats(_App: AppContainer): BuilderDebugStatsLike | null {
  return null;
}

export function getBuildRuntimeDebugBudget(_App: AppContainer): BuildDebugBudgetSummaryLike | null {
  return null;
}

export function getRenderRuntimeDebugStats(_App: AppContainer): RenderFollowThroughDebugStatsLike | null {
  return null;
}

export function resetRenderRuntimeDebugStats(_App: AppContainer): RenderFollowThroughDebugStatsLike | null {
  return null;
}

export function getRenderRuntimeDebugBudget(_App: AppContainer): RenderFollowThroughBudgetSummaryLike | null {
  return null;
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
    getEntries(_name?: string): WardrobeProPerfEntry[] {
      return [];
    },
    clear(): void {},
    getSummary(): Record<string, WardrobeProPerfMetricSummary> {
      return {};
    },
    getBrowserMetrics(): WardrobeProBrowserPerfMetrics {
      return {
        observerSupported: false,
        supportedEntryTypes: [],
        cls: { value: 0, entryCount: 0, lastUpdatedAt: 0 },
        lcp: { valueMs: 0, entryCount: 0, lastUpdatedAt: 0 },
        longTasks: { count: 0, totalMs: 0, maxMs: 0, p95Ms: 0, lastUpdatedAt: 0 },
        renderSettle: { count: 0, totalMs: 0, maxMs: 0, p95Ms: 0, lastUpdatedAt: 0 },
      };
    },
    getStateFingerprint(): WardrobeProPerfStateFingerprint | null {
      return null;
    },
    getErrorHistory(): ErrorsHistoryEntryLike[] {
      return [];
    },
    getStoreDebugStats(): StoreDebugStats | null {
      return null;
    },
    resetStoreDebugStats(): StoreDebugStats | null {
      return null;
    },
    getBuildDebugStats(): BuilderDebugStatsLike | null {
      return null;
    },
    resetBuildDebugStats(): BuilderDebugStatsLike | null {
      return null;
    },
    getBuildDebugBudget(): BuildDebugBudgetSummaryLike | null {
      return null;
    },
    getRenderDebugStats(): RenderFollowThroughDebugStatsLike | null {
      return null;
    },
    resetRenderDebugStats(): RenderFollowThroughDebugStatsLike | null {
      return null;
    },
    getRenderDebugBudget(): RenderFollowThroughBudgetSummaryLike | null {
      return null;
    },
  };
}

export function installPerfRuntimeSurface(
  _App: AppContainer,
  _win: Window | null | undefined
): WardrobeProPerfConsoleSurface | null {
  return null;
}

export function installDebugConsoleSurface(
  _App: AppContainer,
  _win: Window | null | undefined
): WardrobeProDebugConsoleSurface | null {
  return null;
}

export function installObservabilityForBuild(
  _App: AppContainer,
  _win: Window | null | undefined
): ObservabilityInstallResult {
  return { perf: null, debug: null };
}
