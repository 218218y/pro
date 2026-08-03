import type { AppContainer, WardrobeProBrowserPerfMetrics } from '../../../types/index.js';

import { getWindowMaybe } from './browser_env_surface.js';
import { asRecord } from './record.js';
import { getPerfEntries, recordPerfMetric } from './perf_runtime_core.js';

type PerfObserverLike = {
  observe: (options: PerformanceObserverInit) => void;
  disconnect: () => void;
};

type BrowserMetricState = {
  installed: boolean;
  observerSupported: boolean;
  supportedEntryTypes: string[];
  observers: PerfObserverLike[];
  clsValue: number;
  clsEntryCount: number;
  clsLastUpdatedAt: number;
  clsSessionValue: number;
  clsSessionStart: number;
  clsSessionLast: number;
  lcpValueMs: number;
  lcpEntryCount: number;
  lcpLastUpdatedAt: number;
  longTaskSamplesMs: number[];
  longTaskLastUpdatedAt: number;
};

const PERF_BROWSER_METRICS_KEY = 'perfBrowserMetrics';

function roundMetric(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Number(value.toFixed(4))) : 0;
}

function percentile(sortedValues: number[], ratio: number): number {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index] || 0;
}

function createBrowserMetricState(): BrowserMetricState {
  return {
    installed: false,
    observerSupported: false,
    supportedEntryTypes: [],
    observers: [],
    clsValue: 0,
    clsEntryCount: 0,
    clsLastUpdatedAt: 0,
    clsSessionValue: 0,
    clsSessionStart: -1,
    clsSessionLast: 0,
    lcpValueMs: 0,
    lcpEntryCount: 0,
    lcpLastUpdatedAt: 0,
    longTaskSamplesMs: [],
    longTaskLastUpdatedAt: 0,
  };
}

function getBrowserMetricState(App: AppContainer): BrowserMetricState {
  const services = asRecord<Record<string, unknown>>(App.services, () => ({})) ?? {};
  App.services = services;
  const existing = asRecord<BrowserMetricState>(services[PERF_BROWSER_METRICS_KEY]);
  if (existing && Array.isArray(existing.observers) && Array.isArray(existing.longTaskSamplesMs)) {
    return existing;
  }
  const created = createBrowserMetricState();
  services[PERF_BROWSER_METRICS_KEY] = created;
  return created;
}

function readPerformanceObserverConstructor(win: Window): typeof PerformanceObserver | null {
  const ctor = Reflect.get(win, 'PerformanceObserver');
  return typeof ctor === 'function' ? (ctor as typeof PerformanceObserver) : null;
}

function readSupportedEntryTypes(ctor: typeof PerformanceObserver): string[] {
  const value = Reflect.get(ctor, 'supportedEntryTypes');
  return Array.isArray(value) ? value.map(item => String(item || '')).filter(Boolean) : [];
}

function installObserver(
  ctor: typeof PerformanceObserver,
  type: string,
  callback: (entries: PerformanceEntry[]) => void
): PerfObserverLike | null {
  try {
    const observer = new ctor(list => callback(list.getEntries()));
    try {
      observer.observe({ type, buffered: true });
    } catch {
      observer.observe({ entryTypes: [type] });
    }
    return observer;
  } catch {
    return null;
  }
}

