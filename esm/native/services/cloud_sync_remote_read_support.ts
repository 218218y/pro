import type { CloudSyncReadResult, CloudSyncRuntimeStatus } from '../../../types';

import type { CloudSyncGetRowFn } from './cloud_sync_owner_context.js';
import { markCloudSyncPullActivity } from './cloud_sync_operation_status.js';

export type CloudSyncRemoteRowReaderArgs = {
  gatewayUrl: string;
  anonKey: string;
  room: string;
  getRow: CloudSyncGetRowFn;
  runtimeStatus?: CloudSyncRuntimeStatus | null;
  publishStatus?: (() => void) | null;
};

export async function readCloudSyncRow(args: CloudSyncRemoteRowReaderArgs): Promise<CloudSyncReadResult> {
  return await args.getRow(args.gatewayUrl, args.anonKey, args.room);
}

export async function readCloudSyncRowWithPullActivity(
  args: CloudSyncRemoteRowReaderArgs
): Promise<CloudSyncReadResult> {
  const result = await readCloudSyncRow(args);
  markCloudSyncPullActivity(args.runtimeStatus, args.publishStatus);
  return result;
}
