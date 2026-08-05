import type { AppContainer, WardrobeProBrowserPerfMetrics } from '../../../types/index.js';

import { getWindowMaybe } from './browser_env_surface.js';
import { asRecord } from './record.js';
import { getPerfEntries, recordPerfMetric } from './perf_runtime_core.js';

type PerfObserverLike = {
  observe: (options: PerformanceObserverInit) => void;
  disconnect: () => void;
};

type InteractionMetricCandidate = {
  interactionId: number;
  latencyMs: number;
  startTime: number;
  eventName: string;
  inputDelayMs: number;
  processingDurationMs: number;
  presentationDelayMs: number;
  targetLabel: string;
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
  inpCandidates: Map<number, InteractionMetricCandidate>;
  inpFirstInputCandidate: InteractionMetricCandidate | null;
  inpInteractionCount: number;
  inpEventEntryCount: number;
  inpLastUpdatedAt: number;
  inpLastRecordedSignature: string;
};

const PERF_BROWSER_METRICS_KEY = 'perfBrowserMetrics';
const EVENT_TIMING_DURATION_THRESHOLD_MS = 16;
const MAX_TRACKED_INTERACTIONS = 5000;

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
    inpCandidates: new Map(),
    inpFirstInputCandidate: null,
    inpInteractionCount: 0,
    inpEventEntryCount: 0,
    inpLastUpdatedAt: 0,
    inpLastRecordedSignature: '',
  };
}

function hydrateBrowserMetricState(existing: BrowserMetricState): BrowserMetricState {
  if (!(existing.inpCandidates instanceof Map)) existing.inpCandidates = new Map();
  if ((existing as Partial<BrowserMetricState>).inpFirstInputCandidate === undefined) {
    existing.inpFirstInputCandidate = null;
  }
  if (!Number.isFinite(existing.inpInteractionCount)) existing.inpInteractionCount = 0;
  if (!Number.isFinite(existing.inpEventEntryCount)) existing.inpEventEntryCount = 0;
  if (!Number.isFinite(existing.inpLastUpdatedAt)) existing.inpLastUpdatedAt = 0;
  if (typeof existing.inpLastRecordedSignature !== 'string') existing.inpLastRecordedSignature = '';
  return existing;
}

