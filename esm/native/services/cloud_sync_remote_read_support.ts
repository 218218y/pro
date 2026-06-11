import type { CloudSyncRuntimeStatus, CloudSyncStateRow } from '../../../types';

import type { CloudSyncGetRowFn } from './cloud_sync_owner_context.js';
import { markCloudSyncPullActivity } from './cloud_sync_operation_status.js';

export type CloudSyncRemoteRowReaderArgs = {
  restUrl: string;
  anonKey: string;
  room: string;
  getRow: CloudSyncGetRowFn;
  runtimeStatus?: CloudSyncRuntimeStatus | null;
  publishStatus?: (() => void) | null;
};

export async function readCloudSyncRow(
  args: CloudSyncRemoteRowReaderArgs
): Promise<CloudSyncStateRow | null> {
  return await args.getRow(args.restUrl, args.anonKey, args.room);
}

export async function readCloudSyncRowWithPullActivity(
  args: CloudSyncRemoteRowReaderArgs
): Promise<CloudSyncStateRow | null> {
  const row = await readCloudSyncRow(args);
  markCloudSyncPullActivity(args.runtimeStatus, args.publishStatus);
  return row;
}
