import type {
  AppContainer,
  WardrobeProPerfEntry,
  WardrobeProPerfMetricSummary,
} from '../../../types/index.js';

import type { PerfActionOptions, PerfEntryOptions, PerfSpanOptions } from './perf_runtime_surface_types.js';
import { getConfigRootMaybe } from './app_roots_access.js';
import { getWindowMaybe } from './browser_env_surface.js';
import { getDepMaybe } from './deps_access.js';
import { asRecord } from './record.js';

type PerfRuntimeSpanRecord = {
  id: string;
  name: string;
  startTime: number;
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
    // ignore
  }
  return Date.now();
}

function normalizeLimit(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : DEFAULT_ENTRY_LIMIT;
  if (n < 50) return 50;
  if (n > 2000) return 2000;
  return n;
}

function normalizeName(value: unknown, fallback = 'unknown'): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeStatus(value: unknown): 'ok' | 'error' | 'mark' {
  return value === 'error' || value === 'mark' ? value : 'ok';
}

function normalizeErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error.message || String(error);
  return typeof error === 'string' && error.trim() ? error : String(error);
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

function mergePerfDetail(primary: unknown, fallback: unknown): unknown {
  if (typeof primary === 'undefined') return fallback;
  if (typeof fallback === 'undefined') return primary;
  const primaryRecord = asRecord<Record<string, unknown>>(primary);
  const fallbackRecord = asRecord<Record<string, unknown>>(fallback);
  if (primaryRecord && fallbackRecord) return { ...fallbackRecord, ...primaryRecord };
  return primary;
}

export function buildPerfEntryOptionsFromActionResult(result: unknown): PerfEntryOptions | undefined {
  const rec = asRecord<Record<string, unknown>>(result);
  if (!rec) return undefined;

  const reason = typeof rec.reason === 'string' && rec.reason.trim() ? rec.reason.trim() : undefined;
  const message = typeof rec.message === 'string' && rec.message.trim() ? rec.message.trim() : undefined;
  const perfStatus = normalizePerfResultStatus(rec.perfStatus);
  const perfError = normalizeErrorMessage(rec.perfError);

  const detail: Record<string, unknown> = {};
  if (reason) detail.reason = reason;
  if (rec.pending === true) detail.pending = true;
  if (message) detail.message = message;

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
  const configRoot = asRecord<Record<string, unknown>>(getConfigRootMaybe(App));
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
    // ignore event failures
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

export function markPerfPoint(
  App: AppContainer,
  name: string,
  options: PerfEntryOptions = {}
): WardrobeProPerfEntry {
  const stamp = roundDuration(nowMs());
  return pushPerfEntry(App, {
    id: `mark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: normalizeName(name),
    startTime: stamp,
    endTime: stamp,
    durationMs: 0,
    status: 'mark',
    ...(typeof options.detail !== 'undefined' ? { detail: options.detail } : {}),
    ...(normalizeErrorMessage(options.error) ? { error: normalizeErrorMessage(options.error) } : {}),
  });
}

export function startPerfSpan(App: AppContainer, name: string, options: PerfSpanOptions = {}): string {
  const store = getPerfRuntimeStore(App);
  const id = `span-${store.nextId++}`;
  store.inflight.set(id, {
    id,
    name: normalizeName(name),
    startTime: nowMs(),
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
  const entry: WardrobeProPerfEntry = {
    id: span.id,
    name: span.name,
    startTime: roundDuration(span.startTime),
    endTime: roundDuration(endTime),
    durationMs: roundDuration(endTime - span.startTime),
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

export function runPerfAction<T>(
  App: AppContainer,
  name: string,
  run: () => T,
  options: PerfActionOptions<T> = {}
): T {
  const spanId = startPerfSpan(App, name, options);
  try {
    const result = run();
    if (isPromiseLike<T>(result)) {
      return Promise.resolve(result).then(
        resolved => {
          const endOptions = options.resolveEndOptions?.(resolved) || { status: 'ok' as const };
          endPerfSpan(App, spanId, endOptions);
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
    return result;
  } catch (error) {
    endPerfSpan(App, spanId, { status: 'error', error });
    throw error;
  }
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

function summarizeEntries(entries: WardrobeProPerfEntry[]): WardrobeProPerfMetricSummary {
  const durations = entries
    .map(entry => (typeof entry.durationMs === 'number' ? entry.durationMs : 0))
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b);
  const count = durations.length;
  const okCount = entries.filter(entry => entry.status === 'ok').length;
  const errorCount = entries.filter(entry => entry.status === 'error').length;
  const markCount = entries.filter(entry => entry.status === 'mark').length;
  const totalMs = roundDuration(durations.reduce((sum, value) => sum + value, 0));
  const averageMs = count > 0 ? roundDuration(totalMs / count) : 0;
  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  return {
    count,
    okCount,
    errorCount,
    markCount,
    errorRate: count > 0 ? roundDuration((errorCount / count) * 100) : 0,
    totalMs,
    averageMs,
    minMs: count > 0 ? roundDuration(durations[0]) : 0,
    maxMs: count > 0 ? roundDuration(durations[count - 1]) : 0,
    p50Ms: count > 0 ? roundDuration(percentile(durations, 0.5)) : 0,
    p95Ms: count > 0 ? roundDuration(percentile(durations, 0.95)) : 0,
    lastDurationMs: lastEntry ? roundDuration(lastEntry.durationMs) : 0,
    lastStatus: lastEntry?.status || null,
    ...(lastEntry?.error ? { lastError: lastEntry.error } : {}),
    lastUpdatedAt: lastEntry ? roundDuration(lastEntry.endTime) : 0,
  };
}


export function getPerfSummary(App: AppContainer): Record<string, WardrobeProPerfMetricSummary> {
  const out: Record<string, WardrobeProPerfMetricSummary> = {};
  const groups = new Map<string, WardrobeProPerfEntry[]>();
  for (const entry of getPerfRuntimeStore(App).entries) {
    if (!groups.has(entry.name)) groups.set(entry.name, []);
    groups.get(entry.name)?.push(entry);
  }
  for (const [name, entries] of groups.entries()) out[name] = summarizeEntries(entries);
  return out;
}
