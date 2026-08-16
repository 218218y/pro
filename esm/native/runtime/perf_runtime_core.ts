import type {
  AppContainer,
  WardrobeProPerfEntry,
  WardrobeProPerfEntryKind,
  WardrobeProPerfMetricSummary,
} from '../../../types/index.js';

import type {
  PerfActionOptions,
  PerfEntryOptions,
  PerfMetricUnit,
  PerfSpanOptions,
} from './perf_runtime_surface_types.js';
import { getRuntimeConfigRootMaybe } from './app_roots_access.js';
import { getWindowMaybe } from './browser_env_surface.js';
import { requestAnimationFrameMaybe } from './browser_env_timers.js';
import { getDepMaybe } from './deps_access.js';
import { asRecord } from './record.js';
import { normalizeUnknownError } from './error_normalization.js';

type MeasuredPerfKind = Exclude<WardrobeProPerfEntryKind, 'browser-metric' | 'mark'>;

type PerfRuntimeSpanRecord = {
  id: string;
  name: string;
  kind: MeasuredPerfKind;
  phase?: string;
  parentId?: string;
  startTime: number;
  interactionWaitIntervals: Array<{ startTime: number; endTime: number }>;
  detail?: unknown;
};

type PerfRuntimeStore = {
  entries: WardrobeProPerfEntry[];
  inflight: Map<string, PerfRuntimeSpanRecord>;
  nextId: number;
  limit: number;
};

const PERF_RUNTIME_KEY = 'perfRuntime';
const DEFAULT_ENTRY_LIMIT = 400;

function nowMs(): number {
  try {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    // Use wall-clock time when the browser timing surface is unavailable.
  }
  return Date.now();
}

function normalizeLimit(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : DEFAULT_ENTRY_LIMIT;
  if (n < 50) return 50;
  if (n > 2000) return 2000;
  return n;
}

function normalizeName(value: unknown, defaultName = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : defaultName;
}

function normalizePhase(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeStatus(value: unknown): 'ok' | 'error' | 'mark' {
  return value === 'error' || value === 'mark' ? value : 'ok';
}

function normalizeMeasuredKind(value: unknown): MeasuredPerfKind {
  return value === 'phase' || value === 'interaction-wait' || value === 'render-settle' ? value : 'action';
}

function normalizeErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  const message = normalizeUnknownError(error).message.trim();
  return message || undefined;
}

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

function normalizePerfResultStatus(value: unknown): 'ok' | 'error' | 'mark' | null {
  return value === 'error' || value === 'mark' || value === 'ok' ? value : null;
}

export function isNonErrorPerfResultReason(reason: unknown): boolean {
  return typeof reason === 'string' && PERF_RESULT_MARK_REASONS.has(reason.trim());
}

function mergePerfDetail(primary: unknown, baseDetail: unknown): unknown {
  if (typeof primary === 'undefined') return baseDetail;
  if (typeof baseDetail === 'undefined') return primary;
  const primaryRecord = asRecord<Record<string, unknown>>(primary);
  const baseRecord = asRecord<Record<string, unknown>>(baseDetail);
  if (primaryRecord && baseRecord) return { ...baseRecord, ...primaryRecord };
  return primary;
}

export function buildPerfEntryOptionsFromActionResult(result: unknown): PerfEntryOptions | undefined {
  const rec = asRecord<Record<string, unknown>>(result);
  if (!rec) return undefined;

  const reason = typeof rec.reason === 'string' && rec.reason.trim() ? rec.reason.trim() : undefined;
  const message = typeof rec.message === 'string' && rec.message.trim() ? rec.message.trim() : undefined;
  const outcome = typeof rec.outcome === 'string' && rec.outcome.trim() ? rec.outcome.trim() : undefined;
  const perfStatus = normalizePerfResultStatus(rec.perfStatus);
  const perfError = normalizeErrorMessage(rec.perfError);
  const warningEffects = Array.isArray(rec.warnings)
    ? rec.warnings
        .map(warning => asRecord<Record<string, unknown>>(warning)?.effect)
        .filter((effect): effect is string => typeof effect === 'string' && !!effect.trim())
    : [];

  const detail: Record<string, unknown> = {};
  if (reason) detail.reason = reason;
  if (rec.pending === true) detail.pending = true;
  if (outcome) detail.outcome = outcome;
  if (message) detail.message = message;
  if (warningEffects.length) {
    detail.warningCount = warningEffects.length;
    detail.warningEffects = warningEffects;
  }

  if (perfStatus) {
    return {
      ...(perfStatus !== 'ok' ? { status: perfStatus } : {}),
      ...(Object.keys(detail).length ? { detail } : {}),
      ...((perfStatus === 'error' ? perfError || message || reason : perfError)
        ? { error: perfError || message || reason }
        : {}),
    };
  }

  if (rec.ok === false) {
    if (isNonErrorPerfResultReason(reason)) {
      return {
        status: 'mark',
        detail: {
          ...detail,
          outcome: 'non-error',
        },
      };
    }
    return {
      status: 'error',
      ...(Object.keys(detail).length ? { detail } : {}),
      ...(message || reason ? { error: message || reason } : {}),
    };
  }

  if (rec.ok === true && Object.keys(detail).length) {
    return { detail };
  }

  return perfError ? { error: perfError } : undefined;
}

