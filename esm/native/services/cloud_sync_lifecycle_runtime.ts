import { type CloudSyncLifecycleArgs, type CloudSyncLifecycleOps } from './cloud_sync_lifecycle_state.js';
import { createCloudSyncLifecycleRuntimeDeps } from './cloud_sync_lifecycle_runtime_setup.js';
import { startCloudSyncLifecycleOwner } from './cloud_sync_lifecycle_runtime_start.js';
import { disposeCloudSyncLifecycleOwner } from './cloud_sync_lifecycle_runtime_dispose.js';

export type { CloudSyncLifecycleArgs, CloudSyncLifecycleOps } from './cloud_sync_lifecycle_state.js';

export function createCloudSyncLifecycleOps(args: CloudSyncLifecycleArgs): CloudSyncLifecycleOps {
  const deps = createCloudSyncLifecycleRuntimeDeps(args);

  return {
    pullAllNow: deps.pullAllNow,
    start: () => {
      startCloudSyncLifecycleOwner({
        App: args.App,
        cfg: args.cfg,
        runtimeStatus: args.runtimeStatus,
        diagStorageKey: args.diagStorageKey,
        publishStatus: args.publishStatus,
        updateDiagEnabled: args.updateDiagEnabled,
        diag: args.diag,
        suppressRef: args.suppressRef,
        isDisposed: args.isDisposed,
        deps,
      });
    },
    dispose: () => {
      disposeCloudSyncLifecycleOwner({
        App: args.App,
        runtimeStatus: args.runtimeStatus,
        publishStatus: args.publishStatus,
        deps,
      });
    },
  };
}
