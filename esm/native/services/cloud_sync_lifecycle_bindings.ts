import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';
import {
  addCloudSyncLifecycleListener,
  normalizeCloudSyncPullAllNowOptions,
  runCloudSyncPullAllNow,
  type CloudSyncListenerTargetLike,
  type CloudSyncPullTriggerMap,
  type CloudSyncPullAllNowFn,
  type CloudSyncPullAllNowOptions,
} from './cloud_sync_lifecycle_support_bindings.js';
import { hasCloudSyncLifecycleRecentPull } from './cloud_sync_lifecycle_refresh_cooldown.js';
import type { CloudSyncMainPullTriggerLike } from './cloud_sync_pull_scopes.js';

export function createCloudSyncLifecycleAddListener(args: {
  App: AppContainer;
  listenerCleanup: Array<() => void>;
}): (target: CloudSyncListenerTargetLike | null, type: string, handler: (ev: unknown) => void) => void {
  const { App, listenerCleanup } = args;
  return (target, type, handler): void => {
    addCloudSyncLifecycleListener({
      App,
      listenerCleanup,
      target,
      type,
      handler,
    });
  };
}

export function createCloudSyncLifecyclePullAllNow(args: {
  suppressRef: { v: boolean };
  mainPullTrigger: CloudSyncMainPullTriggerLike;
  pullCoalescers: CloudSyncPullTriggerMap;
  isDisposed: () => boolean;
  disposedRef: { v: boolean };
  runtimeStatus: CloudSyncRuntimeStatus;
}): CloudSyncPullAllNowFn {
  const { suppressRef, mainPullTrigger, pullCoalescers, isDisposed, disposedRef, runtimeStatus } = args;
  return (opts?: CloudSyncPullAllNowOptions): void => {
    if (disposedRef.v || isDisposed()) return;
    const normalized = normalizeCloudSyncPullAllNowOptions(opts);
    if (
      normalized.minRecentPullGapMs > 0 &&
      hasCloudSyncLifecycleRecentPull({
        runtimeStatus,
        minGapMs: normalized.minRecentPullGapMs,
      })
    ) {
      return;
    }
    runCloudSyncPullAllNow({
      suppressRef,
      mainPullTrigger,
      pullCoalescers,
      opts: normalized,
    });
  };
}
