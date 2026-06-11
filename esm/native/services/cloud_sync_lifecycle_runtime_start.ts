import {
  bindCloudSyncAttentionPulls,
  bindCloudSyncDiagStorageListener,
} from './cloud_sync_lifecycle_attention.js';
import { mutateCloudSyncLifecycleSnapshot } from './cloud_sync_lifecycle_status_runtime.js';
import { syncCloudSyncRealtimeStatusInPlace } from './cloud_sync_lifecycle_support_realtime.js';
import { startCloudSyncRealtimeWithLifecycleFallback } from './cloud_sync_lifecycle_runtime_realtime_start.js';
import type { CloudSyncLifecycleArgs } from './cloud_sync_lifecycle_state.js';
import type { CloudSyncLifecycleRuntimeDeps } from './cloud_sync_lifecycle_runtime_setup.js';

export function startCloudSyncLifecycleOwner(
  args: Pick<
    CloudSyncLifecycleArgs,
    | 'App'
    | 'cfg'
    | 'runtimeStatus'
    | 'diagStorageKey'
    | 'publishStatus'
    | 'updateDiagEnabled'
    | 'diag'
    | 'suppressRef'
    | 'isDisposed'
  > & {
    deps: CloudSyncLifecycleRuntimeDeps;
  }
): void {
  const {
    App,
    cfg,
    runtimeStatus,
    diagStorageKey,
    publishStatus,
    updateDiagEnabled,
    diag,
    suppressRef,
    isDisposed,
    deps,
  } = args;
  const { state, addListener, pullAllNow, startPolling, cloudSyncRealtime } = deps;

  if (state.disposedRef.v || state.startedRef.v) return;
  state.startedRef.v = true;
  if (cfg.realtime) {
    startCloudSyncRealtimeWithLifecycleFallback({
      App,
      runtimeStatus,
      publishStatus,
      diag,
      startPolling,
      cloudSyncRealtime,
      op: 'cloudSyncLifecycle.realtimeInitialStart',
      diagEvent: 'realtime:owner-start-error',
      pollingReason: 'realtime-owner-start-error',
    });
  } else {
    mutateCloudSyncLifecycleSnapshot({
      runtimeStatus,
      publishStatus,
      mutate: () => {
        syncCloudSyncRealtimeStatusInPlace({
          runtimeStatus,
          enabled: false,
          state: 'disabled',
          channel: '',
        });
        startPolling('realtime-disabled', { publish: false });
      },
    });
  }
  bindCloudSyncDiagStorageListener({
    App,
    runtimeStatus,
    diagStorageKey,
    updateDiagEnabled,
    publishStatus,
    addListener,
    isDisposed,
  });
  bindCloudSyncAttentionPulls({
    App,
    runtimeStatus,
    suppressRef,
    pullAllNow,
    addListener,
    isDisposed,
  });
}
