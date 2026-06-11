import type {
  AppContainer,
  CloudSyncRuntimeStatus,
  CloudSyncDiagFn,
  TimeoutHandleLike,
  CloudSyncRealtimeChannelLike,
  CloudSyncRealtimeClientLike,
} from '../../../types';

import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';

export type CloudSyncPollingTransitionFn = (reason: string, opts?: { publish?: boolean }) => void;

export type CloudSyncRealtimeRefs = {
  connectTimer: TimeoutHandleLike | null;
  client: CloudSyncRealtimeClientLike | null;
  channel: CloudSyncRealtimeChannelLike | null;
};

export type CloudSyncRealtimeTransportArgs = {
  App: AppContainer;
  refs: CloudSyncRealtimeRefs;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  startPolling: CloudSyncPollingTransitionFn;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  setSendRealtimeHint: (next: CloudSyncRealtimeHintSender | null) => void;
};

export type CloudSyncRealtimeTransport = {
  sentAtByKey: Map<string, number>;
  getTransportToken: () => number;
  invalidateTransport: () => number;
  clearConnectTimer: () => void;
  cleanupRealtimeTransport: (op: string, opts?: { keepHints?: boolean }) => void;
  setRealtimeFailure: (
    state: CloudSyncRuntimeStatus['realtime']['state'],
    lastError: string,
    diagEvent: string,
    pollingReason: string
  ) => void;
  handleRealtimeDisconnect: (
    why: string,
    subscribedRef: { current: boolean },
    transportToken: number,
    disconnectStateRef: { current: boolean },
    opts?: { lastError?: string }
  ) => void;
};

export type CloudSyncRealtimeTransportMutableState = {
  sentAtByKey: Map<string, number>;
  cleanupInFlight: boolean;
  transportToken: number;
};

export function createCloudSyncRealtimeTransportMutableState(): CloudSyncRealtimeTransportMutableState {
  return {
    sentAtByKey: new Map<string, number>(),
    cleanupInFlight: false,
    transportToken: 0,
  };
}

export function invalidateCloudSyncRealtimeTransport(
  mutableState: CloudSyncRealtimeTransportMutableState
): number {
  mutableState.transportToken += 1;
  return mutableState.transportToken;
}

export function clearCloudSyncRealtimeHints(args: {
  mutableState: CloudSyncRealtimeTransportMutableState;
  setSendRealtimeHint: (next: CloudSyncRealtimeHintSender | null) => void;
}): void {
  const { mutableState, setSendRealtimeHint } = args;
  setSendRealtimeHint(null);
  mutableState.sentAtByKey.clear();
}