function getPerfRuntimeStore(App: AppContainer): PerfRuntimeStore {
  const services = asRecord<Record<string, unknown>>(App.services, () => ({})) ?? {};
  App.services = services;
  const existing = asRecord<Partial<PerfRuntimeStore>>(services[PERF_RUNTIME_KEY]);
  if (
    existing &&
    Array.isArray(existing.entries) &&
    existing.inflight instanceof Map &&
    typeof existing.nextId === 'number'
  ) {
    return existing as PerfRuntimeStore;
  }
  const configRoot = asRecord<Record<string, unknown>>(getRuntimeConfigRootMaybe(App));
  const depsConfig = asRecord<Record<string, unknown>>(getDepMaybe(App, 'config'));
  const entryLimit = configRoot?.perfRuntimeEntryLimit ?? depsConfig?.perfRuntimeEntryLimit;
  const created: PerfRuntimeStore = {
    entries: [],
    inflight: new Map(),
    nextId: 1,
    limit: normalizeLimit(entryLimit),
  };
  services[PERF_RUNTIME_KEY] = created;
  return created;
}

function roundDuration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Number(value.toFixed(2))) : 0;
}

function emitPerfEntry(App: AppContainer, entry: WardrobeProPerfEntry): void {
  const win =
    asRecord<{ dispatchEvent?: (evt: Event) => void }>(App?.window) ??
    asRecord<{ dispatchEvent?: (evt: Event) => void }>(getWindowMaybe(App));
  const dispatch = win?.dispatchEvent;
  if (typeof dispatch !== 'function' || typeof CustomEvent === 'undefined') return;
  try {
    dispatch.call(win, new CustomEvent('wardrobepro:perf-entry', { detail: entry }));
  } catch {
    // Diagnostics must never affect the measured operation.
  }
}

function pushPerfEntry(App: AppContainer, entry: WardrobeProPerfEntry): WardrobeProPerfEntry {
  const store = getPerfRuntimeStore(App);
  store.entries.push(entry);
  if (store.entries.length > store.limit) store.entries.splice(0, store.entries.length - store.limit);
  emitPerfEntry(App, entry);
  return entry;
}

function percentile(sortedValues: number[], ratio: number): number {
  if (!sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index] || 0;
}

function calculateInteractionWaitOverlap(action: PerfRuntimeSpanRecord, actionEndTime: number): number {
  const intervals = action.interactionWaitIntervals
    .map(interval => ({
      startTime: Math.max(action.startTime, interval.startTime),
      endTime: Math.min(actionEndTime, interval.endTime),
    }))
    .filter(interval => interval.endTime > interval.startTime)
    .sort((left, right) => left.startTime - right.startTime);

  let total = 0;
  let activeStart = 0;
  let activeEnd = 0;
  let hasActiveInterval = false;
  for (const interval of intervals) {
    if (!hasActiveInterval) {
      activeStart = interval.startTime;
      activeEnd = interval.endTime;
      hasActiveInterval = true;
      continue;
    }
    if (interval.startTime <= activeEnd) {
      activeEnd = Math.max(activeEnd, interval.endTime);
      continue;
    }
    total += activeEnd - activeStart;
    activeStart = interval.startTime;
    activeEnd = interval.endTime;
  }
  if (hasActiveInterval) total += activeEnd - activeStart;
  return roundDuration(total);
}

