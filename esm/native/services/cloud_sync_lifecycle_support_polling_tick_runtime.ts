import type { AppContainer, IntervalHandleLike, CloudSyncRuntimeStatus } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support_bindings.js';
import {
  requestCloudSyncLifecycleRefresh,
  type CloudSyncLifecycleRefreshRequestResult,
} from './cloud_sync_lifecycle_support_refresh.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import { createCloudSyncPollingRefreshProfile } from './cloud_sync_lifecycle_refresh_profiles.js';
import { clearCloudSyncPollingTimer } from './cloud_sync_lifecycle_support_polling_shared.js';

function reportCloudSyncPollingTickError(App: AppContainer, op: string, err: unknown): void {
  _cloudSyncReportNonFatal(App, op, err, { throttleMs: 8000 });
}

function observeCloudSyncPollingTickHook(args: { App: AppContainer; op: string; hookResult: unknown }): void {
  const { App, op, hookResult } = args;
  void Promise.resolve(hookResult).catch(err => {
    reportCloudSyncPollingTickError(App, op, err);
  });
}

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
    if (runtimeStatus.realtime?.enabled !== false) {
      try {
        const restartResult = restartRealtime?.();
        observeCloudSyncPollingTickHook({
          App,
          op: 'cloudSyncPolling.tickRealtimeRestart',
          hookResult: restartResult,
        });
      } catch (err) {
        reportCloudSyncPollingTickError(App, 'cloudSyncPolling.tickRealtimeRestart', err);
      }
    }
    const profile = createCloudSyncPollingRefreshProfile(pollIntervalMs);
    let refreshRequest: CloudSyncLifecycleRefreshRequestResult;
    try {
      refreshRequest = requestCloudSyncLifecycleRefresh({
        App,
        runtimeStatus,
        suppressRef,
        pullAllNow,
        opts: profile.opts,
        policy: profile.policy,
        reportOp: 'cloudSyncPolling.tickRefresh',
      });
    } catch (err) {
      reportCloudSyncPollingTickError(App, 'cloudSyncPolling.tickRefresh', err);
      return;
    }
    if (refreshRequest.blockedBy === 'realtime') {
      try {
        stopPolling('polling-auto-stop');
      } catch (err) {
        reportCloudSyncPollingTickError(App, 'cloudSyncPolling.tickAutoStop', err);
      }
    }
  };
}
