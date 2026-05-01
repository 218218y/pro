import type {
  BuilderDebugStatsLike,
  BuildReasonDebugStatLike,
  BuilderSchedulerStateInternalLike,
} from '../../../types/index.js';

import { type AnyObj, readObject } from './scheduler_shared.js';

export type BuildStatsReasonMap = Record<string, BuildReasonDebugStatLike>;

type ReasonStatNumericKey =
  | 'requestCount'
  | 'immediateRequestCount'
  | 'debouncedRequestCount'
  | 'executeCount'
  | 'executeImmediateCount'
  | 'executeDebouncedCount'
  | 'overwriteCount'
  | 'debouncedScheduleCount'
  | 'reusedDebouncedScheduleCount'
  | 'builderWaitScheduleCount'
  | 'staleDebouncedTimerFireCount'
  | 'staleBuilderWaitWakeupCount'
  | 'duplicatePendingSignatureCount'
  | 'skippedDuplicatePendingRequestCount'
  | 'skippedSatisfiedRequestCount'
  | 'repeatedExecuteCount'
  | 'skippedRepeatedExecuteCount'
  | 'lastRequestTs'
  | 'lastExecuteTs';

const REASON_STAT_NUMERIC_KEYS: ReasonStatNumericKey[] = [
  'requestCount',
  'immediateRequestCount',
  'debouncedRequestCount',
  'executeCount',
  'executeImmediateCount',
  'executeDebouncedCount',
  'overwriteCount',
  'debouncedScheduleCount',
  'reusedDebouncedScheduleCount',
  'builderWaitScheduleCount',
  'staleDebouncedTimerFireCount',
  'staleBuilderWaitWakeupCount',
  'duplicatePendingSignatureCount',
  'skippedDuplicatePendingRequestCount',
  'skippedSatisfiedRequestCount',
  'repeatedExecuteCount',
  'skippedRepeatedExecuteCount',
  'lastRequestTs',
  'lastExecuteTs',
];

export function nowForBuildStats(): number {
  try {
    return typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
  } catch {
    return Date.now();
  }
}

export function normalizeBuildReason(reasonIn: unknown): string {
  const value = typeof reasonIn === 'string' ? reasonIn.trim() : '';
  return value || 'unknown';
}

function createReasonDebugStat(reason: string): BuildReasonDebugStatLike {
  return {
    reason,
    requestCount: 0,
    immediateRequestCount: 0,
    debouncedRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    overwriteCount: 0,
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
    lastRequestTs: 0,
    lastExecuteTs: 0,
  };
}

export function createBuildDebugStats(): BuilderDebugStatsLike {
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

export function ensureBuildDebugStats(state: BuilderSchedulerStateInternalLike): BuilderDebugStatsLike {
  if (!state.debugStats) state.debugStats = createBuildDebugStats();
  return state.debugStats;
}

function readReasonStatNumber(rec: AnyObj, key: ReasonStatNumericKey): number | null {
  const value = rec[key];
  return typeof value === 'number' ? value : null;
}

function readReasonStat(value: unknown): BuildReasonDebugStatLike | null {
  const rec = readObject(value);
  if (!rec || typeof rec.reason !== 'string') return null;
  for (const key of REASON_STAT_NUMERIC_KEYS) {
    if (readReasonStatNumber(rec, key) == null) return null;
  }

  return {
    reason: rec.reason,
    requestCount: readReasonStatNumber(rec, 'requestCount') ?? 0,
    immediateRequestCount: readReasonStatNumber(rec, 'immediateRequestCount') ?? 0,
    debouncedRequestCount: readReasonStatNumber(rec, 'debouncedRequestCount') ?? 0,
    executeCount: readReasonStatNumber(rec, 'executeCount') ?? 0,
    executeImmediateCount: readReasonStatNumber(rec, 'executeImmediateCount') ?? 0,
    executeDebouncedCount: readReasonStatNumber(rec, 'executeDebouncedCount') ?? 0,
    overwriteCount: readReasonStatNumber(rec, 'overwriteCount') ?? 0,
    debouncedScheduleCount: readReasonStatNumber(rec, 'debouncedScheduleCount') ?? 0,
    reusedDebouncedScheduleCount: readReasonStatNumber(rec, 'reusedDebouncedScheduleCount') ?? 0,
    builderWaitScheduleCount: readReasonStatNumber(rec, 'builderWaitScheduleCount') ?? 0,
    staleDebouncedTimerFireCount: readReasonStatNumber(rec, 'staleDebouncedTimerFireCount') ?? 0,
    staleBuilderWaitWakeupCount: readReasonStatNumber(rec, 'staleBuilderWaitWakeupCount') ?? 0,
    duplicatePendingSignatureCount: readReasonStatNumber(rec, 'duplicatePendingSignatureCount') ?? 0,
    skippedDuplicatePendingRequestCount:
      readReasonStatNumber(rec, 'skippedDuplicatePendingRequestCount') ?? 0,
    skippedSatisfiedRequestCount: readReasonStatNumber(rec, 'skippedSatisfiedRequestCount') ?? 0,
    repeatedExecuteCount: readReasonStatNumber(rec, 'repeatedExecuteCount') ?? 0,
    skippedRepeatedExecuteCount: readReasonStatNumber(rec, 'skippedRepeatedExecuteCount') ?? 0,
    lastRequestTs: readReasonStatNumber(rec, 'lastRequestTs') ?? 0,
    lastExecuteTs: readReasonStatNumber(rec, 'lastExecuteTs') ?? 0,
  };
}

function getReasonStatsMap(value: unknown): BuildStatsReasonMap {
  const rec = readObject(value);
  if (!rec) return {};
  const out: BuildStatsReasonMap = {};
  for (const key of Object.keys(rec)) {
    const entry = readReasonStat(rec[key]);
    if (entry) out[key] = entry;
  }
  return out;
}

function ensureReasonStatsMap(stats: BuilderDebugStatsLike): BuildStatsReasonMap {
  const reasons = getReasonStatsMap(stats.reasons);
  stats.reasons = reasons;
  return reasons;
}

export function getReasonStats(stats: BuilderDebugStatsLike, reason: string): BuildReasonDebugStatLike {
  const reasons = ensureReasonStatsMap(stats);
  if (!reasons[reason]) reasons[reason] = createReasonDebugStat(reason);
  return reasons[reason];
}

export function cloneBuildDebugStats(stats: BuilderDebugStatsLike): BuilderDebugStatsLike {
  return {
    ...stats,
    reasons: { ...getReasonStatsMap(stats.reasons) },
  };
}
