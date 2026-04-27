import type { CloudSyncRuntimeStatus, CloudSyncStateRow } from '../../../types';

import type {
  CloudSyncRealtimeHintSender,
  CloudSyncRealtimeScopedHandlerScope,
} from './cloud_sync_pull_scopes.js';
import { markCloudSyncPushActivity } from './cloud_sync_operation_status.js';
import {
  readCloudSyncRow,
  readCloudSyncRowWithPullActivity,
  type CloudSyncRemoteRowReaderArgs,
} from './cloud_sync_remote_read_support.js';

export type CloudSyncSettledRowReader = CloudSyncRemoteRowReaderArgs;

function hasCloudSyncSettledUpdatedAt(row: CloudSyncStateRow | null | undefined): row is CloudSyncStateRow {
  return !!row && typeof row.updated_at === 'string' && !!row.updated_at;
}

export function publishCloudSyncWriteActivity(args: {
  runtimeStatus?: CloudSyncRuntimeStatus | null;
  publishStatus?: (() => void) | null;
  emitRealtimeHint?: CloudSyncRealtimeHintSender | null;
  hintScope?: CloudSyncRealtimeScopedHandlerScope | null;
  rowName?: string | null;
}): void {
  const { runtimeStatus, publishStatus, emitRealtimeHint, hintScope, rowName } = args;
  if (emitRealtimeHint && hintScope)
    emitRealtimeHint(hintScope, typeof rowName === 'string' ? rowName : undefined);
  markCloudSyncPushActivity(runtimeStatus, publishStatus);
}

export async function resolveCloudSyncSettledRowAfterWrite(args: {
  returnedRow?: CloudSyncStateRow | null;
  reader: CloudSyncSettledRowReader;
  runtimeStatus?: CloudSyncRuntimeStatus | null;
  publishStatus?: (() => void) | null;
  onSettledUpdatedAt?: ((value: string) => void) | null;
  countSettleReadAsPull?: boolean;
}): Promise<CloudSyncStateRow | null> {
  const { returnedRow, reader, runtimeStatus, publishStatus, onSettledUpdatedAt, countSettleReadAsPull } =
    args;
  let settledRow = hasCloudSyncSettledUpdatedAt(returnedRow) ? returnedRow : null;
  if (!settledRow) {
    const fetchedRow = countSettleReadAsPull
      ? await readCloudSyncRowWithPullActivity({
          ...reader,
          runtimeStatus,
          publishStatus,
        })
      : await readCloudSyncRow(reader);
    settledRow = hasCloudSyncSettledUpdatedAt(fetchedRow) ? fetchedRow : null;
  }
  if (settledRow?.updated_at) onSettledUpdatedAt?.(settledRow.updated_at);
  return settledRow;
}
