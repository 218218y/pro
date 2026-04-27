import type { CloudSyncRuntimeStatus } from '../../../types';

import { cloneRuntimeStatus } from './cloud_sync_support_shared.js';
import {
  asCloudSyncPublicRecord,
  getUnavailableCloudSyncRuntimeStatus,
} from './cloud_sync_panel_api_public_support_shared.js';

export function cloneCloudSyncPublicRuntimeStatus(status: unknown): CloudSyncRuntimeStatus {
  const rec = asCloudSyncPublicRecord(status);
  return cloneRuntimeStatus((rec as CloudSyncRuntimeStatus | null) || getUnavailableCloudSyncRuntimeStatus());
}
