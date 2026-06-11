import { resolveBlockedMainPushRetryDelay, resolveQueuedDueAt } from './cloud_sync_coalescer_policy.js';
import type { CloudSyncPullCoalescerRuntimeContext } from './cloud_sync_coalescer_runtime_shared.js';

export interface CloudSyncPullCoalescerControls {
  clearTimer: () => void;
  cleanupMainPushSettledSubscription: () => void;
  stopWaitingForMainPush: () => void;
  armAt: (dueAtRaw: number) => void;
  arm: (delayMs: number) => void;
  ensureMainPushSettledSubscription: () => void;
  parkUntilMainPushSettles: () => boolean;
  scheduleQueuedRun: (opts?: { immediate?: boolean }) => void;
}

export function createCloudSyncPullCoalescerControls(
  context: CloudSyncPullCoalescerRuntimeContext
): CloudSyncPullCoalescerControls {
  const clearTimer = (): void => {
    if (!context.state.timer) return;
    try {
      context.deps.clearTimeoutFn(context.state.timer);
    } catch (e) {
      context.deps.reportNonFatal(`pullCoalescer.${context.policy.scopeLabel}.clearTimeout`, e);
    }
    context.state.timer = null;
    context.state.timerDueAt = 0;
  };

  const cleanupMainPushSettledSubscription = (): void => {
    const cleanup = context.state.mainPushSettledCleanup;
    context.state.mainPushSettledCleanup = null;
    if (typeof cleanup !== 'function') return;
    try {
      cleanup();
    } catch (e) {
      context.deps.reportNonFatal(`pullCoalescer.${context.policy.scopeLabel}.unsubscribeMainPushSettled`, e);
    }
  };

  const stopWaitingForMainPush = (): void => {
    context.state.waitingForMainPush = false;
    cleanupMainPushSettledSubscription();
  };

  const armAt = (dueAtRaw: number): void => {
    const now = Date.now();
    const dueAt = Math.max(now, Math.round(Number(dueAtRaw) || now));
    if (context.state.timer && context.state.timerDueAt > 0 && context.state.timerDueAt <= dueAt) return;
    clearTimer();
    context.state.timerDueAt = dueAt;
    context.state.timer = context.deps.setTimeoutFn(context.fire, dueAt - now);
  };

  const arm = (delayMs: number): void => {
    const now = Date.now();
    const ms = Math.max(0, Math.round(Number(delayMs) || 0));
    armAt(now + ms);
  };

  const ensureMainPushSettledSubscription = (): void => {
    if (typeof context.deps.subscribeMainPushSettled !== 'function' || context.state.mainPushSettledCleanup)
      return;
    try {
      const cleanup = context.deps.subscribeMainPushSettled(context.resumeAfterMainPushSettled);
      context.state.mainPushSettledCleanup = typeof cleanup === 'function' ? cleanup : null;
    } catch (e) {
      context.deps.reportNonFatal(`pullCoalescer.${context.policy.scopeLabel}.subscribeMainPushSettled`, e);
    }
  };

  const parkUntilMainPushSettles = (): boolean => {
    if (!context.deps.isMainPushInFlight()) return false;
    if (typeof context.deps.subscribeMainPushSettled !== 'function') {
      stopWaitingForMainPush();
      arm(resolveBlockedMainPushRetryDelay(context.policy, context.state));
      return true;
    }
    context.state.waitingForMainPush = true;
    ensureMainPushSettledSubscription();
    clearTimer();
    return true;
  };

  const scheduleQueuedRun = (opts?: { immediate?: boolean }): void => {
    if (
      context.deps.isDisposed() ||
      context.deps.isSuppressed() ||
      !context.state.queued ||
      context.state.inFlight
    )
      return;
    if (parkUntilMainPushSettles()) return;
    stopWaitingForMainPush();
    armAt(resolveQueuedDueAt(context.policy, context.state, Date.now(), !!opts?.immediate));
  };

  return {
    clearTimer,
    cleanupMainPushSettledSubscription,
    stopWaitingForMainPush,
    armAt,
    arm,
    ensureMainPushSettledSubscription,
    parkUntilMainPushSettles,
    scheduleQueuedRun,
  };
}
