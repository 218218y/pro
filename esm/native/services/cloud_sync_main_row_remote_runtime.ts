import {
  type CloudSyncMainRowRemoteOps,
  type CreateCloudSyncMainRowRemoteOpsArgs,
} from './cloud_sync_main_row_remote_shared.js';
import { createCloudSyncMainRowPullOnce } from './cloud_sync_main_row_remote_pull.js';
import { createCloudSyncMainRowPushNow } from './cloud_sync_main_row_remote_push.js';

export function createCloudSyncMainRowRemoteOps(
  args: CreateCloudSyncMainRowRemoteOpsArgs
): CloudSyncMainRowRemoteOps {
  return {
    pushNow: createCloudSyncMainRowPushNow(args),
    pullOnce: createCloudSyncMainRowPullOnce(args),
  };
}