function findParentActionSpan(
  store: PerfRuntimeStore,
  childName: string,
  explicitParentId: string | undefined
): PerfRuntimeSpanRecord | null {
  if (explicitParentId) {
    const explicit = store.inflight.get(explicitParentId);
    if (explicit?.kind === 'action') return explicit;
  }

  let selected: PerfRuntimeSpanRecord | null = null;
  for (const candidate of store.inflight.values()) {
    if (candidate.kind !== 'action') continue;
    if (childName !== candidate.name && !childName.startsWith(`${candidate.name}.`)) continue;
    if (!selected || candidate.startTime > selected.startTime) selected = candidate;
  }
  return selected;
}

export function markPerfPoint(
  App: AppContainer,
  name: string,
  options: PerfEntryOptions = {}
): WardrobeProPerfEntry {
  const stamp = roundDuration(nowMs());
  return pushPerfEntry(App, {
    id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: normalizeName(name),
    kind: 'mark',
    startTime: stamp,
    endTime: stamp,
    uxTotalMs: 0,
    codeExecutionMs: 0,
    interactionWaitMs: 0,
    status: 'mark',
    ...(typeof options.detail !== 'undefined' ? { detail: options.detail } : {}),
    ...(normalizeErrorMessage(options.error) ? { error: normalizeErrorMessage(options.error) } : {}),
  });
}

export function recordPerfMetric(
  App: AppContainer,
  name: string,
  metricValue: number,
  metricUnit: PerfMetricUnit,
  options: PerfEntryOptions = {}
): WardrobeProPerfEntry {
  const stamp = roundDuration(nowMs());
  return pushPerfEntry(App, {
    id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: normalizeName(name),
    kind: 'browser-metric',
    startTime: stamp,
    endTime: stamp,
    uxTotalMs: 0,
    codeExecutionMs: 0,
    interactionWaitMs: 0,
    status: normalizeStatus(options.status),
    metricValue:
      metricUnit === 'score' ? Number(Math.max(0, metricValue).toFixed(4)) : roundDuration(metricValue),
    metricUnit,
    ...(typeof options.detail !== 'undefined' ? { detail: options.detail } : {}),
    ...(normalizeErrorMessage(options.error) ? { error: normalizeErrorMessage(options.error) } : {}),
  });
}

export function startPerfSpan(App: AppContainer, name: string, options: PerfSpanOptions = {}): string {
  const store = getPerfRuntimeStore(App);
  const id = `span-${store.nextId++}`;
  const normalizedName = normalizeName(name);
  const kind = normalizeMeasuredKind(options.kind);
  const parent = kind === 'action' ? null : findParentActionSpan(store, normalizedName, options.parentId);
  store.inflight.set(id, {
    id,
    name: normalizedName,
    kind,
    startTime: nowMs(),
    interactionWaitIntervals: [],
    ...(normalizePhase(options.phase) ? { phase: normalizePhase(options.phase) } : {}),
    ...(parent ? { parentId: parent.id } : {}),
    ...(typeof options.detail !== 'undefined' ? { detail: options.detail } : {}),
  });
  return id;
}

export function endPerfSpan(
  App: AppContainer,
  spanId: string,
  options: PerfEntryOptions = {}
): WardrobeProPerfEntry | null {
  const store = getPerfRuntimeStore(App);
  const span = store.inflight.get(spanId);
  if (!span) return null;
  store.inflight.delete(spanId);
  const endTime = nowMs();
  const uxTotalMs = roundDuration(endTime - span.startTime);
  const parent =
    span.kind === 'interaction-wait'
      ? findParentActionSpan(store, span.name, span.parentId)
      : span.parentId
        ? store.inflight.get(span.parentId) || null
        : null;
  if (span.kind === 'interaction-wait' && parent?.kind === 'action') {
    parent.interactionWaitIntervals.push({ startTime: span.startTime, endTime });
  }
  const interactionWaitMs =
    span.kind === 'interaction-wait'
      ? uxTotalMs
      : span.kind === 'action'
        ? calculateInteractionWaitOverlap(span, endTime)
        : 0;
  const codeExecutionMs =
    span.kind === 'action'
      ? roundDuration(Math.max(0, uxTotalMs - interactionWaitMs))
      : span.kind === 'phase'
        ? uxTotalMs
        : 0;

  const parentId = parent?.id || span.parentId;

  const entry: WardrobeProPerfEntry = {
    id: span.id,
    name: span.name,
    kind: span.kind,
    ...(parentId ? { parentId } : {}),
    ...(span.phase ? { phase: span.phase } : {}),
    startTime: roundDuration(span.startTime),
    endTime: roundDuration(endTime),
    uxTotalMs,
    codeExecutionMs,
    interactionWaitMs,
    status: normalizeStatus(options.status),
    ...(typeof mergePerfDetail(options.detail, span.detail) !== 'undefined'
      ? { detail: mergePerfDetail(options.detail, span.detail) }
      : {}),
    ...(normalizeErrorMessage(options.error) ? { error: normalizeErrorMessage(options.error) } : {}),
  };
  return pushPerfEntry(App, entry);
}

