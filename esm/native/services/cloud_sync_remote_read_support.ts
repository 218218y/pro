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
  runtimeStatus?: CloudSyncRuntimeStatus | null;
  publishStatus?: (() => void) | null;
};

export async function readCloudSyncRow(args: CloudSyncRemoteRowReaderArgs): Promise<CloudSyncReadResult> {
  return await args.getRow(args.gatewayUrl, args.anonKey, args.room);
}

export async function readCloudSyncRowWithPullActivity(
  args: CloudSyncRemoteRowReaderArgs
): Promise<CloudSyncReadResult> {
  markCloudSyncPullAttempt(args.runtimeStatus, args.publishStatus);
  const conflict = args.runtimeStatus?.conflict;
  if (
    conflict?.room === args.room &&
    (conflict.state === 'awaiting-resolution' || conflict.state === 'resolving')
  ) {
    markCloudSyncPullFailure(args.runtimeStatus, args.publishStatus);
    return {
      ok: false,
      failure: { kind: 'server', status: 409, code: 'unresolved_conflict' },
    };
  }
  try {
    const result = await readCloudSyncRow(args);
    if (result.ok) markCloudSyncPullSuccess(args.runtimeStatus, args.publishStatus);
    else markCloudSyncPullFailure(args.runtimeStatus, args.publishStatus);
    return result;
  } catch (error) {
    markCloudSyncPullFailure(args.runtimeStatus, args.publishStatus);
    throw error;
  }
}
