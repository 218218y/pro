import { addCloudSyncCleanup, runCloudSyncInitialPulls } from './cloud_sync_owner_support.js';
import { type CloudSyncInstallLifecycleArgs } from './cloud_sync_install_lifecycle_shared.js';
import { prepareCloudSyncInstallLifecycle } from './cloud_sync_install_lifecycle_runtime_setup.js';

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

  await runCloudSyncInitialPulls({
    pullMainOnce,
    pullSketchOnce,
    pullTabsGateOnce,
    pullFloatingSketchSyncPinnedOnce,
    shouldContinue: liveness.isInstallLive,
  });

  if (!liveness.isInstallLive()) return;

  const cloudSyncLifecycle = createLifecycleOps();
  addCloudSyncCleanup(args.cleanup, () => {
    cloudSyncLifecycle.dispose();
  });

  if (!liveness.isInstallLive()) return;
  cloudSyncLifecycle.start();
}
