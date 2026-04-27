import type {
  AppContainer,
  BuildDebugBudgetSummaryLike,
  BuilderDebugStatsLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  RootStateLike,
  StoreDebugStats,
  WardrobeProPerfConsoleSurface,
  WardrobeProPerfEntry,
  WardrobeProPerfMetricSummary,
  WardrobeProPerfStateFingerprint,
} from '../../../types/index.js';

import { getBuilderService } from './builder_service_access.js';
import { getConfigRootMaybe } from './app_roots_access.js';
import { getWindowMaybe } from './browser_env_surface.js';
import { getDepMaybe } from './deps_access.js';
import {
  getPlatformRenderDebugBudget,
  getPlatformRenderDebugStats,
  resetPlatformRenderDebugStats,
} from './platform_access_ops.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';
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

function normalizePerfStateString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePerfSavedColorValue(value: unknown): string {
  return normalizePerfStateString(value).toLowerCase();
}

function normalizePerfStateBoolean(value: unknown): boolean {
  return !!value;
}

function normalizePerfStateNullablePositiveInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
}

function readPerfSavedColorValue(entry: unknown): string {
  const rec = asRecord<Record<string, unknown>>(entry);
  if (!rec) return '';
  const value = normalizePerfSavedColorValue(rec.value);
  if (value) return value;
  return normalizePerfSavedColorValue(rec.id);
}

function readPerfStateSavedColorValues(config: unknown): string[] {
  const cfg = asRecord<Record<string, unknown>>(config);
  const savedColors = Array.isArray(cfg?.savedColors) ? cfg.savedColors : [];
  return savedColors
    .map(readPerfSavedColorValue)
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function countTruthyRecordEntries(value: unknown): number {
  const rec = asRecord<Record<string, unknown>>(value);
  if (!rec) return 0;
  let count = 0;
  for (const entry of Object.values(rec)) {
    if (!entry) continue;
    if (Array.isArray(entry)) {
      if (entry.length > 0) count += 1;
      continue;
    }
    if (typeof entry === 'object') {
      if (Object.keys(asRecord<Record<string, unknown>>(entry) || {}).length > 0) count += 1;
      continue;
    }
    count += 1;
  }
  return count;
}

function countDoorTrimEntries(value: unknown): number {
  const rec = asRecord<Record<string, unknown>>(value);
  if (!rec) return 0;
  let count = 0;
  for (const trims of Object.values(rec)) {
    if (Array.isArray(trims)) {
      count += trims.filter(item => asRecord<Record<string, unknown>>(item)).length;
      continue;
    }
    if (asRecord<Record<string, unknown>>(trims)) count += 1;
  }
  return count;
}

function normalizePerfStatePlacementCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function countInternalDrawerPlacementsFromModuleList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let total = 0;
  for (const item of value) {
    const rec = asRecord<Record<string, unknown>>(item);
    if (!rec) continue;
    const list = Array.isArray(rec.intDrawersList) ? rec.intDrawersList.length : 0;
    const slot = normalizePerfStatePlacementCount(rec.intDrawersSlot) > 0 ? 1 : 0;
    total += list + slot;
  }
  return total;
}

function countExternalDrawerSelectionsFromModuleList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  let total = 0;
  for (const item of value) {
    const rec = asRecord<Record<string, unknown>>(item);
    if (!rec) continue;
    total += normalizePerfStatePlacementCount(rec.extDrawersCount);
  }
  return total;
}

function countPerfStateInternalDrawerPlacements(config: unknown): number {
  const cfg = asRecord<Record<string, unknown>>(config);
  if (!cfg) return 0;
  const corner = asRecord<Record<string, unknown>>(cfg.cornerConfiguration);
  const lowerCorner = asRecord<Record<string, unknown>>(corner?.stackSplitLower);
  return (
    countInternalDrawerPlacementsFromModuleList(cfg.modulesConfiguration) +
    countInternalDrawerPlacementsFromModuleList(cfg.stackSplitLowerModulesConfiguration) +
    countInternalDrawerPlacementsFromModuleList(corner?.modulesConfiguration) +
    countInternalDrawerPlacementsFromModuleList(lowerCorner?.modulesConfiguration)
  );
}

function countPerfStateExternalDrawerSelections(config: unknown): number {
  const cfg = asRecord<Record<string, unknown>>(config);
  if (!cfg) return 0;
  const corner = asRecord<Record<string, unknown>>(cfg.cornerConfiguration);
  const lowerCorner = asRecord<Record<string, unknown>>(corner?.stackSplitLower);
  return (
    countExternalDrawerSelectionsFromModuleList(cfg.modulesConfiguration) +
    countExternalDrawerSelectionsFromModuleList(cfg.stackSplitLowerModulesConfiguration) +
    countExternalDrawerSelectionsFromModuleList(corner?.modulesConfiguration) +
    countExternalDrawerSelectionsFromModuleList(lowerCorner?.modulesConfiguration)
  );
}

export function getPerfStateFingerprint(App: AppContainer): WardrobeProPerfStateFingerprint | null {
  try {
    const store = getStoreSurfaceMaybe<RootStateLike>(App);
    if (!store || typeof store.getState !== 'function') return null;
    const root = asRecord<Record<string, unknown>>(store.getState());
    if (!root) return null;
    const ui = asRecord<Record<string, unknown>>(root.ui);
    const savedColorValues = readPerfStateSavedColorValues(root.config);
    const config = asRecord<Record<string, unknown>>(root.config);
    return {
      projectName: normalizePerfStateString(ui?.projectName),
      savedColorCount: savedColorValues.length,
      savedColorValues,
      wardrobeType: normalizePerfStateString(config?.wardrobeType),
      boardMaterial: normalizePerfStateString(config?.boardMaterial),
      doorStyle: normalizePerfStateString(ui?.doorStyle),
      groovesEnabled: normalizePerfStateBoolean(ui?.groovesEnabled),
      grooveLinesCount: normalizePerfStateNullablePositiveInt(config?.grooveLinesCount),
      splitDoors: normalizePerfStateBoolean(ui?.splitDoors),
      removeDoorsEnabled: normalizePerfStateBoolean(ui?.removeDoorsEnabled),
      internalDrawersEnabled: normalizePerfStateBoolean(ui?.internalDrawersEnabled),
      groovesMapCount: countTruthyRecordEntries(config?.groovesMap),
      grooveLinesCountMapCount: countTruthyRecordEntries(config?.grooveLinesCountMap),
      splitDoorMapCount: countTruthyRecordEntries(config?.splitDoorsMap),
      splitDoorBottomMapCount: countTruthyRecordEntries(config?.splitDoorsBottomMap),
      removedDoorMapCount: countTruthyRecordEntries(config?.removedDoorsMap),
      doorTrimCount: countDoorTrimEntries(config?.doorTrimMap),
      drawerDividerCount: countTruthyRecordEntries(config?.drawerDividersMap),
      internalDrawerPlacementCount: countPerfStateInternalDrawerPlacements(config),
      externalDrawerSelectionCount: countPerfStateExternalDrawerSelections(config),
    };
  } catch {
    return null;
  }
}

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
