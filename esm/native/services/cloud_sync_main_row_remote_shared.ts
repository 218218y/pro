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
  gatewayUrl: string;
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
  schedulePushSoon: () => void;
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

export async function settleCloudSyncMainRowWrite(args: {
  writeResult: WriteCloudSyncMainRowPayloadResult;
  localState: CloudSyncMainRowLocalState;
  state: CloudSyncMainRowStateAccess;
  nextHash: string;
  expectedLocalRevision: number;
  schedulePullSoon: (opts?: { immediate?: boolean; delayMs?: number; reason?: string }) => void;
  schedulePushSoon: () => void;
}): Promise<void> {
  const {
    writeResult,
    localState,
    state,
    nextHash,
    expectedLocalRevision,
    schedulePullSoon,
    schedulePushSoon,
  } = args;
  const settledHash = localState.computeAppliedPayloadHash(writeResult.payload);
  if (settledHash !== nextHash) {
    const adoption = await localState.applyRemotePayload(writeResult.payload, expectedLocalRevision);
    if (adoption.ok === false) {
      if (adoption.reason === 'revision-mismatch') schedulePushSoon();
      else schedulePullSoon({ reason: 'push-local-commit-recovery' });
      return;
    }
  } else state.setLastHash(settledHash);
  if (writeResult.row?.updated_at) state.setLastSeenUpdatedAt(writeResult.row.updated_at);
  if (!writeResult.settled) schedulePullSoon({ reason: 'push-settle' });
}
