import type {
  PlatformServiceNamespaceLike,
  RenderFollowThroughBudgetSummaryLike,
  RenderFollowThroughDebugStatsLike,
  UnknownRecord,
} from '../../../types';

import { asRecord } from './record.js';

type RenderDebugHostLike = UnknownRecord & {
  __wpRenderDebugStats?: RenderFollowThroughDebugStatsLike | null;
};

function asRenderDebugHost(value: unknown): RenderDebugHostLike | null {
  return asRecord<RenderDebugHostLike>(value);
}

export function createRenderFollowThroughDebugStats(): RenderFollowThroughDebugStatsLike {
  return {
    renderRequestCount: 0,
    triggerRenderCount: 0,
    fallbackTriggerCount: 0,
    ensureRenderLoopCount: 0,
    noOpRenderRequestCount: 0,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  };
}

export function ensureRenderFollowThroughDebugStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined
): RenderFollowThroughDebugStatsLike {
  const rec = asRenderDebugHost(host);
  if (rec?.__wpRenderDebugStats) return rec.__wpRenderDebugStats;
  const next = createRenderFollowThroughDebugStats();
  if (rec) rec.__wpRenderDebugStats = next;
  return next;
}

export function getRenderFollowThroughDebugStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined
): RenderFollowThroughDebugStatsLike | null {
  return asRenderDebugHost(host)?.__wpRenderDebugStats ?? null;
}

export function cloneRenderFollowThroughDebugStats(
  stats: RenderFollowThroughDebugStatsLike | null | undefined
): RenderFollowThroughDebugStatsLike | null {
  return stats ? { ...stats } : null;
}

export function resetRenderFollowThroughDebugStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined
): RenderFollowThroughDebugStatsLike | null {
  const rec = asRenderDebugHost(host);
  if (!rec?.__wpRenderDebugStats) return null;
  const before = cloneRenderFollowThroughDebugStats(rec.__wpRenderDebugStats);
  rec.__wpRenderDebugStats = createRenderFollowThroughDebugStats();
  return before;
}

function ratio(num: number, den: number): number {
  return den > 0 ? Number((num / den).toFixed(4)) : 0;
}

export function summarizeRenderFollowThroughBudget(
  stats: RenderFollowThroughDebugStatsLike | null | undefined
): RenderFollowThroughBudgetSummaryLike {
  const renderRequestCount =
    typeof stats?.renderRequestCount === 'number' ? Math.max(0, stats.renderRequestCount) : 0;
  const triggerRenderCount =
    typeof stats?.triggerRenderCount === 'number' ? Math.max(0, stats.triggerRenderCount) : 0;
  const fallbackTriggerCount =
    typeof stats?.fallbackTriggerCount === 'number' ? Math.max(0, stats.fallbackTriggerCount) : 0;
  const ensureRenderLoopCount =
    typeof stats?.ensureRenderLoopCount === 'number' ? Math.max(0, stats.ensureRenderLoopCount) : 0;
  const noOpRenderRequestCount =
    typeof stats?.noOpRenderRequestCount === 'number' ? Math.max(0, stats.noOpRenderRequestCount) : 0;
  const wakeupRequestCount =
    typeof stats?.wakeupRequestCount === 'number' ? Math.max(0, stats.wakeupRequestCount) : 0;
  const wakeupEnsureRenderLoopCount =
    typeof stats?.wakeupEnsureRenderLoopCount === 'number'
      ? Math.max(0, stats.wakeupEnsureRenderLoopCount)
      : 0;
  const noOpWakeupCount = typeof stats?.noOpWakeupCount === 'number' ? Math.max(0, stats.noOpWakeupCount) : 0;
  const activityTouchCount =
    typeof stats?.activityTouchCount === 'number' ? Math.max(0, stats.activityTouchCount) : 0;
  const afterTouchCount = typeof stats?.afterTouchCount === 'number' ? Math.max(0, stats.afterTouchCount) : 0;
  const ensureRenderLoopAfterTriggerCount =
    typeof stats?.ensureRenderLoopAfterTriggerCount === 'number'
      ? Math.max(0, stats.ensureRenderLoopAfterTriggerCount)
      : 0;

  return {
    renderRequestCount,
    triggerRenderCount,
    fallbackTriggerCount,
    ensureRenderLoopCount,
    noOpRenderRequestCount,
    wakeupRequestCount,
    wakeupEnsureRenderLoopCount,
    noOpWakeupCount,
    activityTouchCount,
    afterTouchCount,
    ensureRenderLoopAfterTriggerCount,
    renderNoOpRate: ratio(noOpRenderRequestCount, renderRequestCount),
    wakeupNoOpRate: ratio(noOpWakeupCount, wakeupRequestCount),
    renderEnsureFallbackRate: ratio(ensureRenderLoopCount, renderRequestCount),
    renderFallbackTriggerRate: ratio(fallbackTriggerCount, renderRequestCount),
  };
}

export function recordPlatformRenderFollowThroughStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined,
  result: {
    triggeredRender: boolean;
    usedFallbackTrigger: boolean;
    ensuredRenderLoop: boolean;
  }
): RenderFollowThroughDebugStatsLike {
  const stats = ensureRenderFollowThroughDebugStats(host);
  stats.renderRequestCount += 1;
  if (result.triggeredRender) stats.triggerRenderCount += 1;
  if (result.usedFallbackTrigger) stats.fallbackTriggerCount += 1;
  if (result.ensuredRenderLoop) stats.ensureRenderLoopCount += 1;
  if (!result.triggeredRender && !result.ensuredRenderLoop) stats.noOpRenderRequestCount += 1;
  return stats;
}

export function recordPlatformActivityTouchStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined,
  touchedActivity: boolean
): RenderFollowThroughDebugStatsLike {
  const stats = ensureRenderFollowThroughDebugStats(host);
  if (touchedActivity) stats.activityTouchCount += 1;
  return stats;
}

export function recordPlatformWakeupFollowThroughStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined,
  result: {
    touchedActivity: boolean;
    ranAfterTouch: boolean;
    ensuredRenderLoop: boolean;
  }
): RenderFollowThroughDebugStatsLike {
  const stats = ensureRenderFollowThroughDebugStats(host);
  stats.wakeupRequestCount += 1;
  recordPlatformActivityTouchStats(host, result.touchedActivity);
  if (result.ranAfterTouch) stats.afterTouchCount += 1;
  if (result.ensuredRenderLoop) stats.wakeupEnsureRenderLoopCount += 1;
  if (!result.ranAfterTouch && !result.ensuredRenderLoop) stats.noOpWakeupCount += 1;
  return stats;
}

export function recordPlatformEnsureRenderLoopAfterTriggerStats(
  host: PlatformServiceNamespaceLike | UnknownRecord | null | undefined,
  ensuredRenderLoopAfterTrigger: boolean
): RenderFollowThroughDebugStatsLike {
  const stats = ensureRenderFollowThroughDebugStats(host);
  if (ensuredRenderLoopAfterTrigger) stats.ensureRenderLoopAfterTriggerCount += 1;
  return stats;
}