export async function runWithPerfSpan<T>(
  App: AppContainer,
  name: string,
  run: () => T | Promise<T>,
  options: PerfSpanOptions = {}
): Promise<T> {
  const spanId = startPerfSpan(App, name, options);
  try {
    const result = await run();
    endPerfSpan(App, spanId, { status: 'ok' });
    return result;
  } catch (error) {
    endPerfSpan(App, spanId, { status: 'error', error });
    throw error;
  }
}

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    !!value &&
    (typeof value === 'object' || typeof value === 'function') &&
    typeof Reflect.get(value, 'then') === 'function'
  );
}

function scheduleActionRenderSettle(
  App: AppContainer,
  actionName: string,
  option: boolean | string | undefined
): void {
  const shouldSettle = option === true || typeof option === 'string' || actionName.startsWith('viewer.');
  if (!shouldSettle) return;
  const reason = typeof option === 'string' && option.trim() ? option.trim() : actionName;
  void markPerfRenderSettle(App, reason);
}

export function runPerfAction<T>(
  App: AppContainer,
  name: string,
  run: () => T,
  options: PerfActionOptions<T> = {}
): T {
  const spanId = startPerfSpan(App, name, { ...options, kind: 'action' });
  try {
    const result = run();
    if (isPromiseLike<T>(result)) {
      return Promise.resolve(result).then(
        resolved => {
          const endOptions = options.resolveEndOptions?.(resolved) || { status: 'ok' as const };
          endPerfSpan(App, spanId, endOptions);
          scheduleActionRenderSettle(App, normalizeName(name), options.settleAfterRender);
          return resolved;
        },
        error => {
          endPerfSpan(App, spanId, { status: 'error', error });
          throw error;
        }
      ) as T;
    }
    const endOptions = options.resolveEndOptions?.(result) || { status: 'ok' as const };
    endPerfSpan(App, spanId, endOptions);
    scheduleActionRenderSettle(App, normalizeName(name), options.settleAfterRender);
    return result;
  } catch (error) {
    endPerfSpan(App, spanId, { status: 'error', error });
    throw error;
  }
}

export function runPerfPhase<T>(App: AppContainer, name: string, phase: string, run: () => T): T {
  const spanId = startPerfSpan(App, name, { kind: 'phase', phase });
  try {
    const result = run();
    if (isPromiseLike<T>(result)) {
      return Promise.resolve(result).then(
        resolved => {
          endPerfSpan(App, spanId, { status: 'ok' });
          return resolved;
        },
        error => {
          endPerfSpan(App, spanId, { status: 'error', error });
          throw error;
        }
      ) as T;
    }
    endPerfSpan(App, spanId, { status: 'ok' });
    return result;
  } catch (error) {
    endPerfSpan(App, spanId, { status: 'error', error });
    throw error;
  }
}

export function runPerfInteractionWait<T>(App: AppContainer, name: string, run: () => T): T {
  const phase = normalizeName(name).split('.').at(-1) || 'interactionWait';
  const spanId = startPerfSpan(App, name, { kind: 'interaction-wait', phase });
  try {
    const result = run();
    if (isPromiseLike<T>(result)) {
      return Promise.resolve(result).then(
        resolved => {
          endPerfSpan(App, spanId, { status: 'ok' });
          return resolved;
        },
        error => {
          endPerfSpan(App, spanId, { status: 'error', error });
          throw error;
        }
      ) as T;
    }
    endPerfSpan(App, spanId, { status: 'ok' });
    return result;
  } catch (error) {
    endPerfSpan(App, spanId, { status: 'error', error });
    throw error;
  }
}

