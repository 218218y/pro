import {
  createPullCoalescerPolicy,
  createPullCoalescerState,
  type CloudSyncPullCoalescer,
  type PullCoalescerDeps,
} from './cloud_sync_coalescer_shared.js';
import { createCloudSyncPullCoalescerControls } from './cloud_sync_coalescer_controls_runtime.js';
import { createCloudSyncPullCoalescerRuntimeContext } from './cloud_sync_coalescer_runtime_shared.js';
import {
  cancelCloudSyncPullCoalescer,
  createCloudSyncPullCoalescerFire,
  triggerCloudSyncPullCoalescer,
} from './cloud_sync_coalescer_queue_runtime.js';

export function createCloudSyncPullCoalescer(deps: PullCoalescerDeps): CloudSyncPullCoalescer {
  const policy = createPullCoalescerPolicy(deps);
  const state = createPullCoalescerState();
  const context = createCloudSyncPullCoalescerRuntimeContext(deps, policy, state);
  const controls = createCloudSyncPullCoalescerControls(context);

  context.resumeAfterMainPushSettled = (): void => {
    if (!context.state.waitingForMainPush) return;
    controls.stopWaitingForMainPush();
    controls.scheduleQueuedRun();
  };
  context.fire = createCloudSyncPullCoalescerFire(context, controls);

  return {
    trigger: (reason, immediate) => {
      triggerCloudSyncPullCoalescer(context, controls, reason, immediate);
    },
    cancel: () => {
      cancelCloudSyncPullCoalescer(context, controls);
    },
  };
}
