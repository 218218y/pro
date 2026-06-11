import type { CloudSyncRuntimeStatus } from '../../../types';

import type { InstallableCloudSyncRuntimeStatus } from './cloud_sync_status_install_shared.js';

import {
  asInstallableCloudSyncRuntimeStatus,
  defineStatusMeta,
  getFallbackRuntimeStatus,
  CLOUD_SYNC_STATUS_ACTIVE_KEY,
} from './cloud_sync_status_install_shared.js';
import { isCloudSyncStatusSurfaceFresh } from './cloud_sync_status_install_freshness_runtime.js';
import { syncRuntimeStatusInPlace } from './cloud_sync_status_install_sync_runtime.js';

export { isCloudSyncStatusSurfaceFresh } from './cloud_sync_status_install_freshness_runtime.js';

export function deactivateCloudSyncStatusSurface(current: unknown): void {
  const status = asInstallableCloudSyncRuntimeStatus(current);
  if (!status) return;
  syncRuntimeStatusInPlace(status, getFallbackRuntimeStatus());
  defineStatusMeta(status as Record<string, unknown>, CLOUD_SYNC_STATUS_ACTIVE_KEY, false);
}

export function installCloudSyncStatusSurface(
  current: unknown,
  source: CloudSyncRuntimeStatus
): InstallableCloudSyncRuntimeStatus {
  const status = asInstallableCloudSyncRuntimeStatus(current) || ({} as InstallableCloudSyncRuntimeStatus);
  if (isCloudSyncStatusSurfaceFresh(status, source)) return status;
  return syncRuntimeStatusInPlace(status, source);
}
