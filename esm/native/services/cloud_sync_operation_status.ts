import type { CloudSyncRuntimeStatus } from '../../../types';

type CloudSyncStatusPublisher = (() => void) | null | undefined;

type CloudSyncRuntimeStatusLike = CloudSyncRuntimeStatus | null | undefined;

function publishCloudSyncOperationStatus(
  runtimeStatus: CloudSyncRuntimeStatusLike,
  publishStatus: CloudSyncStatusPublisher,
  field: 'lastPullAt' | 'lastPushAt'
): void {
  if (!runtimeStatus) return;
  runtimeStatus[field] = Date.now();
  publishStatus?.();
}

export function markCloudSyncPullActivity(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  publishCloudSyncOperationStatus(runtimeStatus, publishStatus, 'lastPullAt');
}

export function markCloudSyncPushActivity(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  publishCloudSyncOperationStatus(runtimeStatus, publishStatus, 'lastPushAt');
}
