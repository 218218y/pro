import { addCloudSyncCleanup, runCloudSyncInitialPulls } from './cloud_sync_owner_support.js';
import { type CloudSyncInstallLifecycleArgs } from './cloud_sync_install_lifecycle_shared.js';
import { prepareCloudSyncInstallLifecycle } from './cloud_sync_install_lifecycle_runtime_setup.js';

function scheduleCloudSyncInitialPulls(args: {
  setTimeoutFn: (handler: () => void, ms: number) => unknown;
  isInstallLive: () => boolean;
  run: () => Promise<void>;
  onError?: (error: unknown) => void;
}): void {
  const { setTimeoutFn, isInstallLive, run, onError } = args;

  try {
    setTimeoutFn(() => {
      if (!isInstallLive()) return;
      void run().catch(error => {
        if (typeof onError === 'function') onError(error);
      });
    }, 250);
  } catch (error) {
    if (typeof onError === 'function') onError(error);
  }
}

export async function installCloudSyncOwnerLifecycle(args: CloudSyncInstallLifecycleArgs): Promise<void> {
  const prepared = prepareCloudSyncInstallLifecycle(args);
  const {
    liveness,
    pullMainOnce,
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
    createLifecycleOps,
  } = prepared;

  if (!liveness.isInstallLive()) return;

  const cloudSyncLifecycle = createLifecycleOps();
  addCloudSyncCleanup(args.cleanup, () => {
    cloudSyncLifecycle.dispose();
  });

  if (!liveness.isInstallLive()) return;
  cloudSyncLifecycle.start();

  scheduleCloudSyncInitialPulls({
    setTimeoutFn: args.ownerContext.setTimeoutFn,
    isInstallLive: liveness.isInstallLive,
    run: () =>
      runCloudSyncInitialPulls({
        pullMainOnce,
        pullSketchOnce,
        pullTabsGateOnce,
        pullFloatingSketchSyncPinnedOnce,
        shouldContinue: liveness.isInstallLive,
      }),
    onError: error => {
      try {
        args.ownerContext.diag('initialPulls.error', error);
      } catch {
        // Non-fatal: lifecycle should stay installed even when diagnostics fail.
      }
    },
  });
}
