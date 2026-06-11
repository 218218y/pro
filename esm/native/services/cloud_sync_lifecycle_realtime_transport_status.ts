import {
  markCloudSyncRealtimeDisconnected,
  markCloudSyncRealtimeFailure,
} from './cloud_sync_lifecycle_realtime_support.js';
import type { CloudSyncRealtimeTransportArgs } from './cloud_sync_lifecycle_realtime_transport_shared.js';

export function setCloudSyncRealtimeFailure(
  args: Pick<CloudSyncRealtimeTransportArgs, 'runtimeStatus' | 'publishStatus' | 'diag' | 'startPolling'> & {
    cleanupRealtimeTransport: (op: string, opts?: { keepHints?: boolean }) => void;
    state: CloudSyncRealtimeTransportArgs['runtimeStatus']['realtime']['state'];
    lastError: string;
    diagEvent: string;
    pollingReason: string;
  }
): void {
  const {
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    cleanupRealtimeTransport,
    state,
    lastError,
    diagEvent,
    pollingReason,
  } = args;
  cleanupRealtimeTransport('realtime.failure');
  markCloudSyncRealtimeFailure({
    runtimeStatus,
    publishStatus,
    diag,
    state,
    lastError,
    diagEvent,
    pollingReason,
    startPolling,
  });
}

export function handleCloudSyncRealtimeDisconnect(
  args: Pick<CloudSyncRealtimeTransportArgs, 'runtimeStatus' | 'publishStatus' | 'diag' | 'startPolling'> & {
    cleanupRealtimeTransport: (op: string, opts?: { keepHints?: boolean }) => void;
    currentTransportToken: () => number;
    why: string;
    subscribedRef: { current: boolean };
    transportToken: number;
    disconnectStateRef: { current: boolean };
    opts?: { lastError?: string };
  }
): void {
  const {
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    cleanupRealtimeTransport,
    currentTransportToken,
    why,
    subscribedRef,
    transportToken,
    disconnectStateRef,
    opts,
  } = args;
  if (disconnectStateRef.current) return;
  if (transportToken !== currentTransportToken()) return;
  disconnectStateRef.current = true;
  cleanupRealtimeTransport('realtime.disconnect');
  markCloudSyncRealtimeDisconnected({
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    subscribedRef,
    why,
    ...(typeof opts?.lastError === 'string' ? { lastError: opts.lastError } : {}),
  });
}
