export {
  isMutablePollingBranch,
  syncCloudSyncPollingStatusInPlace,
  hasCanonicalPollingStatus,
  clearCloudSyncPollingTimer,
  type CloudSyncLifecyclePollingStatusArgs,
  type CloudSyncLifecyclePollingControlArgs,
} from './cloud_sync_lifecycle_support_polling_shared.js';

export {
  stopCloudSyncPolling,
  startCloudSyncPolling,
  markCloudSyncRealtimeEvent,
} from './cloud_sync_lifecycle_support_polling_runtime.js';
