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
  reportThrottleMs?: number;
};

function reportCloudSyncLifecycleRefreshError(args: {
  App: AppContainer;
  reportOp: string;
  reportThrottleMs: number;
  err: unknown;
}): void {
  const { App, reportOp, reportThrottleMs, err } = args;
  _cloudSyncReportNonFatal(App, reportOp, err, { throttleMs: reportThrottleMs });
}

function observeCloudSyncLifecycleRefreshPullResult(args: {
  App: AppContainer;
  reportOp: string;
  reportThrottleMs: number;
  pullResult: unknown;
}): void {
  const { App, reportOp, reportThrottleMs, pullResult } = args;
  void Promise.resolve(pullResult).catch(err => {
    reportCloudSyncLifecycleRefreshError({ App, reportOp, reportThrottleMs, err });
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
    reportThrottleMs = 8000,
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
    observeCloudSyncLifecycleRefreshPullResult({ App, reportOp, reportThrottleMs, pullResult });
  } catch (err) {
    reportCloudSyncLifecycleRefreshError({ App, reportOp, reportThrottleMs, err });
    return { accepted: false, blockedBy: 'pull-error' };
  }
  return { accepted: true, blockedBy: null };
}
