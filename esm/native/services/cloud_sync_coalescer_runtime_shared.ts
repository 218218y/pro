import type {
  PullCoalescerDeps,
  PullCoalescerPolicy,
  PullCoalescerState,
} from './cloud_sync_coalescer_shared.js';

export interface CloudSyncPullCoalescerRuntimeContext {
  deps: PullCoalescerDeps;
  policy: PullCoalescerPolicy;
  state: PullCoalescerState;
  fire: () => void;
  resumeAfterMainPushSettled: () => void;
}

export function createCloudSyncPullCoalescerRuntimeContext(
  deps: PullCoalescerDeps,
  policy: PullCoalescerPolicy,
  state: PullCoalescerState
): CloudSyncPullCoalescerRuntimeContext {
  return {
    deps,
    policy,
    state,
    fire: () => undefined,
    resumeAfterMainPushSettled: () => undefined,
  };
}
