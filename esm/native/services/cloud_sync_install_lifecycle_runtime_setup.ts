import { toCloudSyncAsyncPull, type CloudSyncAsyncPull } from './cloud_sync_async_pull.js';
import { createCloudSyncLifecycleOps } from './cloud_sync_lifecycle.js';
import { addCloudSyncCleanup } from './cloud_sync_owner_support.js';
import {
  createCloudSyncInstallLiveness,
  createCloudSyncLifecycleHintSetter,
  createCloudSyncLifecycleStatusPublisher,
  type CloudSyncInstallLifecycleArgs,
  type CloudSyncInstallLiveness,
} from './cloud_sync_install_lifecycle_shared.js';
import {
  createCloudSyncInstallPullCoalescers,
  installCloudSyncLifecycleCollectionsSubscription,
} from './cloud_sync_install_lifecycle_setup.js';
import { createCloudSyncRateLimitRecovery } from './cloud_sync_rate_limit_recovery.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

export type PreparedCloudSyncInstallLifecycle = {
  liveness: CloudSyncInstallLiveness;
  pullMainOnce: CloudSyncAsyncPull;
  pullSketchOnce: CloudSyncAsyncPull;
  pullTabsGateOnce: CloudSyncAsyncPull;
  pullFloatingSketchSyncPinnedOnce: CloudSyncAsyncPull;
  createLifecycleOps: () => ReturnType<typeof createCloudSyncLifecycleOps>;
};

export function prepareCloudSyncInstallLifecycle(
  args: CloudSyncInstallLifecycleArgs
): PreparedCloudSyncInstallLifecycle {
  const { App, ownerContext, runtime, cleanup, suppressRef, disposedRef, setSendRealtimeHint } = args;
  const {
    cfg,
    room,
    clientId,
    runtimeStatus,
    diagStorageKey,
    updateDiagEnabled,
    publishStatus,
    subscribeRuntimeStatus,
    diag,
    setTimeoutFn,
    clearTimeoutFn,
    setIntervalFn,
    clearIntervalFn,
  } = ownerContext;
  const { cloudSyncTabsGate, cloudSyncSketch, cloudSyncMainRow } = runtime;
  const pullTabsGateOnce = toCloudSyncAsyncPull(cloudSyncTabsGate.pullTabsGateOnce);
  const pullSketchOnce = toCloudSyncAsyncPull(cloudSyncSketch.pullSketchOnce);
  const pullFloatingSketchSyncPinnedOnce = toCloudSyncAsyncPull(
    cloudSyncSketch.pullFloatingSketchSyncPinnedOnce
  );

  const liveness = createCloudSyncInstallLiveness({
    App,
    ownerContext,
    disposedRef,
  });

  installCloudSyncLifecycleCollectionsSubscription({
    suppressRef,
    schedulePush: cloudSyncMainRow.schedulePush,
    subscribeCollections: cloudSyncMainRow.subscribeCollections,
    cleanup,
  });

  addCloudSyncCleanup(cleanup, () => {
    cloudSyncMainRow.dispose();
  });

  const pullCoalescers = createCloudSyncInstallPullCoalescers({
    App,
    cleanup,
    isDisposed: liveness.isOwnerDisposedOrStale,
    isSuppressed: () => suppressRef.v,
    isMainPushInFlight: () => cloudSyncMainRow.isPushInFlight(),
    subscribeMainPushSettled: listener => cloudSyncMainRow.subscribePushSettled(listener),
    setTimeoutFn,
    clearTimeoutFn,
    diag,
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
  });

  return {
    liveness,
    pullMainOnce: toCloudSyncAsyncPull(cloudSyncMainRow.pullOnce),
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
    createLifecycleOps: () => {
      const lifecycleOps = createCloudSyncLifecycleOps({
        App,
        cfg,
        room,
        clientId,
        runtimeStatus,
        diagStorageKey,
        publishStatus: createCloudSyncLifecycleStatusPublisher({
          liveness,
          publishStatus,
        }),
        updateDiagEnabled,
        diag,
        suppressRef,
        isDisposed: liveness.isOwnerDisposedOrStale,
        mainPullTrigger: {
          trigger: (reason, immediate) => {
            if (!liveness.isInstallLive()) return;
            cloudSyncMainRow.schedulePullSoon({ reason, immediate: !!immediate });
          },
        },
        pullCoalescers,
        setTimeoutFn,
        clearTimeoutFn,
        setIntervalFn,
        clearIntervalFn,
        setSendRealtimeHint: createCloudSyncLifecycleHintSetter({
          liveness,
          disposedRef,
          setSendRealtimeHint,
        }),
      });
      const rateLimitRecovery = createCloudSyncRateLimitRecovery({
        runtimeStatus,
        subscribeRuntimeStatus,
        setTimeoutFn,
        clearTimeoutFn,
        isLive: liveness.isInstallLive,
        pushMainNow: cloudSyncMainRow.pushNow,
        pullAllNow: lifecycleOps.pullAllNow,
        reportFailure: error => {
          _cloudSyncReportNonFatal(App, 'cloudSync.rateLimitRecovery', error, { throttleMs: 8000 });
        },
      });
      addCloudSyncCleanup(cleanup, rateLimitRecovery.dispose);
      return lifecycleOps;
    },
  };
}
