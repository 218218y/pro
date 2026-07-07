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
  | 'forceRequestCount'
  | 'immediateForceRequestCount'
  | 'immediateNonForceRequestCount'
  | 'debouncedForceRequestCount'
  | 'debouncedNonForceRequestCount'
  | 'executeCount'
  | 'executeImmediateCount'
  | 'executeDebouncedCount'
  | 'executeForceCount'
  | 'executeImmediateForceCount'
  | 'executeImmediateNonForceCount'
  | 'executeDebouncedForceCount'
  | 'executeDebouncedNonForceCount'
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
  | 'executeSuccessCount'
  | 'executeFailureCount'
  | 'executeDurationTotalMs'
  | 'executeDurationAvgMs'
  | 'executeDurationP95Ms'
  | 'executeDurationMaxMs'
  | 'lastRequestTs'
  | 'lastExecuteTs';

const REASON_STAT_NUMERIC_KEYS: ReasonStatNumericKey[] = [
  'requestCount',
  'immediateRequestCount',
  'debouncedRequestCount',
  'forceRequestCount',
  'immediateForceRequestCount',
  'immediateNonForceRequestCount',
  'debouncedForceRequestCount',
  'debouncedNonForceRequestCount',
  'executeCount',
  'executeImmediateCount',
  'executeDebouncedCount',
  'executeForceCount',
  'executeImmediateForceCount',
  'executeImmediateNonForceCount',
  'executeDebouncedForceCount',
  'executeDebouncedNonForceCount',
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
  'executeSuccessCount',
  'executeFailureCount',
  'executeDurationTotalMs',
  'executeDurationAvgMs',
  'executeDurationP95Ms',
  'executeDurationMaxMs',
  'lastRequestTs',
  'lastExecuteTs',
];

type BuilderDebugStatNumericKey =
  | Exclude<ReasonStatNumericKey, 'overwriteCount' | 'lastRequestTs' | 'lastExecuteTs'>
  | 'pendingOverwriteCount'
  | 'executeImmediateDurationTotalMs'
  | 'executeImmediateDurationAvgMs'
  | 'executeImmediateDurationP95Ms'
  | 'executeImmediateDurationMaxMs'
  | 'executeDebouncedDurationTotalMs'
  | 'executeDebouncedDurationAvgMs'
  | 'executeDebouncedDurationP95Ms'
  | 'executeDebouncedDurationMaxMs'
  | 'executeForceDurationTotalMs'
  | 'executeForceDurationAvgMs'
  | 'executeForceDurationP95Ms'
  | 'executeForceDurationMaxMs'
  | 'executeNonForceDurationTotalMs'
  | 'executeNonForceDurationAvgMs'
  | 'executeNonForceDurationP95Ms'
  | 'executeNonForceDurationMaxMs';

const BUILDER_DEBUG_STAT_NUMERIC_KEYS: BuilderDebugStatNumericKey[] = [
  'requestCount',
  'immediateRequestCount',
  'debouncedRequestCount',
  'forceRequestCount',
  'immediateForceRequestCount',
  'immediateNonForceRequestCount',
  'debouncedForceRequestCount',
  'debouncedNonForceRequestCount',
  'executeCount',
  'executeImmediateCount',
  'executeDebouncedCount',
  'executeForceCount',
  'executeImmediateForceCount',
  'executeImmediateNonForceCount',
  'executeDebouncedForceCount',
  'executeDebouncedNonForceCount',
  'pendingOverwriteCount',
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
  'executeSuccessCount',
  'executeFailureCount',
  'executeDurationTotalMs',
  'executeDurationAvgMs',
  'executeDurationP95Ms',
  'executeDurationMaxMs',
  'executeImmediateDurationTotalMs',
  'executeImmediateDurationAvgMs',
  'executeImmediateDurationP95Ms',
  'executeImmediateDurationMaxMs',
  'executeDebouncedDurationTotalMs',
  'executeDebouncedDurationAvgMs',
  'executeDebouncedDurationP95Ms',
  'executeDebouncedDurationMaxMs',
  'executeForceDurationTotalMs',
  'executeForceDurationAvgMs',
  'executeForceDurationP95Ms',
  'executeForceDurationMaxMs',
  'executeNonForceDurationTotalMs',
  'executeNonForceDurationAvgMs',
  'executeNonForceDurationP95Ms',
  'executeNonForceDurationMaxMs',
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

function normalizeDurationMs(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric * 100) / 100) : 0;
}

function normalizeDurationSamples(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(item => (Number.isFinite(Number(item)) ? normalizeDurationMs(item) : null))
    .filter((item): item is number => item !== null);
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
    forceRequestCount: 0,
    immediateForceRequestCount: 0,
    immediateNonForceRequestCount: 0,
    debouncedForceRequestCount: 0,
    debouncedNonForceRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    executeForceCount: 0,
    executeImmediateForceCount: 0,
    executeImmediateNonForceCount: 0,
    executeDebouncedForceCount: 0,
    executeDebouncedNonForceCount: 0,
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
    executeSuccessCount: 0,
    executeFailureCount: 0,
    executeDurationTotalMs: 0,
    executeDurationAvgMs: 0,
    executeDurationP95Ms: 0,
    executeDurationMaxMs: 0,
    executeDurationSamplesMs: [],
    lastRequestTs: 0,
    lastExecuteTs: 0,
    lastExecuteStatus: '',
  };
}

