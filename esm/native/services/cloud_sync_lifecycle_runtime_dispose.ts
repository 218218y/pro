import { mutateCloudSyncLifecycleSnapshot } from './cloud_sync_lifecycle_status_runtime.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import type { CloudSyncLifecycleArgs } from './cloud_sync_lifecycle_state.js';
import type { CloudSyncLifecycleRuntimeDeps } from './cloud_sync_lifecycle_runtime_setup.js';

export function disposeCloudSyncLifecycleOwner(
  args: Pick<CloudSyncLifecycleArgs, 'App' | 'runtimeStatus' | 'publishStatus'> & {
    deps: CloudSyncLifecycleRuntimeDeps;
  }
): void {
  const { App, runtimeStatus, publishStatus, deps } = args;
  const { state, stopPolling, cloudSyncRealtime } = deps;

  if (state.disposedRef.v) return;
  state.disposedRef.v = true;
  state.startedRef.v = false;

  let publishChanged = false;
  mutateCloudSyncLifecycleSnapshot({
    runtimeStatus,
    publishStatus: () => {
      publishChanged = true;
    },
    mutate: () => {
      try {
        stopPolling('dispose', { publish: false });
      } catch (err) {
        _cloudSyncReportNonFatal(App, 'cloudSyncLifecycle.dispose.timers', err, { throttleMs: 4000 });
      }
      cloudSyncRealtime.dispose({ publish: false });
    },
  });
  if (publishChanged) publishStatus();

  try {
    for (let i = state.listenerCleanup.length - 1; i >= 0; i--) {
      try {
        state.listenerCleanup[i]();
      } catch (err) {
        _cloudSyncReportNonFatal(App, 'cloudSyncLifecycle.dispose.listenerCleanup', err, {
          throttleMs: 4000,
        });
      }
    }
    state.listenerCleanup.length = 0;
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'cloudSyncLifecycle.dispose.cleanup', err, { throttleMs: 4000 });
  }
}
