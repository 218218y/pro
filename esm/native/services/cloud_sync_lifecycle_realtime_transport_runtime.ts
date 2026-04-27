import {
  createCloudSyncRealtimeTransportMutableState,
  invalidateCloudSyncRealtimeTransport,
  type CloudSyncRealtimeTransport,
  type CloudSyncRealtimeTransportArgs,
} from './cloud_sync_lifecycle_realtime_transport_shared.js';
import { createCloudSyncRealtimeTransportControls } from './cloud_sync_lifecycle_realtime_transport_controls.js';

export type {
  CloudSyncRealtimeTransport,
  CloudSyncRealtimeTransportArgs,
} from './cloud_sync_lifecycle_realtime_transport_shared.js';

export function createCloudSyncRealtimeTransport(
  args: CloudSyncRealtimeTransportArgs
): CloudSyncRealtimeTransport {
  const mutableState = createCloudSyncRealtimeTransportMutableState();

  const getTransportToken = (): number => mutableState.transportToken;

  const invalidateTransport = (): number => invalidateCloudSyncRealtimeTransport(mutableState);

  const controls = createCloudSyncRealtimeTransportControls({
    ...args,
    mutableState,
    getTransportToken,
  });

  return {
    sentAtByKey: mutableState.sentAtByKey,
    getTransportToken,
    invalidateTransport,
    ...controls,
  };
}
