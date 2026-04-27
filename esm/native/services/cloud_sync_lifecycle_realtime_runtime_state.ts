export type CloudSyncRealtimeRuntimeMutableState = {
  startFlight: Promise<void> | null;
  disposed: boolean;
};

export function createCloudSyncRealtimeRuntimeMutableState(): CloudSyncRealtimeRuntimeMutableState {
  return {
    startFlight: null,
    disposed: false,
  };
}
