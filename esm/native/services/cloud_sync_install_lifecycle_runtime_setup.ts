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
  installCloudSyncLifecycleStorageWrap,
} from './cloud_sync_install_lifecycle_setup.js';

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
    storage,
    keyModels,
    keyColors,
    keyColorOrder,
    keyPresetOrder,
    keyHiddenPresets,
    room,
    clientId,
    runtimeStatus,
    diagStorageKey,
    updateDiagEnabled,
    publishStatus,
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

  installCloudSyncLifecycleStorageWrap({
    App,
    storage,
    keysToSync: [keyModels, keyColors, keyColorOrder, keyPresetOrder, keyHiddenPresets],
    suppressRef,
    schedulePush: () => {
      cloudSyncMainRow.schedulePush();
    },
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
    createLifecycleOps: () =>
      createCloudSyncLifecycleOps({
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
      }),
  };
}
