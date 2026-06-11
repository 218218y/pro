import type { CloudSyncRuntimeStatus } from '../../../types';

import type { InstallableCloudSyncRuntimeStatus } from './cloud_sync_status_install_shared.js';

import {
  asRuntimeStatusBranch,
  CLOUD_SYNC_STATUS_ACTIVE_KEY,
  CLOUD_SYNC_STATUS_INSTALLED_KEY,
  cloneCanonicalCloudSyncRuntimeStatus,
  defineStatusMeta,
  syncBranchInPlace,
} from './cloud_sync_status_install_shared.js';

function syncRuntimeStatusBranch<TBranch>(currentBranch: TBranch, sourceBranch: TBranch): TBranch {
  const targetBranch = asRuntimeStatusBranch(currentBranch);
  const nextSourceBranch = asRuntimeStatusBranch(sourceBranch);
  if (!targetBranch || !nextSourceBranch) return sourceBranch;
  syncBranchInPlace(targetBranch, nextSourceBranch);
  return currentBranch;
}

function syncRuntimeStatusScalars(
  target: InstallableCloudSyncRuntimeStatus,
  source: CloudSyncRuntimeStatus
): void {
  for (const key of Object.keys(target)) {
    if (
      key === 'realtime' ||
      key === 'polling' ||
      key === CLOUD_SYNC_STATUS_INSTALLED_KEY ||
      key === CLOUD_SYNC_STATUS_ACTIVE_KEY
    ) {
      continue;
    }
    if (!(key in source)) delete target[key];
  }

  for (const key of Object.keys(source)) {
    if (key === 'realtime' || key === 'polling') continue;
    target[key] = source[key];
  }
}

export function syncRuntimeStatusInPlace(
  target: InstallableCloudSyncRuntimeStatus,
  source: CloudSyncRuntimeStatus
): InstallableCloudSyncRuntimeStatus {
  const canonicalSource = cloneCanonicalCloudSyncRuntimeStatus(source);

  target.realtime = syncRuntimeStatusBranch(target.realtime, canonicalSource.realtime);
  target.polling = syncRuntimeStatusBranch(target.polling, canonicalSource.polling);
  syncRuntimeStatusScalars(target, canonicalSource);

  defineStatusMeta(target, CLOUD_SYNC_STATUS_INSTALLED_KEY, true);
  defineStatusMeta(target, CLOUD_SYNC_STATUS_ACTIVE_KEY, true);
  return target;
}
