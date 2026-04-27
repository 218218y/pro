// Cloud Sync lifecycle browser/attention facade.
//
// Keeps the lifecycle owner focused on orchestration while the dedicated
// attention and diagnostics owners hold the browser binding behavior.

export type {
  CloudSyncListenerTargetLike,
  CloudSyncAddListenerLike,
  CloudSyncDiagStorageListenerArgs,
  CloudSyncAttentionPullArgs,
} from './cloud_sync_lifecycle_attention_shared.js';
export { bindCloudSyncDiagStorageListener } from './cloud_sync_lifecycle_attention_diag.js';
export { bindCloudSyncAttentionPulls } from './cloud_sync_lifecycle_attention_pulls.js';
