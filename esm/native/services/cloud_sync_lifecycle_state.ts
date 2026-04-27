import type {
  AppContainer,
  TimeoutHandleLike,
  IntervalHandleLike,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
} from '../../../types';
import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncMainPullTriggerLike, CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import type { CloudSyncPullTriggerMap, CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support.js';

export type CloudSyncLifecycleArgs = {
  App: AppContainer;
  cfg: SupabaseCfg;
  room: string;
  clientId: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  diagStorageKey: string;
  publishStatus: () => void;
  updateDiagEnabled: () => void;
  diag: CloudSyncDiagFn;
  suppressRef: { v: boolean };
  isDisposed: () => boolean;
  mainPullTrigger: CloudSyncMainPullTriggerLike;
  pullCoalescers: CloudSyncPullTriggerMap;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  setIntervalFn: (handler: () => void, ms: number) => IntervalHandleLike;
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
  setSendRealtimeHint: (next: CloudSyncRealtimeHintSender | null) => void;
};

export type CloudSyncLifecycleOps = {
  pullAllNow: CloudSyncPullAllNowFn;
  start: () => void;
  dispose: () => void;
};

export type CloudSyncPollingTransitionFn = (reason: string, opts?: { publish?: boolean }) => void;

export type CloudSyncLifecycleMutableState = {
  listenerCleanup: Array<() => void>;
  pollTimerRef: { current: IntervalHandleLike | null };
  startedRef: { v: boolean };
  disposedRef: { v: boolean };
  pollIntervalMs: number;
};

export function createCloudSyncLifecycleMutableState(cfg: SupabaseCfg): CloudSyncLifecycleMutableState {
  return {
    listenerCleanup: [],
    pollTimerRef: { current: null },
    startedRef: { v: false },
    disposedRef: { v: false },
    pollIntervalMs: Math.max(1500, Number(cfg.pollMs) || 2500),
  };
}
