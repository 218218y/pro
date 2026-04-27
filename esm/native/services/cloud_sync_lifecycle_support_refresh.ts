import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import {
  readCloudSyncLifecycleRefreshBlockReason,
  type CloudSyncLifecycleRefreshBlockReason,
} from './cloud_sync_lifecycle_activity.js';
import {
  normalizeCloudSyncPullAllNowOptions,
  type CloudSyncPullAllNowFn,
  type CloudSyncPullAllNowOptions,
} from './cloud_sync_lifecycle_support_bindings.js';
import { hasCloudSyncLifecycleRecentPull } from './cloud_sync_lifecycle_refresh_cooldown.js';

export type CloudSyncLifecycleRefreshPolicy = {
  allowWhenRealtime?: boolean;
  allowWhenOffline?: boolean;
  allowWhenHidden?: boolean;
};

export type CloudSyncLifecycleRefreshRequestResult = {
  accepted: boolean;
  blockedBy: CloudSyncLifecycleRefreshBlockReason | 'suppressed' | 'recent-pull' | null;
};

export type CloudSyncLifecycleRefreshRequestArgs = {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  suppressRef: { v: boolean };
  pullAllNow: CloudSyncPullAllNowFn;
  opts?: CloudSyncPullAllNowOptions;
  policy?: CloudSyncLifecycleRefreshPolicy;
};

export function requestCloudSyncLifecycleRefresh(
  args: CloudSyncLifecycleRefreshRequestArgs
): CloudSyncLifecycleRefreshRequestResult {
  const { App, runtimeStatus, suppressRef, pullAllNow, opts, policy } = args;
  if (suppressRef.v) return { accepted: false, blockedBy: 'suppressed' };

  const blockedBy = readCloudSyncLifecycleRefreshBlockReason({
    App,
    runtimeStatus,
    allowWhenRealtime: !!policy?.allowWhenRealtime,
    allowWhenOffline: !!policy?.allowWhenOffline,
    allowWhenHidden: !!policy?.allowWhenHidden,
  });
  if (blockedBy) return { accepted: false, blockedBy };

  const normalized = normalizeCloudSyncPullAllNowOptions(opts);
  if (
    normalized.minRecentPullGapMs > 0 &&
    hasCloudSyncLifecycleRecentPull({
      runtimeStatus,
      minGapMs: normalized.minRecentPullGapMs,
    })
  ) {
    return { accepted: false, blockedBy: 'recent-pull' };
  }

  pullAllNow(normalized);
  return { accepted: true, blockedBy: null };
}
