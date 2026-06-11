import type {
  AppContainer,
  IntervalHandleLike,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
} from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support_bindings.js';
import {
  hasCanonicalPollingStatus,
  syncCloudSyncPollingStatusInPlace,
} from './cloud_sync_lifecycle_support_polling_shared.js';
import { createCloudSyncPollingTick } from './cloud_sync_lifecycle_support_polling_tick_runtime.js';
import { stopCloudSyncPolling } from './cloud_sync_lifecycle_support_polling_status_runtime.js';

export type CloudSyncLifecycleStartPollingArgs = {
  App: AppContainer;
  pollTimerRef: { current: IntervalHandleLike | null };
  setIntervalFn: (handler: () => void, ms: number) => IntervalHandleLike;
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
  runtimeStatus: CloudSyncRuntimeStatus;
  pollIntervalMs: number;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  reason: string;
  suppressRef?: { v: boolean };
  pullAllNow: CloudSyncPullAllNowFn;
  restartRealtime?: () => void;
  publish?: boolean;
  isDisposed?: () => boolean;
};

function shouldKickCloudSyncRealtimeRecovery(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  reason: string;
}): boolean {
  const { runtimeStatus, reason } = args;
  return (
    runtimeStatus.realtime?.enabled !== false &&
    reason.startsWith('realtime-') &&
    reason !== 'realtime-disabled'
  );
}

function reportCloudSyncPollingRecoveryFailure(App: AppContainer, op: string, err: unknown): void {
  _cloudSyncReportNonFatal(App, op, err, { throttleMs: 8000 });
}

function observeCloudSyncPollingRecoveryHook(args: {
  App: AppContainer;
  op: string;
  hookResult: unknown;
}): void {
  const { App, op, hookResult } = args;
  void Promise.resolve(hookResult).catch(err => {
    reportCloudSyncPollingRecoveryFailure(App, op, err);
  });
}

function kickCloudSyncRealtimeRecovery(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  reason: string;
  pullAllNow: CloudSyncPullAllNowFn;
  restartRealtime?: (() => void) | undefined;
}): void {
  const { App, runtimeStatus, reason, pullAllNow, restartRealtime } = args;
  if (!shouldKickCloudSyncRealtimeRecovery({ runtimeStatus, reason })) return;
  try {
    const pullResult = pullAllNow({ reason: `${reason}.recover` });
    observeCloudSyncPollingRecoveryHook({
      App,
      op: 'cloudSyncPolling.realtimeRecoveryPull',
      hookResult: pullResult,
    });
  } catch (err) {
    reportCloudSyncPollingRecoveryFailure(App, 'cloudSyncPolling.realtimeRecoveryPull', err);
  }
  try {
    const restartResult = restartRealtime?.();
    observeCloudSyncPollingRecoveryHook({
      App,
      op: 'cloudSyncPolling.realtimeRecoveryRestart',
      hookResult: restartResult,
    });
  } catch (err) {
    reportCloudSyncPollingRecoveryFailure(App, 'cloudSyncPolling.realtimeRecoveryRestart', err);
  }
}

export function startCloudSyncPolling(args: CloudSyncLifecycleStartPollingArgs): void {
  const {
    App,
    pollTimerRef,
    setIntervalFn,
    clearIntervalFn,
    runtimeStatus,
    pollIntervalMs,
    publishStatus,
    diag,
    reason,
    suppressRef,
    pullAllNow,
    restartRealtime,
    isDisposed,
  } = args;
  const shouldPublish = args.publish !== false;
  if (pollTimerRef.current) {
    if (
      hasCanonicalPollingStatus({
        runtimeStatus,
        active: true,
        intervalMs: pollIntervalMs,
        reason,
      })
    ) {
      return;
    }
    syncCloudSyncPollingStatusInPlace({
      runtimeStatus,
      active: true,
      intervalMs: pollIntervalMs,
      reason,
    });
    if (shouldPublish) publishStatus();
    kickCloudSyncRealtimeRecovery({
      App,
      runtimeStatus,
      reason,
      pullAllNow,
      restartRealtime,
    });
    return;
  }

  let intervalHandle: IntervalHandleLike | null = null;
  const onPollTick = createCloudSyncPollingTick({
    App,
    pollTimerRef,
    clearIntervalFn,
    runtimeStatus,
    pollIntervalMs,
    suppressRef: suppressRef || { v: false },
    pullAllNow,
    restartRealtime,
    isDisposed,
    getIntervalHandle: () => intervalHandle,
    stopPolling: stopReason => {
      stopCloudSyncPolling({
        pollTimerRef,
        clearIntervalFn,
        runtimeStatus,
        pollIntervalMs,
        publishStatus,
        diag,
        reason: stopReason,
      });
    },
  });
  intervalHandle = setIntervalFn(onPollTick, pollIntervalMs);
  pollTimerRef.current = intervalHandle;

  const pollingStatus = syncCloudSyncPollingStatusInPlace({
    runtimeStatus,
    active: true,
    intervalMs: pollIntervalMs,
    reason,
  });
  if (shouldPublish) publishStatus();
  diag('polling:start', pollingStatus);
  kickCloudSyncRealtimeRecovery({
    App,
    runtimeStatus,
    reason,
    pullAllNow,
    restartRealtime,
  });
}
