import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn } from './cloud_sync_owner_context.js';
import type {
  CloudSyncHintSender,
  CloudSyncMainRowLocalState,
  CloudSyncMainRowStateAccess,
} from './cloud_sync_main_row_local.js';
import type { WriteCloudSyncMainRowPayloadResult } from './cloud_sync_main_row_write_support.js';

export type CreateCloudSyncMainRowRemoteOpsArgs = {
  App: AppContainer;
  cfg: SupabaseCfg;
  restUrl: string;
  room: string;
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  suppressRef: { v: boolean };
  getSendRealtimeHint: () => CloudSyncHintSender;
  localState: CloudSyncMainRowLocalState;
  state: CloudSyncMainRowStateAccess & {
    runMainWriteFlight: <T>(key: string, run: () => Promise<T>, onBusy: () => T | Promise<T>) => Promise<T>;
  };
  schedulePullSoon: (opts?: { immediate?: boolean; delayMs?: number; reason?: string }) => void;
};

export type CloudSyncMainRowRemoteOps = {
  pushNow: () => Promise<void>;
  pullOnce: (isInitial: boolean) => Promise<void>;
};

export function shouldSkipCloudSyncMainRowPush(args: {
  suppressRef: { v: boolean };
  nextHash: string;
  getLastHash: () => string;
}): boolean {
  return args.suppressRef.v || args.nextHash === args.getLastHash();
}

export function settleCloudSyncMainRowWrite(args: {
  writeResult: WriteCloudSyncMainRowPayloadResult;
  localState: CloudSyncMainRowLocalState;
  state: CloudSyncMainRowStateAccess;
  nextHash: string;
  schedulePullSoon: (opts?: { immediate?: boolean; delayMs?: number; reason?: string }) => void;
}): void {
  const { writeResult, localState, state, nextHash, schedulePullSoon } = args;
  const settledHash = localState.computeAppliedPayloadHash(writeResult.payload);
  if (settledHash !== nextHash) localState.applyRemotePayload(writeResult.payload);
  else state.setLastHash(settledHash);
  if (!writeResult.settled) schedulePullSoon({ reason: 'push-settle' });
}
