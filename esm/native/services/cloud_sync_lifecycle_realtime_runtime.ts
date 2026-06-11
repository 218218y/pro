import { createCloudSyncRealtimeTransport } from './cloud_sync_lifecycle_realtime_transport.js';
import {
  type CloudSyncRealtimeLifecycleArgs,
  type CloudSyncRealtimeLifecycleOps,
} from './cloud_sync_lifecycle_realtime_shared.js';
import { createCloudSyncRealtimeRuntimeMutableState } from './cloud_sync_lifecycle_realtime_runtime_state.js';
import { startCloudSyncRealtimeLifecycle } from './cloud_sync_lifecycle_realtime_runtime_start.js';
import { disposeCloudSyncRealtimeLifecycle } from './cloud_sync_lifecycle_realtime_runtime_dispose.js';

export type {
  CloudSyncRealtimeLifecycleArgs,
  CloudSyncRealtimeLifecycleOps,
} from './cloud_sync_lifecycle_realtime_shared.js';

export function createCloudSyncRealtimeLifecycle(
  args: CloudSyncRealtimeLifecycleArgs
): CloudSyncRealtimeLifecycleOps {
  const transport = createCloudSyncRealtimeTransport({
    App: args.App,
    refs: args.refs,
    runtimeStatus: args.runtimeStatus,
    publishStatus: args.publishStatus,
    diag: args.diag,
    startPolling: args.startPolling,
    clearTimeoutFn: args.clearTimeoutFn,
    setSendRealtimeHint: args.setSendRealtimeHint,
  });
  const mutableState = createCloudSyncRealtimeRuntimeMutableState();

  return {
    startRealtime: () =>
      startCloudSyncRealtimeLifecycle({
        ...args,
        transport,
        mutableState,
      }),
    dispose: opts => {
      disposeCloudSyncRealtimeLifecycle({
        runtimeStatus: args.runtimeStatus,
        publishStatus: args.publishStatus,
        transport,
        mutableState,
        opts,
      });
    },
  };
}
