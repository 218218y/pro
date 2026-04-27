import type {
  AppContainer,
  TimeoutHandleLike,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type {
  CloudSyncRealtimeHintSender,
  CloudSyncRealtimeScopedHandlerMap,
} from './cloud_sync_pull_scopes.js';
import type { CloudSyncRealtimeRefs } from './cloud_sync_lifecycle_realtime_transport.js';
import { type CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support.js';

export type CloudSyncListenerTargetLike = {
  addEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
  removeEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
};

export type CloudSyncAddListenerLike = (
  target: CloudSyncListenerTargetLike | null,
  type: string,
  handler: (ev: unknown) => void
) => void;

export type CloudSyncPollingTransitionFn = (reason: string, opts?: { publish?: boolean }) => void;

export type CloudSyncRealtimeLifecycleArgs = {
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
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  refs: CloudSyncRealtimeRefs;
  setSendRealtimeHint: (next: CloudSyncRealtimeHintSender | null) => void;
};

export type CloudSyncRealtimeLifecycleOps = {
  startRealtime: () => Promise<void>;
  dispose: (opts?: { publish?: boolean }) => void;
};

export function hasLiveRealtimeTransport(refs: CloudSyncRealtimeRefs): boolean {
  return !!(refs.client || refs.channel || refs.connectTimer);
}
