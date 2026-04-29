import {
  addPendingReason,
  readPendingReasonSummary,
  resetPendingReasonState,
} from './cloud_sync_pending_reason_state.js';
import { reportCoalescedPullDiag } from './cloud_sync_coalescer_diag.js';
import { resolveQueuedDueAt } from './cloud_sync_coalescer_policy.js';
import { resetPullCoalescerState } from './cloud_sync_coalescer_shared.js';
import type { CloudSyncPullCoalescerControls } from './cloud_sync_coalescer_controls_runtime.js';
import type { CloudSyncPullCoalescerRuntimeContext } from './cloud_sync_coalescer_runtime_shared.js';

export function createCloudSyncPullCoalescerFire(
  context: CloudSyncPullCoalescerRuntimeContext,
  controls: Pick<
    CloudSyncPullCoalescerControls,
    'clearTimer' | 'stopWaitingForMainPush' | 'parkUntilMainPushSettles' | 'scheduleQueuedRun' | 'armAt'
  >
): () => void {
  return (): void => {
    context.state.timer = null;
    context.state.timerDueAt = 0;
    if (context.deps.isDisposed() || context.deps.isSuppressed()) {
      controls.clearTimer();
      controls.stopWaitingForMainPush();
      resetPullCoalescerState(context.state);
      return;
    }
    if (!context.state.queued) {
      controls.stopWaitingForMainPush();
      return;
    }
    if (context.state.inFlight) return;

    if (controls.parkUntilMainPushSettles()) return;
    controls.stopWaitingForMainPush();

    const now = Date.now();
    const dueAt = resolveQueuedDueAt(context.policy, context.state, now);
    if (dueAt > now) {
      controls.armAt(dueAt);
      return;
    }

    context.state.inFlight = true;
    context.state.lastRunStartAt = now;

    const reason = readPendingReasonSummary(context.state.pendingReasons, context.policy.scopeLabel);
    const count = context.state.pendingCount;
    context.state.queued = false;
    context.state.firstQueuedAt = 0;
    context.state.pendingCount = 0;
    resetPendingReasonState(context.state.pendingReasons);

    reportCoalescedPullDiag({
      deps: context.deps,
      policy: context.policy,
      state: context.state,
      now,
      count,
      reason,
    });

    let runPromise: Promise<void>;
    try {
      runPromise = Promise.resolve(context.deps.run());
    } catch (e) {
      context.deps.reportNonFatal(`pullCoalescer.${context.policy.scopeLabel}.run`, e);
      context.state.inFlight = false;
      if (context.state.queued && !context.deps.isDisposed() && !context.deps.isSuppressed()) {
        controls.scheduleQueuedRun();
      } else {
        controls.stopWaitingForMainPush();
        if (context.state.queued && (context.deps.isDisposed() || context.deps.isSuppressed())) {
          resetPullCoalescerState(context.state);
        }
      }
      return;
    }

    void runPromise
      .catch(e => {
        context.deps.reportNonFatal(`pullCoalescer.${context.policy.scopeLabel}.run`, e);
      })
      .finally(() => {
        context.state.inFlight = false;
        if (context.state.queued && !context.deps.isDisposed() && !context.deps.isSuppressed()) {
          controls.scheduleQueuedRun();
          return;
        }
        controls.stopWaitingForMainPush();
        if (context.state.queued && (context.deps.isDisposed() || context.deps.isSuppressed())) {
          resetPullCoalescerState(context.state);
        }
      });
  };
}

export function triggerCloudSyncPullCoalescer(
  context: CloudSyncPullCoalescerRuntimeContext,
  controls: Pick<CloudSyncPullCoalescerControls, 'scheduleQueuedRun'>,
  reason: string,
  immediate?: boolean
): void {
  if (context.deps.isDisposed() || context.deps.isSuppressed()) return;
  const now = Date.now();

  context.state.queued = true;
  context.state.pendingCount += 1;
  addPendingReason(context.state.pendingReasons, context.policy.scopeLabel, reason);
  if (!context.state.firstQueuedAt) context.state.firstQueuedAt = now;
  context.state.lastTriggerAt = now;

  if (context.state.inFlight) return;
  controls.scheduleQueuedRun({ immediate: !!immediate });
}

export function cancelCloudSyncPullCoalescer(
  context: CloudSyncPullCoalescerRuntimeContext,
  controls: Pick<CloudSyncPullCoalescerControls, 'clearTimer' | 'stopWaitingForMainPush'>
): void {
  controls.clearTimer();
  context.state.timerDueAt = 0;
  controls.stopWaitingForMainPush();
  resetPullCoalescerState(context.state);
}
