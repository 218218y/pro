import { startCloudSyncRealtimeChannel } from './cloud_sync_lifecycle_realtime_channel.js';
import { normalizeUnknownError } from '../runtime/error_normalization.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  hasLiveRealtimeTransport,
  type CloudSyncRealtimeLifecycleArgs,
} from './cloud_sync_lifecycle_realtime_shared.js';
import type { CloudSyncRealtimeTransport } from './cloud_sync_lifecycle_realtime_transport.js';
import type { CloudSyncRealtimeRuntimeMutableState } from './cloud_sync_lifecycle_realtime_runtime_state.js';

export function startCloudSyncRealtimeLifecycle(
  args: CloudSyncRealtimeLifecycleArgs & {
    transport: CloudSyncRealtimeTransport;
    mutableState: CloudSyncRealtimeRuntimeMutableState;
  }
): Promise<void> {
  const {
    App,
    cfg,
    room,
    clientId,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    isDisposed,
    pullAllNow,
    startPolling,
    stopPolling,
    markRealtimeEvent,
    realtimeScopedHandlers,
    addListener,
    setTimeoutFn,
    refs,
    setSendRealtimeHint,
    transport,
    mutableState,
  } = args;

  if (mutableState.disposed || isDisposed()) return Promise.resolve();
  if (mutableState.startFlight) return mutableState.startFlight;
  if (hasLiveRealtimeTransport(refs)) return Promise.resolve();

  const flight = Promise.resolve()
    .then(async () => {
      transport.cleanupRealtimeTransport('realtime.restart');
      await startCloudSyncRealtimeChannel({
        App,
        cfg,
        room,
        clientId,
        runtimeStatus,
        publishStatus,
        diag,
        suppressRef,
        isDisposed,
        pullAllNow,
        startPolling,
        stopPolling,
        markRealtimeEvent,
        realtimeScopedHandlers,
        addListener,
        setTimeoutFn,
        refs,
        setSendRealtimeHint,
        transport,
        restartRealtime: () => {
          void startCloudSyncRealtimeLifecycle(args);
        },
      });
    })
    .catch(err => {
      _cloudSyncReportNonFatal(App, 'realtime.startFlight', err, { throttleMs: 6000 });
      try {
        transport.setRealtimeFailure(
          'error',
          normalizeUnknownError(err).message,
          'realtime:start-flight-error',
          'realtime-start-error'
        );
      } catch (fallbackErr) {
        _cloudSyncReportNonFatal(App, 'realtime.startFlightFallback', fallbackErr, {
          throttleMs: 6000,
        });
      }
    })
    .finally(() => {
      if (mutableState.startFlight === flight) mutableState.startFlight = null;
    });

  mutableState.startFlight = flight;
  return flight;
}
