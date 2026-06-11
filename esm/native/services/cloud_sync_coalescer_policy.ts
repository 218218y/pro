import {
  FALLBACK_MAIN_PUSH_RETRY_MS,
  type PullCoalescerPolicy,
  type PullCoalescerState,
} from './cloud_sync_coalescer_shared.js';

export function resolveBlockedMainPushRetryDelay(
  policy: PullCoalescerPolicy,
  state: PullCoalescerState,
  nowRaw = Date.now()
): number {
  const now = Math.max(0, Math.round(Number(nowRaw) || 0));
  const policyDelayMs = Math.max(FALLBACK_MAIN_PUSH_RETRY_MS, policy.debounceMs, policy.minGapMs);
  if (policy.maxDelayMs <= 0 || state.firstQueuedAt <= 0) return policyDelayMs;
  const latestAllowedDueAt = state.firstQueuedAt + policy.maxDelayMs;
  const remainingMs = Math.max(0, latestAllowedDueAt - now);
  return Math.min(policyDelayMs, remainingMs);
}

export function resolveQueuedDueAt(
  policy: PullCoalescerPolicy,
  state: PullCoalescerState,
  nowRaw: number,
  immediate = false
): number {
  const now = Math.max(0, Math.round(Number(nowRaw) || 0));
  const dueByDebounce = immediate
    ? now
    : state.lastTriggerAt > 0
      ? state.lastTriggerAt + policy.debounceMs
      : now;
  const dueByGap = state.lastRunStartAt > 0 ? state.lastRunStartAt + policy.minGapMs : now;
  let dueAt = Math.max(now, dueByDebounce, dueByGap);
  if (policy.maxDelayMs > 0 && state.firstQueuedAt > 0) {
    dueAt = Math.min(dueAt, state.firstQueuedAt + policy.maxDelayMs);
  }
  return dueAt;
}
