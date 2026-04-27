import type { CloudSyncDiagFn, CloudSyncRuntimeStatus } from '../../../types';

import {
  clearCloudSyncPollingTimer,
  hasCanonicalPollingStatus,
  syncCloudSyncPollingStatusInPlace,
  type CloudSyncLifecyclePollingControlArgs,
} from './cloud_sync_lifecycle_support_polling_shared.js';

export function stopCloudSyncPolling(
  args: CloudSyncLifecyclePollingControlArgs & { diag: CloudSyncDiagFn }
): void {
  const { runtimeStatus, pollIntervalMs, publishStatus, diag, reason } = args;
  const shouldPublish = args.publish !== false;
  const hadTimer = clearCloudSyncPollingTimer(args);
  if (
    !hadTimer &&
    hasCanonicalPollingStatus({
      runtimeStatus,
      active: false,
      intervalMs: pollIntervalMs,
      reason,
    })
  ) {
    return;
  }
  syncCloudSyncPollingStatusInPlace({
    runtimeStatus,
    active: false,
    intervalMs: pollIntervalMs,
    reason,
  });
  if (shouldPublish) publishStatus();
  if (hadTimer) diag('polling:stop', reason);
}

export function markCloudSyncRealtimeEvent(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  suppressRef: { v: boolean };
  isDisposed: () => boolean;
}): boolean {
  const { runtimeStatus, publishStatus, suppressRef, isDisposed } = args;
  if (isDisposed()) return false;
  runtimeStatus.lastRealtimeEventAt = Date.now();
  publishStatus();
  if (suppressRef.v) return false;
  return true;
}
