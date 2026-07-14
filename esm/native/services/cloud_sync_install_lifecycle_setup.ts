import type { AppContainer, CloudSyncDiagFn, TimeoutHandleLike } from '../../../types';

import { type CloudSyncMaybeAsyncPull } from './cloud_sync_async_pull.js';
import { addCloudSyncCleanup } from './cloud_sync_owner_support.js';
import { createCloudSyncPullCoalescerFactory } from './cloud_sync_install_support.js';
import {
  cancelCloudSyncPullScopeMap,
  createCloudSyncInstallPullRunnerMap,
  createCloudSyncPullCoalescerMap,
} from './cloud_sync_pull_scopes.js';

export function installCloudSyncLifecycleCollectionsSubscription(args: {
  suppressRef: { v: boolean };
  schedulePush: () => void;
  subscribeCollections: (listener: () => void) => () => void;
  cleanup: Array<() => void>;
}): void {
  const unsubscribe = args.subscribeCollections(() => {
    if (!args.suppressRef.v) args.schedulePush();
  });
  addCloudSyncCleanup(args.cleanup, unsubscribe);
}

export function createCloudSyncInstallPullCoalescers(args: {
  App: AppContainer;
  cleanup: Array<() => void>;
  isDisposed: () => boolean;
  isSuppressed: () => boolean;
  isMainPushInFlight: () => boolean;
  subscribeMainPushSettled: (listener: () => void) => () => void;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | null | undefined) => void;
  diag: CloudSyncDiagFn;
  pullSketchOnce: CloudSyncMaybeAsyncPull;
  pullTabsGateOnce: CloudSyncMaybeAsyncPull;
  pullFloatingSketchSyncPinnedOnce: CloudSyncMaybeAsyncPull;
}) {
  const {
    App,
    cleanup,
    isDisposed,
    isSuppressed,
    isMainPushInFlight,
    subscribeMainPushSettled,
    setTimeoutFn,
    clearTimeoutFn,
    diag,
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
  } = args;

  const createPullCoalescer = createCloudSyncPullCoalescerFactory({
    App,
    isDisposed,
    isSuppressed,
    isMainPushInFlight,
    subscribeMainPushSettled,
    setTimeoutFn,
    clearTimeoutFn,
    diag,
  });

  const pullRunners = createCloudSyncInstallPullRunnerMap({
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
  });

  const pullCoalescers = createCloudSyncPullCoalescerMap({
    pullRunners,
    createPullCoalescer,
  });

  addCloudSyncCleanup(cleanup, () => {
    cancelCloudSyncPullScopeMap(pullCoalescers);
  });

  return pullCoalescers;
}
