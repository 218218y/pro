import type { TimeoutHandleLike } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { removeRealtimeChannel, disconnectRealtimeClient } from './cloud_sync_realtime.js';
import {
  clearCloudSyncRealtimeHints,
  invalidateCloudSyncRealtimeTransport,
  type CloudSyncRealtimeRefs,
  type CloudSyncRealtimeTransportArgs,
  type CloudSyncRealtimeTransportMutableState,
} from './cloud_sync_lifecycle_realtime_transport_shared.js';

export function clearCloudSyncRealtimeConnectTimer(args: {
  refs: CloudSyncRealtimeRefs;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
}): void {
  const { refs, clearTimeoutFn } = args;
  if (!refs.connectTimer) return;
  clearTimeoutFn(refs.connectTimer);
  refs.connectTimer = null;
}

export function cleanupCloudSyncRealtimeTransport(
  args: Pick<CloudSyncRealtimeTransportArgs, 'App' | 'refs' | 'clearTimeoutFn' | 'setSendRealtimeHint'> & {
    mutableState: CloudSyncRealtimeTransportMutableState;
    op: string;
    opts?: { keepHints?: boolean };
  }
): void {
  const { App, refs, clearTimeoutFn, setSendRealtimeHint, mutableState, op, opts } = args;

  invalidateCloudSyncRealtimeTransport(mutableState);
  if (!opts?.keepHints) {
    try {
      clearCloudSyncRealtimeHints({ mutableState, setSendRealtimeHint });
    } catch (err) {
      mutableState.sentAtByKey.clear();
      _cloudSyncReportNonFatal(App, `${op}.clearHints`, err, { throttleMs: 4000 });
    }
  }

  const client = refs.client;
  const channel = refs.channel;
  refs.channel = null;
  refs.client = null;

  if (mutableState.cleanupInFlight) return;
  mutableState.cleanupInFlight = true;
  try {
    try {
      clearCloudSyncRealtimeConnectTimer({ refs, clearTimeoutFn });
    } catch (err) {
      _cloudSyncReportNonFatal(App, `${op}.clearTimer`, err, { throttleMs: 4000 });
    }
    try {
      removeRealtimeChannel(client, channel);
    } catch (err) {
      _cloudSyncReportNonFatal(App, `${op}.removeChannel`, err, { throttleMs: 4000 });
    }
    try {
      disconnectRealtimeClient(client);
    } catch (err) {
      _cloudSyncReportNonFatal(App, `${op}.disconnectClient`, err, { throttleMs: 4000 });
    }
  } finally {
    mutableState.cleanupInFlight = false;
  }
}