function handleLayoutShiftEntries(
  App: AppContainer,
  state: BrowserMetricState,
  entries: PerformanceEntry[]
): void {
  for (const entry of entries) {
    const raw = asRecord<Record<string, unknown>>(entry);
    if (!raw || raw.hadRecentInput === true) continue;
    const value = Number(raw.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    const startTime = Number(entry.startTime) || 0;
    const startsNewSession =
      state.clsSessionStart < 0 ||
      startTime - state.clsSessionLast > 1000 ||
      startTime - state.clsSessionStart > 5000;
    if (startsNewSession) {
      state.clsSessionStart = startTime;
      state.clsSessionValue = value;
    } else {
      state.clsSessionValue += value;
    }
    state.clsSessionLast = startTime;
    state.clsValue = Math.max(state.clsValue, state.clsSessionValue);
    state.clsEntryCount += 1;
    state.clsLastUpdatedAt = startTime;
    recordPerfMetric(App, 'browser.cls', state.clsValue, 'score', {
      detail: {
        shiftValue: roundMetric(value),
        sessionValue: roundMetric(state.clsSessionValue),
        cumulativeValue: roundMetric(state.clsValue),
      },
    });
  }
}

function handleLcpEntries(App: AppContainer, state: BrowserMetricState, entries: PerformanceEntry[]): void {
  for (const entry of entries) {
    const raw = asRecord<Record<string, unknown>>(entry) || {};
    const renderTime = Number(raw.renderTime);
    const loadTime = Number(raw.loadTime);
    const valueMs = Math.max(
      Number.isFinite(renderTime) ? renderTime : 0,
      Number.isFinite(loadTime) ? loadTime : 0,
      Number(entry.startTime) || 0
    );
    state.lcpValueMs = roundMetric(valueMs);
    state.lcpEntryCount += 1;
    state.lcpLastUpdatedAt = Number(entry.startTime) || valueMs;
    recordPerfMetric(App, 'browser.lcp', state.lcpValueMs, 'ms', {
      detail: {
        entryType: entry.entryType,
        size: Number.isFinite(Number(raw.size)) ? Number(raw.size) : 0,
        elementId: typeof raw.id === 'string' ? raw.id : '',
        url: typeof raw.url === 'string' ? raw.url : '',
      },
    });
  }
}

function handleLongTaskEntries(
  App: AppContainer,
  state: BrowserMetricState,
  entries: PerformanceEntry[]
): void {
  for (const entry of entries) {
    const durationMs = roundMetric(Number(entry.duration) || 0);
    if (durationMs <= 0) continue;
    state.longTaskSamplesMs.push(durationMs);
    if (state.longTaskSamplesMs.length > 500)
      state.longTaskSamplesMs.splice(0, state.longTaskSamplesMs.length - 500);
    state.longTaskLastUpdatedAt = Number(entry.startTime) || 0;
    recordPerfMetric(App, 'browser.longTask', durationMs, 'ms', {
      detail: {
        startTime: roundMetric(Number(entry.startTime) || 0),
        attributionCount: Array.isArray(Reflect.get(entry, 'attribution'))
          ? (Reflect.get(entry, 'attribution') as unknown[]).length
          : 0,
      },
    });
  }
}

export function installBrowserPerformanceObservers(
  App: AppContainer,
  win: Window | null | undefined = getWindowMaybe(App)
): void {
  const state = getBrowserMetricState(App);
  if (state.installed || !win) return;
  state.installed = true;

  const ctor = readPerformanceObserverConstructor(win);
  if (!ctor) return;
  state.observerSupported = true;
  state.supportedEntryTypes = readSupportedEntryTypes(ctor);

  const definitions = [
    ['layout-shift', (entries: PerformanceEntry[]) => handleLayoutShiftEntries(App, state, entries)],
    ['largest-contentful-paint', (entries: PerformanceEntry[]) => handleLcpEntries(App, state, entries)],
    ['longtask', (entries: PerformanceEntry[]) => handleLongTaskEntries(App, state, entries)],
  ] as const;

  for (const [type, callback] of definitions) {
    if (state.supportedEntryTypes.length > 0 && !state.supportedEntryTypes.includes(type)) continue;
    const observer = installObserver(ctor, type, callback);
    if (observer) state.observers.push(observer);
  }
}

export function resetBrowserPerformanceMetrics(App: AppContainer): void {
  const state = getBrowserMetricState(App);
  state.clsValue = 0;
  state.clsEntryCount = 0;
  state.clsLastUpdatedAt = 0;
  state.clsSessionValue = 0;
  state.clsSessionStart = -1;
  state.clsSessionLast = 0;
  state.lcpValueMs = 0;
  state.lcpEntryCount = 0;
  state.lcpLastUpdatedAt = 0;
  state.longTaskSamplesMs = [];
  state.longTaskLastUpdatedAt = 0;
}

export function getBrowserPerformanceMetrics(App: AppContainer): WardrobeProBrowserPerfMetrics {
  const state = getBrowserMetricState(App);
  const longTaskSamples = state.longTaskSamplesMs.toSorted((left, right) => left - right);
  const renderSettleSamples = getPerfEntries(App, 'render.settle')
    .filter(entry => entry.kind === 'render-settle')
    .map(entry => entry.uxTotalMs)
    .sort((left, right) => left - right);
  const longTaskTotal = longTaskSamples.reduce((sum, value) => sum + value, 0);
  const renderSettleTotal = renderSettleSamples.reduce((sum, value) => sum + value, 0);
  const renderSettleLast = getPerfEntries(App, 'render.settle').at(-1);
  return {
    observerSupported: state.observerSupported,
    supportedEntryTypes: state.supportedEntryTypes.slice(),
    cls: {
      value: roundMetric(state.clsValue),
      entryCount: state.clsEntryCount,
      lastUpdatedAt: roundMetric(state.clsLastUpdatedAt),
    },
    lcp: {
      valueMs: roundMetric(state.lcpValueMs),
      entryCount: state.lcpEntryCount,
      lastUpdatedAt: roundMetric(state.lcpLastUpdatedAt),
    },
    longTasks: {
      count: longTaskSamples.length,
      totalMs: roundMetric(longTaskTotal),
      maxMs: longTaskSamples.length ? roundMetric(longTaskSamples.at(-1) || 0) : 0,
      p95Ms: longTaskSamples.length ? roundMetric(percentile(longTaskSamples, 0.95)) : 0,
      lastUpdatedAt: roundMetric(state.longTaskLastUpdatedAt),
    },
    renderSettle: {
      count: renderSettleSamples.length,
      totalMs: roundMetric(renderSettleTotal),
      maxMs: renderSettleSamples.length ? roundMetric(renderSettleSamples.at(-1) || 0) : 0,
      p95Ms: renderSettleSamples.length ? roundMetric(percentile(renderSettleSamples, 0.95)) : 0,
      lastUpdatedAt: roundMetric(renderSettleLast?.endTime || 0),
    },
  };
}
