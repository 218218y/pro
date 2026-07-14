import type { CloudSyncRuntimeStatus } from '../../../types';

type CloudSyncStatusPublisher = (() => void) | null | undefined;

type CloudSyncRuntimeStatusLike = CloudSyncRuntimeStatus | null | undefined;

function publishCloudSyncOperationStatus(
  runtimeStatus: CloudSyncRuntimeStatusLike,
  publishStatus: CloudSyncStatusPublisher,
  field: 'lastPullAttemptAt' | 'lastPullSuccessAt' | 'lastPullFailureAt' | 'lastPushAt'
): void {
  if (!runtimeStatus) return;
  runtimeStatus[field] = Date.now();
  publishStatus?.();
}

export function markCloudSyncPullActivity(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  markCloudSyncPullSuccess(runtimeStatus, publishStatus);
}

export function markCloudSyncPullAttempt(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  publishCloudSyncOperationStatus(runtimeStatus, publishStatus, 'lastPullAttemptAt');
}

export function markCloudSyncPullSuccess(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  if (!runtimeStatus) return;
  const now = Date.now();
  runtimeStatus.lastPullSuccessAt = now;
  publishStatus?.();
}

export function markCloudSyncPullFailure(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  publishCloudSyncOperationStatus(runtimeStatus, publishStatus, 'lastPullFailureAt');
}

export function markCloudSyncPushActivity(
  runtimeStatus?: CloudSyncRuntimeStatusLike,
  publishStatus?: CloudSyncStatusPublisher
): void {
  publishCloudSyncOperationStatus(runtimeStatus, publishStatus, 'lastPushAt');
}