function waitForAnimationFrame(App: AppContainer): Promise<void> {
  const requestFrame = requestAnimationFrameMaybe(App);
  if (!requestFrame) return Promise.resolve();

  return new Promise(resolve => {
    try {
      requestFrame(() => resolve());
    } catch {
      resolve();
    }
  });
}

export async function markPerfRenderSettle(
  App: AppContainer,
  reason: string,
  detail?: unknown
): Promise<WardrobeProPerfEntry | null> {
  const spanId = startPerfSpan(App, 'render.settle', {
    kind: 'render-settle',
    detail: {
      reason: normalizeName(reason, 'render-change'),
      ...asRecord<Record<string, unknown>>(detail),
    },
  });
  await waitForAnimationFrame(App);
  await waitForAnimationFrame(App);
  return endPerfSpan(App, spanId, { status: 'ok' });
}

export function getPerfEntries(App: AppContainer, name?: string): WardrobeProPerfEntry[] {
  const entries = getPerfRuntimeStore(App).entries.slice();
  const normalizedName = normalizeName(name || '', '');
  return normalizedName ? entries.filter(entry => entry.name === normalizedName) : entries;
}

export function clearPerfEntries(App: AppContainer): void {
  const store = getPerfRuntimeStore(App);
  store.entries = [];
  store.inflight.clear();
}

function summarizeValues(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const count = sorted.length;
  const total = roundDuration(sorted.reduce((sum, value) => sum + value, 0));
  return {
    total,
    average: count > 0 ? roundDuration(total / count) : 0,
    min: count > 0 ? roundDuration(sorted[0]) : 0,
    max: count > 0 ? roundDuration(sorted[count - 1]) : 0,
    p50: count > 0 ? roundDuration(percentile(sorted, 0.5)) : 0,
    p95: count > 0 ? roundDuration(percentile(sorted, 0.95)) : 0,
  };
}

function summarizeEntries(entries: WardrobeProPerfEntry[]): WardrobeProPerfMetricSummary {
  const ux = summarizeValues(entries.map(entry => entry.uxTotalMs));
  const code = summarizeValues(entries.map(entry => entry.codeExecutionMs));
  const interaction = summarizeValues(entries.map(entry => entry.interactionWaitMs));
  const count = entries.length;
  const okCount = entries.filter(entry => entry.status === 'ok').length;
  const errorCount = entries.filter(entry => entry.status === 'error').length;
  const markCount = entries.filter(entry => entry.status === 'mark').length;
  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  return {
    count,
    okCount,
    errorCount,
    markCount,
    errorRate: count > 0 ? roundDuration((errorCount / count) * 100) : 0,
    uxTotalMs: ux.total,
    uxAverageMs: ux.average,
    uxMinMs: ux.min,
    uxMaxMs: ux.max,
    uxP50Ms: ux.p50,
    uxP95Ms: ux.p95,
    codeExecutionTotalMs: code.total,
    codeExecutionAverageMs: code.average,
    codeExecutionMinMs: code.min,
    codeExecutionMaxMs: code.max,
    codeExecutionP50Ms: code.p50,
    codeExecutionP95Ms: code.p95,
    interactionWaitTotalMs: interaction.total,
    interactionWaitAverageMs: interaction.average,
    interactionWaitP95Ms: interaction.p95,
    lastUxTotalMs: lastEntry ? roundDuration(lastEntry.uxTotalMs) : 0,
    lastCodeExecutionMs: lastEntry ? roundDuration(lastEntry.codeExecutionMs) : 0,
    lastInteractionWaitMs: lastEntry ? roundDuration(lastEntry.interactionWaitMs) : 0,
    lastStatus: lastEntry?.status || null,
    ...(lastEntry?.error ? { lastError: lastEntry.error } : {}),
    lastUpdatedAt: lastEntry ? roundDuration(lastEntry.endTime) : 0,
  };
}

export function getPerfSummary(App: AppContainer): Record<string, WardrobeProPerfMetricSummary> {
  const out: Record<string, WardrobeProPerfMetricSummary> = {};
  const groups = new Map<string, WardrobeProPerfEntry[]>();
  for (const entry of getPerfRuntimeStore(App).entries) {
    const group = groups.get(entry.name);
    if (group) group.push(entry);
    else groups.set(entry.name, [entry]);
  }
  for (const [name, entries] of groups) out[name] = summarizeEntries(entries);
  return out;
}
