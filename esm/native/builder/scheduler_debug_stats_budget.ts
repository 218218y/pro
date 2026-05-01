import type { BuilderDebugStatsLike, BuildDebugBudgetSummaryLike } from '../../../types/index.js';

function readCount(value: unknown): number {
  return typeof value === 'number' ? Math.max(0, value) : 0;
}

function ratio(num: number, den: number): number {
  return den > 0 ? Number((num / den).toFixed(4)) : 0;
}

export function summarizeBuildDebugBudget(
  stats: BuilderDebugStatsLike | null | undefined
): BuildDebugBudgetSummaryLike {
  const requestCount = readCount(stats?.requestCount);
  const executeCount = readCount(stats?.executeCount);
  const skippedDuplicatePendingRequestCount = readCount(stats?.skippedDuplicatePendingRequestCount);
  const skippedSatisfiedRequestCount = readCount(stats?.skippedSatisfiedRequestCount);
  const skippedRepeatedExecuteCount = readCount(stats?.skippedRepeatedExecuteCount);
  const debouncedScheduleCount = readCount(stats?.debouncedScheduleCount);
  const reusedDebouncedScheduleCount = readCount(stats?.reusedDebouncedScheduleCount);
  const builderWaitScheduleCount = readCount(stats?.builderWaitScheduleCount);
  const staleDebouncedTimerFireCount = readCount(stats?.staleDebouncedTimerFireCount);
  const staleBuilderWaitWakeupCount = readCount(stats?.staleBuilderWaitWakeupCount);

  const staleWakeupCount = staleDebouncedTimerFireCount + staleBuilderWaitWakeupCount;
  const suppressedRequestCount = skippedDuplicatePendingRequestCount + skippedSatisfiedRequestCount;
  const suppressedExecuteCount = skippedRepeatedExecuteCount;
  const totalDebounceEvents = debouncedScheduleCount + reusedDebouncedScheduleCount;

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
