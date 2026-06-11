export {
  SITE2_TABS_ROOM_SUFFIX,
  SITE2_TABS_LOCAL_OPEN_KEY,
  SITE2_TABS_LOCAL_UNTIL_KEY,
  SITE2_TABS_TTL_MS,
  resolveCloudSyncTabsGateBaseRoom,
  isCloudSyncTabsGateController,
  type CloudSyncTabsGateStorageLike,
  type CloudSyncTabsGateConfig,
  type CloudSyncTabsGateTimeoutApi,
} from './cloud_sync_tabs_gate_shared.js';
export { type CloudSyncTabsGateLocalState } from './cloud_sync_tabs_gate_local_shared.js';
export { createCloudSyncTabsGateLocalState } from './cloud_sync_tabs_gate_local_runtime.js';
