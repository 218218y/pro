import type { AppContainer } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  triggerCloudSyncPullAllScopes,
  type CloudSyncMainPullTriggerLike,
  type CloudSyncPullScopeMap,
  type CloudSyncPullTriggerLike,
} from './cloud_sync_pull_scopes.js';

export type CloudSyncListenerTargetLike = {
  addEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
  removeEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
};

export type CloudSyncPullTriggerMap = CloudSyncPullScopeMap<CloudSyncPullTriggerLike>;

export type CloudSyncPullAllNowOptions = {
  includeControls?: boolean;
  reason?: string;
  minRecentPullGapMs?: number;
};

export type CloudSyncPullAllNowFn = (opts?: CloudSyncPullAllNowOptions) => void;

export function addCloudSyncLifecycleListener(args: {
  App: AppContainer;
  listenerCleanup: Array<() => void>;
  target: CloudSyncListenerTargetLike | null;
  type: string;
  handler: (ev: unknown) => void;
}): void {
  const { App, listenerCleanup, target, type, handler } = args;
  if (!target) return;
  const add = target.addEventListener;
  const remove = target.removeEventListener;
  if (typeof add !== 'function') return;
  try {
    add.call(target, type, handler);
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'cloudSyncLifecycle.addListener.bind', err, { throttleMs: 4000 });
    return;
  }
  listenerCleanup.push(() => {
    try {
      if (typeof remove === 'function') remove.call(target, type, handler);
    } catch (err) {
      _cloudSyncReportNonFatal(App, 'cloudSyncLifecycle.addListener.unbind', err, { throttleMs: 4000 });
    }
  });
}

export function normalizeCloudSyncPullAllNowOptions(
  opts?: CloudSyncPullAllNowOptions
): Required<CloudSyncPullAllNowOptions> {
  return {
    includeControls: !(opts && opts.includeControls === false),
    reason: String((opts && opts.reason) || 'pullAllNow'),
    minRecentPullGapMs: Math.max(0, Number(opts?.minRecentPullGapMs) || 0),
  };
}

export function runCloudSyncPullAllNow(args: {
  suppressRef: { v: boolean };
  mainPullTrigger: CloudSyncMainPullTriggerLike;
  pullCoalescers: CloudSyncPullTriggerMap;
  opts?: CloudSyncPullAllNowOptions;
}): void {
  const { suppressRef, mainPullTrigger, pullCoalescers, opts } = args;

  if (suppressRef.v) return;

  const normalized = normalizeCloudSyncPullAllNowOptions(opts);

  triggerCloudSyncPullAllScopes({
    mainTrigger: mainPullTrigger,
    pullTriggers: pullCoalescers,
    includeControls: normalized.includeControls,
    reason: normalized.reason,
    immediateMain: true,
  });
}
