import type { CloudSyncRuntimeStatus } from '../../../types';

import type { InstallableCloudSyncRuntimeStatus } from './cloud_sync_status_install_shared.js';

import {
  asInstallableCloudSyncRuntimeStatus,
  asRuntimeStatusBranch,
  branchesEqual,
  CLOUD_SYNC_STATUS_ACTIVE_KEY,
  CLOUD_SYNC_STATUS_INSTALLED_KEY,
  cloneCanonicalCloudSyncRuntimeStatus,
  hasHiddenStatusMeta,
  readComparableSourceKeys,
  readComparableStatusKeys,
  readStatusMeta,
} from './cloud_sync_status_install_shared.js';

export function isCloudSyncStatusSurfaceFresh(
  current: unknown,
  source: CloudSyncRuntimeStatus
): current is InstallableCloudSyncRuntimeStatus {
  const status = asInstallableCloudSyncRuntimeStatus(current);
  if (
    !status ||
    !readStatusMeta(status, CLOUD_SYNC_STATUS_INSTALLED_KEY) ||
    !readStatusMeta(status, CLOUD_SYNC_STATUS_ACTIVE_KEY) ||
    !hasHiddenStatusMeta(status, CLOUD_SYNC_STATUS_INSTALLED_KEY, true) ||
    !hasHiddenStatusMeta(status, CLOUD_SYNC_STATUS_ACTIVE_KEY, true)
  ) {
    return false;
  }

  const canonicalSource = cloneCanonicalCloudSyncRuntimeStatus(source);
  const realtimeTarget = asRuntimeStatusBranch(status.realtime);
  const pollingTarget = asRuntimeStatusBranch(status.polling);
  const realtimeSource = asRuntimeStatusBranch(canonicalSource.realtime);
  const pollingSource = asRuntimeStatusBranch(canonicalSource.polling);
  if (!realtimeTarget || !pollingTarget || !realtimeSource || !pollingSource) return false;

  const targetKeys = readComparableStatusKeys(status);
  const sourceKeys = readComparableSourceKeys(canonicalSource);
  if (targetKeys.length !== sourceKeys.length) return false;
  for (let index = 0; index < sourceKeys.length; index += 1) {
    if (targetKeys[index] !== sourceKeys[index]) return false;
  }

  const statusRecord: Record<string, unknown> = status;
  const sourceRecord: Record<string, unknown> = canonicalSource;
  for (const key of sourceKeys) {
    if (key === 'realtime' || key === 'polling') continue;
    if (statusRecord[key] !== sourceRecord[key]) {
      return false;
    }
  }

  return branchesEqual(realtimeTarget, realtimeSource) && branchesEqual(pollingTarget, pollingSource);
}
