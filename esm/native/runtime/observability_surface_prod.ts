import type {
  AppContainer,
  BuildDebugBudgetSummaryLike,
  BuilderDebugStatsLike,
  ErrorsHistoryEntryLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  StoreDebugStats,
  WardrobeProDebugConsoleSurface,
  WardrobeProPerfConsoleSurface,
  WardrobeProPerfEntry,
  WardrobeProPerfMetricSummary,
  WardrobeProPerfStateFingerprint,
} from '../../../types/index.js';

const PERF_RESULT_MARK_REASONS = new Set([
  'busy',
  'cancelled',
  'superseded',
  'noop',
  'same-hash',
  'same-client',
  'missing-file',
  'missing-autosave',
  'prompt',
  'prompt-unavailable',
  'confirm-unavailable',
  'focus',
  'typing',
]);

export type ObservabilityInstallResult = {
  perf: WardrobeProPerfConsoleSurface | null;
  debug: WardrobeProDebugConsoleSurface | null;
};

type PerfEntryOptions = {
  detail?: unknown;
  status?: 'ok' | 'error' | 'mark';
  error?: unknown;
};

type PerfSpanOptions = {
  detail?: unknown;
};

type PerfActionOptions<T> = PerfSpanOptions & {
  resolveEndOptions?: ((result: T) => PerfEntryOptions | void) | undefined;
};

function nowMs(): number {
  try {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    // ignore
  }
  return Date.now();
}

function createNoopEntry(
  name: string,
  status: WardrobeProPerfEntry['status'],
  detail?: unknown
): WardrobeProPerfEntry {
  const stamp = nowMs();
  return {
    id: `noop-${Math.random().toString(36).slice(2, 10)}`,
    name: typeof name === 'string' && name.trim() ? name.trim() : 'unknown',
    startTime: stamp,
    endTime: stamp,
    durationMs: 0,
    status,
    ...(typeof detail !== 'undefined' ? { detail } : {}),
  };
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof Reflect.get(value, 'then') === 'function'
  );
}

export function getObservabilityBuildMode(): 'client' {
  return 'client';
}

export function isNonErrorPerfResultReason(reason: unknown): boolean {
  return typeof reason === 'string' && PERF_RESULT_MARK_REASONS.has(reason.trim());
}

export function buildPerfEntryOptionsFromActionResult(): PerfEntryOptions | undefined {
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
  const result = run();
  if (isPromiseLike<T>(result)) {
    return Promise.resolve(result) as T;
  }
  return result;
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
