import type { AppContainer, IntervalHandleLike, CloudSyncRuntimeStatus } from '../../../types';

import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support_bindings.js';
import { requestCloudSyncLifecycleRefresh } from './cloud_sync_lifecycle_support_refresh.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import { createCloudSyncPollingRefreshProfile } from './cloud_sync_lifecycle_refresh_profiles.js';
import { clearCloudSyncPollingTimer } from './cloud_sync_lifecycle_support_polling_shared.js';

export function createCloudSyncPollingTick(args: {
  App: AppContainer;
  pollTimerRef: { current: IntervalHandleLike | null };
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
  runtimeStatus: CloudSyncRuntimeStatus;
  pollIntervalMs: number;
  suppressRef: { v: boolean };
  pullAllNow: CloudSyncPullAllNowFn;
  restartRealtime?: () => void;
  isDisposed?: () => boolean;
  getIntervalHandle: () => IntervalHandleLike | null;
  stopPolling: (reason: string) => void;
}): () => void {
  const {
    App,
    pollTimerRef,
    clearIntervalFn,
    runtimeStatus,
    pollIntervalMs,
    suppressRef,
    pullAllNow,
    restartRealtime,
    isDisposed,
    getIntervalHandle,
    stopPolling,
  } = args;

  return (): void => {
    if (pollTimerRef.current !== getIntervalHandle()) return;
    if (isCloudSyncLifecycleGuardDisposed(isDisposed)) {
      clearCloudSyncPollingTimer({ pollTimerRef, clearIntervalFn });
      return;
    }
    if (runtimeStatus.realtime?.enabled !== false) restartRealtime?.();
    const profile = createCloudSyncPollingRefreshProfile(pollIntervalMs);
    const refreshRequest = requestCloudSyncLifecycleRefresh({
      App,
      runtimeStatus,
      suppressRef,
      pullAllNow,
      opts: profile.opts,
      policy: profile.policy,
    });
    if (refreshRequest.blockedBy === 'realtime') stopPolling('polling-auto-stop');
  };
}
