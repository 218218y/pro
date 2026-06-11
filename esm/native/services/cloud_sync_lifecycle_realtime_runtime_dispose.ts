import { markCloudSyncRealtimeDisposed } from './cloud_sync_lifecycle_realtime_support.js';
import type { CloudSyncRealtimeLifecycleArgs } from './cloud_sync_lifecycle_realtime_shared.js';
import type { CloudSyncRealtimeTransport } from './cloud_sync_lifecycle_realtime_transport.js';
import type { CloudSyncRealtimeRuntimeMutableState } from './cloud_sync_lifecycle_realtime_runtime_state.js';

export function disposeCloudSyncRealtimeLifecycle(
  args: Pick<CloudSyncRealtimeLifecycleArgs, 'runtimeStatus' | 'publishStatus'> & {
    transport: CloudSyncRealtimeTransport;
    mutableState: CloudSyncRealtimeRuntimeMutableState;
    opts?: { publish?: boolean };
  }
): void {
  const { runtimeStatus, publishStatus, transport, mutableState, opts } = args;
  if (mutableState.disposed) return;
  mutableState.disposed = true;
  transport.cleanupRealtimeTransport('cloudSyncLifecycle.dispose');
  markCloudSyncRealtimeDisposed({
    runtimeStatus,
    publishStatus,
    ...(opts ? { publish: opts.publish } : {}),
  });
}
