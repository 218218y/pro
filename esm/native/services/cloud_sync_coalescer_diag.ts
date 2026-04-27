import type {
  PullCoalescerDeps,
  PullCoalescerPolicy,
  PullCoalescerState,
} from './cloud_sync_coalescer_shared.js';

export function reportCoalescedPullDiag(args: {
  deps: Pick<PullCoalescerDeps, 'diag' | 'reportNonFatal'>;
  policy: PullCoalescerPolicy;
  state: PullCoalescerState;
  now: number;
  count: number;
  reason: string;
}): void {
  const {
    deps: { diag, reportNonFatal },
    policy,
    state,
    now,
    count,
    reason,
  } = args;

  if (count <= 1) return;

  try {
    const sinceLastDiag = now - state.lastCoalescedDiagAt;
    if (!state.lastCoalescedDiagAt || policy.diagCooldownMs <= 0 || sinceLastDiag >= policy.diagCooldownMs) {
      const payload: { scope: string; count: number; reason: string; suppressedRuns?: number } = {
        scope: policy.scopeLabel,
        count,
        reason,
      };
      if (state.suppressedCoalescedRuns > 0) payload.suppressedRuns = state.suppressedCoalescedRuns;
      diag('pull:coalesced:run', payload);
      state.lastCoalescedDiagAt = now;
      state.suppressedCoalescedRuns = 0;
      return;
    }
    state.suppressedCoalescedRuns += 1;
  } catch (e) {
    reportNonFatal(`pullCoalescer.${policy.scopeLabel}.diag`, e);
  }
}