export function createBuildDebugStats(): BuilderDebugStatsLike {
  return {
    requestCount: 0,
    immediateRequestCount: 0,
    debouncedRequestCount: 0,
    forceRequestCount: 0,
    immediateForceRequestCount: 0,
    immediateNonForceRequestCount: 0,
    debouncedForceRequestCount: 0,
    debouncedNonForceRequestCount: 0,
    executeCount: 0,
    executeImmediateCount: 0,
    executeDebouncedCount: 0,
    executeForceCount: 0,
    executeImmediateForceCount: 0,
    executeImmediateNonForceCount: 0,
    executeDebouncedForceCount: 0,
    executeDebouncedNonForceCount: 0,
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
    executeSuccessCount: 0,
    executeFailureCount: 0,
    executeDurationTotalMs: 0,
    executeDurationAvgMs: 0,
    executeDurationP95Ms: 0,
    executeDurationMaxMs: 0,
    executeDurationSamplesMs: [],
    executeImmediateDurationTotalMs: 0,
    executeImmediateDurationAvgMs: 0,
    executeImmediateDurationP95Ms: 0,
    executeImmediateDurationMaxMs: 0,
    executeImmediateDurationSamplesMs: [],
    executeDebouncedDurationTotalMs: 0,
    executeDebouncedDurationAvgMs: 0,
    executeDebouncedDurationP95Ms: 0,
    executeDebouncedDurationMaxMs: 0,
    executeDebouncedDurationSamplesMs: [],
    executeForceDurationTotalMs: 0,
    executeForceDurationAvgMs: 0,
    executeForceDurationP95Ms: 0,
    executeForceDurationMaxMs: 0,
    executeForceDurationSamplesMs: [],
    executeNonForceDurationTotalMs: 0,
    executeNonForceDurationAvgMs: 0,
    executeNonForceDurationP95Ms: 0,
    executeNonForceDurationMaxMs: 0,
    executeNonForceDurationSamplesMs: [],
    lastRequestReason: '',
    lastExecuteReason: '',
    lastExecuteStatus: '',
    reasons: {},
  };
}

export function ensureBuildDebugStats(state: BuilderSchedulerStateInternalLike): BuilderDebugStatsLike {
  if (!state.debugStats) state.debugStats = createBuildDebugStats();
  normalizeBuildDebugStatsInPlace(state.debugStats);
  return state.debugStats;
}

function readReasonStatNumber(rec: AnyObj, key: ReasonStatNumericKey): number | null {
  const value = rec[key];
  return typeof value === 'number' ? value : null;
}

function readBuilderStatNumber(rec: BuilderDebugStatsLike, key: BuilderDebugStatNumericKey): number | null {
  const value = rec[key];
  return typeof value === 'number' ? value : null;
}

function readReasonStat(value: unknown): BuildReasonDebugStatLike | null {
  const rec = readObject(value);
  if (!rec || typeof rec.reason !== 'string') return null;

  const next: AnyObj = { reason: rec.reason };
  for (const key of REASON_STAT_NUMERIC_KEYS) {
    next[key] = readReasonStatNumber(rec, key) ?? 0;
  }
  next.executeDurationSamplesMs = normalizeDurationSamples(rec.executeDurationSamplesMs);
  next.lastExecuteStatus = typeof rec.lastExecuteStatus === 'string' ? rec.lastExecuteStatus : '';
  return next as unknown as BuildReasonDebugStatLike;
}

function normalizeBuildDebugStatsInPlace(stats: BuilderDebugStatsLike): void {
  for (const key of BUILDER_DEBUG_STAT_NUMERIC_KEYS) {
    if (readBuilderStatNumber(stats, key) == null) stats[key] = 0;
  }
  if (typeof stats.lastRequestReason !== 'string') stats.lastRequestReason = '';
  if (typeof stats.lastExecuteReason !== 'string') stats.lastExecuteReason = '';
  if (typeof stats.lastExecuteStatus !== 'string') stats.lastExecuteStatus = '';
  stats.executeDurationSamplesMs = normalizeDurationSamples(stats.executeDurationSamplesMs);
  stats.executeImmediateDurationSamplesMs = normalizeDurationSamples(stats.executeImmediateDurationSamplesMs);
  stats.executeDebouncedDurationSamplesMs = normalizeDurationSamples(stats.executeDebouncedDurationSamplesMs);
  stats.executeForceDurationSamplesMs = normalizeDurationSamples(stats.executeForceDurationSamplesMs);
  stats.executeNonForceDurationSamplesMs = normalizeDurationSamples(stats.executeNonForceDurationSamplesMs);
  stats.reasons = getReasonStatsMap(stats.reasons);
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
    executeDurationSamplesMs: [...normalizeDurationSamples(stats.executeDurationSamplesMs)],
    executeImmediateDurationSamplesMs: [...normalizeDurationSamples(stats.executeImmediateDurationSamplesMs)],
    executeDebouncedDurationSamplesMs: [...normalizeDurationSamples(stats.executeDebouncedDurationSamplesMs)],
    executeForceDurationSamplesMs: [...normalizeDurationSamples(stats.executeForceDurationSamplesMs)],
    executeNonForceDurationSamplesMs: [...normalizeDurationSamples(stats.executeNonForceDurationSamplesMs)],
    reasons: Object.fromEntries(
      Object.entries(getReasonStatsMap(stats.reasons)).map(([key, value]) => [
        key,
        {
          ...value,
          executeDurationSamplesMs: [...normalizeDurationSamples(value.executeDurationSamplesMs)],
        },
      ])
    ),
  };
}
