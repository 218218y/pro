import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
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
  blockedBy: CloudSyncLifecycleRefreshBlockReason | 'suppressed' | 'recent-pull' | 'pull-error' | null;
};

export type CloudSyncLifecycleRefreshRequestArgs = {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  suppressRef: { v: boolean };
  pullAllNow: CloudSyncPullAllNowFn;
  opts?: CloudSyncPullAllNowOptions;
  policy?: CloudSyncLifecycleRefreshPolicy;
  reportOp?: string;
};

function reportCloudSyncLifecycleRefreshError(args: {
  App: AppContainer;
  reportOp: string;
  error: unknown;
}): void {
  _cloudSyncReportNonFatal(args.App, args.reportOp, args.error, { throttleMs: 8000 });
}

function observeCloudSyncLifecycleRefreshPullResult(args: {
  App: AppContainer;
  reportOp: string;
  pullResult: unknown;
}): void {
  const { App, reportOp, pullResult } = args;
  void Promise.resolve(pullResult).catch(error => {
    reportCloudSyncLifecycleRefreshError({ App, reportOp, error });
  });
}

export function requestCloudSyncLifecycleRefresh(
  args: CloudSyncLifecycleRefreshRequestArgs
): CloudSyncLifecycleRefreshRequestResult {
  const {
    App,
    runtimeStatus,
    suppressRef,
    pullAllNow,
    opts,
    policy,
    reportOp = 'cloudSyncLifecycle.refreshPull',
  } = args;
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

  try {
    const pullResult = pullAllNow(normalized);
    observeCloudSyncLifecycleRefreshPullResult({ App, reportOp, pullResult });
  } catch (error) {
    reportCloudSyncLifecycleRefreshError({ App, reportOp, error });
    return { accepted: false, blockedBy: 'pull-error' };
  }

  return { accepted: true, blockedBy: null };
}
