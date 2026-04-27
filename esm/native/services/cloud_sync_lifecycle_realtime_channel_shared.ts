import type {
  AppContainer,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
  TimeoutHandleLike,
  CloudSyncRealtimeClientLike,
  CloudSyncRealtimeChannelLike,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type {
  CloudSyncRealtimeHintSender,
  CloudSyncRealtimeScopedHandlerMap,
} from './cloud_sync_pull_scopes.js';
import type {
  CloudSyncRealtimeTransport,
  CloudSyncRealtimeRefs,
} from './cloud_sync_lifecycle_realtime_transport.js';
import { type CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support.js';
import { removeRealtimeChannel, disconnectRealtimeClient } from './cloud_sync_realtime.js';

type CloudSyncListenerTargetLike = {
  addEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
  removeEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
};

type CloudSyncAddListenerLike = (
  target: CloudSyncListenerTargetLike | null,
  type: string,
  handler: (ev: unknown) => void
) => void;

type CloudSyncPollingTransitionFn = (reason: string, opts?: { publish?: boolean }) => void;

export const REALTIME_CONNECT_TIMEOUT_MS = 12000;
export const REALTIME_CONNECT_SOFT_TIMEOUT_MS = 1800;
export const REALTIME_BROADCAST_EVENT = 'cloud_sync_hint';
export const REALTIME_HINT_DEDUPE_MS = 180;

export type { CloudSyncListenerTargetLike, CloudSyncAddListenerLike, CloudSyncPollingTransitionFn };

export type CloudSyncTransientRealtimeRefs = {
  client: CloudSyncRealtimeClientLike | null;
  channel: CloudSyncRealtimeChannelLike | null;
};

export type CloudSyncRealtimeChannelStartArgs = {
  App: AppContainer;
  cfg: SupabaseCfg;
  room: string;
  clientId: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  suppressRef: { v: boolean };
  isDisposed: () => boolean;
  pullAllNow: CloudSyncPullAllNowFn;
  startPolling: CloudSyncPollingTransitionFn;
  stopPolling: CloudSyncPollingTransitionFn;
  markRealtimeEvent: () => boolean;
  realtimeScopedHandlers: CloudSyncRealtimeScopedHandlerMap;
  addListener: CloudSyncAddListenerLike;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  refs: CloudSyncRealtimeRefs;
  setSendRealtimeHint: (next: CloudSyncRealtimeHintSender | null) => void;
  transport: CloudSyncRealtimeTransport;
  restartRealtime?: () => void;
};

export function cleanupStaleRealtimeStart(args: {
  refs: CloudSyncRealtimeRefs;
  transient: CloudSyncTransientRealtimeRefs;
}): void {
  const { refs, transient } = args;
  const ownsChannel = refs.channel === transient.channel;
  const ownsClient = refs.client === transient.client;
  if (ownsChannel) refs.channel = null;
  if (ownsClient) refs.client = null;
  if (ownsChannel) removeRealtimeChannel(transient.client, transient.channel);
  if (ownsClient) disconnectRealtimeClient(transient.client);
}
