import type { CloudSyncReadResult, CloudSyncRuntimeStatus } from '../../../types';

import type { CloudSyncGetRowFn } from './cloud_sync_owner_context.js';
import {
  markCloudSyncPullAttempt,
  markCloudSyncPullFailure,
  markCloudSyncPullSuccess,
} from './cloud_sync_operation_status.js';

export type CloudSyncRemoteRowReaderArgs = {
  gatewayUrl: string;
  anonKey: string;
  room: string;
  getRow: CloudSyncGetRowFn;
  runtimeStatus?: CloudSyncRuntimeStatus | null | undefined;
  publishStatus?: (() => void) | null | undefined;
};

export async function readCloudSyncRow(args: CloudSyncRemoteRowReaderArgs): Promise<CloudSyncReadResult> {
  return await args.getRow(args.gatewayUrl, args.anonKey, args.room);
}

export async function readCloudSyncRowWithPullActivity(
  args: CloudSyncRemoteRowReaderArgs
): Promise<CloudSyncReadResult> {
  markCloudSyncPullAttempt(args.runtimeStatus, args.publishStatus);
  try {
    // The gateway owner performs the canonical conflict-store preflight. Calling it even
    // while the published status is blocked lets a live tab observe another tab's resolution.
    const result = await readCloudSyncRow(args);
    if (result.ok) markCloudSyncPullSuccess(args.runtimeStatus, args.publishStatus);
    else markCloudSyncPullFailure(args.runtimeStatus, args.publishStatus);
    return result;
  } catch (error) {
    markCloudSyncPullFailure(args.runtimeStatus, args.publishStatus);
    throw error;
  }
}
