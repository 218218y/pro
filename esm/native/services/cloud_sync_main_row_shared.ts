import type {
  AppContainer,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
  TimeoutHandleLike,
} from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn, StorageLike } from './cloud_sync_owner_context.js';
import type { CloudSyncMainRowLocalState } from './cloud_sync_main_row_local.js';
import type { CloudSyncMainRowRemoteOps } from './cloud_sync_main_row_remote.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import { createCloudSyncMainWriteSingleFlight } from './cloud_sync_main_write_singleflight.js';

export type CreateCloudSyncMainRowOpsArgs = {
  App: AppContainer;
  cfg: SupabaseCfg;
  restUrl: string;
  room: string;
  storage: StorageLike;
  keyModels: string;
  keyColors: string;
  keyColorOrder: string;
  keyPresetOrder: string;
  keyHiddenPresets: string;
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag?: CloudSyncDiagFn;
  suppressRef: { v: boolean };
  getSendRealtimeHint: () => CloudSyncRealtimeHintSender | null;
};

export type CloudSyncMainRowOps = {
  schedulePullSoon: (opts?: { immediate?: boolean; delayMs?: number; reason?: string }) => void;
  schedulePush: () => void;
  pushNow: () => Promise<void>;
  pullOnce: (isInitial: boolean) => Promise<void>;
  subscribePushSettled: (listener: () => void) => () => void;
  clearPendingPush: () => void;
  isPushInFlight: () => boolean;
  runMainWriteFlight: <T>(key: string, run: () => Promise<T>, onBusy: () => T | Promise<T>) => Promise<T>;
  setLastSeenUpdatedAt: (value: string) => void;
  setLastHash: (value: string) => void;
  dispose: () => void;
};

export type PullFollowUpBlocker = 'push' | 'pull';
export type PendingPullDelaysByBlocker = Record<PullFollowUpBlocker, number | null>;
export type MainRowPullRequestOptions = { immediate?: boolean; delayMs?: number; reason?: string };

export type CloudSyncMainRowMutableState = {
  getLastHash: () => string;
  setLastHash: (value: string) => void;
  getLastSeenUpdatedAt: () => string;
  setLastSeenUpdatedAt: (value: string) => void;
  isPushInFlight: () => boolean;
  runMainWriteFlight: <T>(key: string, run: () => Promise<T>, onBusy: () => T | Promise<T>) => Promise<T>;
};

export type CloudSyncMainRowCreateDeps = {
  state: CloudSyncMainRowMutableState;
  localState: CloudSyncMainRowLocalState;
  getRemoteOps: () => CloudSyncMainRowRemoteOps;
};

export const MAIN_ROW_PULL_SCOPE_LABEL = 'main';
export const MAIN_ROW_PULL_DIAG_COOLDOWN_MS = 1500;

export function normalizePullDelayMs(value: number | undefined): number {
  return Math.max(0, Number(value) || 0);
}

export function normalizeMainRowPullRequest(
  opts?: MainRowPullRequestOptions
): Required<MainRowPullRequestOptions> {
  return {
    immediate: !!opts?.immediate,
    delayMs: normalizePullDelayMs(opts?.delayMs),
    reason: String(opts?.reason || MAIN_ROW_PULL_SCOPE_LABEL).trim() || MAIN_ROW_PULL_SCOPE_LABEL,
  };
}

export function createCloudSyncMainRowMutableState(
  args: CreateCloudSyncMainRowOpsArgs
): CloudSyncMainRowMutableState {
  let lastSeenUpdatedAt = '';
  let lastHash = '';
  const mainWriteFlight = createCloudSyncMainWriteSingleFlight(args.App as object);
  return {
    getLastHash: (): string => lastHash,
    setLastHash: (value: string): void => {
      lastHash = String(value || '');
    },
    getLastSeenUpdatedAt: (): string => lastSeenUpdatedAt,
    setLastSeenUpdatedAt: (value: string): void => {
      lastSeenUpdatedAt = String(value || '');
    },
    isPushInFlight: (): boolean => mainWriteFlight.isActive(),
    runMainWriteFlight: <T>(key: string, run: () => Promise<T>, onBusy: () => T | Promise<T>): Promise<T> =>
      mainWriteFlight.run(key, run, onBusy),
  };
}
