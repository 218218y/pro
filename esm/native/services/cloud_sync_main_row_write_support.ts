import type { CloudSyncPayload, CloudSyncRuntimeStatus, CloudSyncStateRow } from '../../../types';

import type { SupabaseCfg } from './cloud_sync_config.js';
import type { CloudSyncGetRowFn, CloudSyncUpsertRowFn } from './cloud_sync_owner_context.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import {
  publishCloudSyncWriteActivity,
  resolveCloudSyncSettledRowAfterWrite,
} from './cloud_sync_remote_write_support.js';

export type CloudSyncMainRealtimeHintReader = () => CloudSyncRealtimeHintSender | null;

export type WriteCloudSyncMainRowPayloadArgs = {
  cfg: SupabaseCfg;
  restUrl: string;
  room: string;
  payload: CloudSyncPayload;
  getRow: CloudSyncGetRowFn;
  upsertRow: CloudSyncUpsertRowFn;
  getSendRealtimeHint: CloudSyncMainRealtimeHintReader;
  runtimeStatus?: CloudSyncRuntimeStatus;
  publishStatus?: () => void;
  setLastSeenUpdatedAt?: (value: string) => void;
};

export type WriteCloudSyncMainRowPayloadResult = {
  ok: boolean;
  row: CloudSyncStateRow | null;
  payload: CloudSyncPayload;
  settled: boolean;
};

function readCloudSyncMainRowSettled(args: {
  settledRow?: CloudSyncStateRow | null;
  payload: CloudSyncPayload;
}): { row: CloudSyncStateRow | null; payload: CloudSyncPayload; settled: boolean } {
  const row = args.settledRow && args.settledRow.updated_at ? args.settledRow : null;
  return {
    row,
    payload: row?.payload || args.payload,
    settled: !!row,
  };
}

export async function writeCloudSyncMainRowPayload(
  args: WriteCloudSyncMainRowPayloadArgs
): Promise<WriteCloudSyncMainRowPayloadResult> {
  const res = await args.upsertRow(args.restUrl, args.cfg.anonKey, args.room, args.payload, {
    returnRepresentation: true,
  });
  if (!res.ok) return { ok: false, row: null, payload: args.payload, settled: false };

  publishCloudSyncWriteActivity({
    runtimeStatus: args.runtimeStatus,
    publishStatus: args.publishStatus,
    emitRealtimeHint: args.getSendRealtimeHint(),
    hintScope: 'main',
    rowName: args.room,
  });

  const settledRow = await resolveCloudSyncSettledRowAfterWrite({
    returnedRow: res.row,
    reader: {
      restUrl: args.restUrl,
      anonKey: args.cfg.anonKey,
      room: args.room,
      getRow: args.getRow,
    },
    runtimeStatus: args.runtimeStatus,
    publishStatus: args.publishStatus,
    onSettledUpdatedAt: args.setLastSeenUpdatedAt,
  });
  const settled = readCloudSyncMainRowSettled({ settledRow, payload: args.payload });
  return { ok: true, row: settled.row, payload: settled.payload, settled: settled.settled };
}