function getBrowserMetricState(App: AppContainer): BrowserMetricState {
  const services = asRecord<Record<string, unknown>>(App.services, () => ({})) ?? {};
  App.services = services;
  const existing = asRecord<BrowserMetricState>(services[PERF_BROWSER_METRICS_KEY]);
  if (existing && Array.isArray(existing.observers) && Array.isArray(existing.longTaskSamplesMs)) {
    return hydrateBrowserMetricState(existing);
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
  callback: (entries: PerformanceEntry[]) => void,
  options: Partial<PerformanceObserverInit> = {}
): PerfObserverLike | null {
  try {
    const observer = new ctor(list => callback(list.getEntries()));
    try {
      observer.observe({ type, buffered: true, ...options } as PerformanceObserverInit);
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

function readInteractionCount(win: Window): number {
  const perf = asRecord<Record<string, unknown>>(Reflect.get(win, 'performance'));
  const value = Number(perf?.interactionCount);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function readTargetLabel(raw: Record<string, unknown>): string {
  const target = asRecord<Record<string, unknown>>(raw.target);
  if (!target) return '';
  const tagName = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  const id = typeof target.id === 'string' && target.id ? `#${target.id}` : '';
  return `${tagName}${id}`;
}

function createInteractionCandidate(entry: PerformanceEntry): InteractionMetricCandidate | null {
  const raw = asRecord<Record<string, unknown>>(entry) || {};
  const latencyMs = roundMetric(Number(entry.duration) || 0);
  if (latencyMs <= 0) return null;
  const interactionId = Number(raw.interactionId);
  const startTime = roundMetric(Number(entry.startTime) || 0);
  const processingStart = Number(raw.processingStart);
  const processingEnd = Number(raw.processingEnd);
  const inputDelayMs = Number.isFinite(processingStart)
    ? roundMetric(Math.max(0, processingStart - startTime))
    : 0;
  const processingDurationMs =
    Number.isFinite(processingStart) && Number.isFinite(processingEnd)
      ? roundMetric(Math.max(0, processingEnd - processingStart))
      : 0;
  const presentationDelayMs = Number.isFinite(processingEnd)
    ? roundMetric(Math.max(0, startTime + latencyMs - processingEnd))
    : 0;
  return {
    interactionId: Number.isFinite(interactionId) && interactionId > 0 ? Math.floor(interactionId) : 0,
    latencyMs,
    startTime,
    eventName: typeof entry.name === 'string' ? entry.name : '',
    inputDelayMs,
    processingDurationMs,
    presentationDelayMs,
    targetLabel: readTargetLabel(raw),
  };
}

function pruneInteractionCandidates(state: BrowserMetricState): void {
  if (state.inpCandidates.size <= MAX_TRACKED_INTERACTIONS) return;
  const keep = Array.from(state.inpCandidates.values())
    .sort((left, right) => right.latencyMs - left.latencyMs)
    .slice(0, Math.floor(MAX_TRACKED_INTERACTIONS * 0.8));
  state.inpCandidates = new Map(keep.map(candidate => [candidate.interactionId, candidate]));
}

function estimateInp(state: BrowserMetricState): {
  candidate: InteractionMetricCandidate | null;
  source: WardrobeProBrowserPerfMetrics['inp']['source'];
  rank: number;
  interactionCount: number;
} {
  const candidates = Array.from(state.inpCandidates.values()).sort(
    (left, right) => right.latencyMs - left.latencyMs
  );
  const interactionCount = Math.max(state.inpInteractionCount, state.inpCandidates.size);
  if (candidates.length) {
    const rank = Math.min(candidates.length - 1, Math.max(0, Math.floor(interactionCount / 50)));
    return { candidate: candidates[rank] || null, source: 'event', rank, interactionCount };
  }
  if (state.inpFirstInputCandidate) {
    return {
      candidate: state.inpFirstInputCandidate,
      source: 'first-input',
      rank: 0,
      interactionCount: Math.max(interactionCount, 1),
    };
  }
  return { candidate: null, source: 'none', rank: 0, interactionCount };
}

function recordInpEstimate(App: AppContainer, state: BrowserMetricState): void {
  const estimate = estimateInp(state);
  const candidate = estimate.candidate;
  if (!candidate) return;
  const signature = [
    estimate.source,
    estimate.rank,
    candidate.interactionId,
    candidate.latencyMs,
    estimate.interactionCount,
    state.inpCandidates.size,
  ].join(':');
  if (signature === state.inpLastRecordedSignature) return;
  state.inpLastRecordedSignature = signature;
  state.inpLastUpdatedAt = candidate.startTime;
  recordPerfMetric(App, 'browser.inp', candidate.latencyMs, 'ms', {
    detail: {
      source: estimate.source,
      p98Rank: estimate.rank,
      interactionCount: estimate.interactionCount,
      observedInteractionCount: state.inpCandidates.size,
      eventEntryCount: state.inpEventEntryCount,
      interactionId: candidate.interactionId,
      eventName: candidate.eventName,
      targetLabel: candidate.targetLabel,
      inputDelayMs: candidate.inputDelayMs,
      processingDurationMs: candidate.processingDurationMs,
      presentationDelayMs: candidate.presentationDelayMs,
    },
  });
}

function handleInteractionEntries(
  App: AppContainer,
  win: Window,
  state: BrowserMetricState,
  entries: PerformanceEntry[]
): void {
  for (const entry of entries) {
    const candidate = createInteractionCandidate(entry);
    if (!candidate) continue;
    state.inpEventEntryCount += 1;
    if (entry.entryType === 'first-input' && !state.inpFirstInputCandidate) {
      state.inpFirstInputCandidate = candidate;
    }
    if (candidate.interactionId > 0) {
      const existing = state.inpCandidates.get(candidate.interactionId);
      if (!existing || candidate.latencyMs > existing.latencyMs) {
        state.inpCandidates.set(candidate.interactionId, candidate);
      }
    }
  }
  state.inpInteractionCount = Math.max(
    state.inpInteractionCount,
    readInteractionCount(win),
    state.inpCandidates.size
  );
  pruneInteractionCandidates(state);
  recordInpEstimate(App, state);
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
    {
      type: 'layout-shift',
      callback: (entries: PerformanceEntry[]) => handleLayoutShiftEntries(App, state, entries),
    },
    {
      type: 'largest-contentful-paint',
      callback: (entries: PerformanceEntry[]) => handleLcpEntries(App, state, entries),
    },
    {
      type: 'longtask',
      callback: (entries: PerformanceEntry[]) => handleLongTaskEntries(App, state, entries),
    },
    {
      type: 'event',
      callback: (entries: PerformanceEntry[]) => handleInteractionEntries(App, win, state, entries),
      options: { durationThreshold: EVENT_TIMING_DURATION_THRESHOLD_MS } as Partial<PerformanceObserverInit>,
    },
    {
      type: 'first-input',
      callback: (entries: PerformanceEntry[]) => handleInteractionEntries(App, win, state, entries),
    },
  ] as const;

  for (const definition of definitions) {
    if (state.supportedEntryTypes.length > 0 && !state.supportedEntryTypes.includes(definition.type))
      continue;
    const observer = installObserver(
      ctor,
      definition.type,
      definition.callback,
      'options' in definition ? definition.options : undefined
    );
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
  state.inpCandidates.clear();
  state.inpFirstInputCandidate = null;
  state.inpInteractionCount = 0;
  state.inpEventEntryCount = 0;
  state.inpLastUpdatedAt = 0;
  state.inpLastRecordedSignature = '';
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
  const inp = estimateInp(state);
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
    inp: {
      valueMs: roundMetric(inp.candidate?.latencyMs || 0),
      interactionCount: inp.interactionCount,
      observedInteractionCount: state.inpCandidates.size,
      entryCount: state.inpEventEntryCount,
      p98Rank: inp.rank,
      interactionId: inp.candidate?.interactionId || 0,
      source: inp.source,
      lastUpdatedAt: roundMetric(state.inpLastUpdatedAt),
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
