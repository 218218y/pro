import type { CloudSyncDiagPayload } from '../../../types';

import { addCloudSyncCleanup, runCloudSyncInitialPulls } from './cloud_sync_owner_support.js';
import { type CloudSyncInstallLifecycleArgs } from './cloud_sync_install_lifecycle_shared.js';
import { prepareCloudSyncInstallLifecycle } from './cloud_sync_install_lifecycle_runtime_setup.js';

function toCloudSyncDiagPayload(error: unknown): CloudSyncDiagPayload {
  if (error === null) return null;
  if (typeof error === 'undefined') return undefined;
  if (typeof error === 'string' || typeof error === 'number' || typeof error === 'boolean') return error;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

function scheduleCloudSyncInitialPulls(args: {
  isInstallLive: () => boolean;
  run: (yieldBetweenPulls: () => Promise<void>) => Promise<void>;
  onError?: (error: unknown) => void;
}): void {
  const { isInstallLive, run, onError } = args;

  const waitForNextPhase = (): Promise<void> => {
    if (!isInstallLive()) return Promise.resolve();
    return Promise.resolve();
  };

  void Promise.resolve()
    .then(() => {
      if (!isInstallLive()) return;
      return run(waitForNextPhase);
    })
    .catch(error => {
      if (typeof onError === 'function') onError(error);
    });
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
    isInstallLive: liveness.isInstallLive,
    run: yieldBetweenPulls =>
      runCloudSyncInitialPulls({
        pullMainOnce,
        pullSketchOnce,
        pullTabsGateOnce,
        pullFloatingSketchSyncPinnedOnce,
        shouldContinue: liveness.isInstallLive,
        yieldBetweenPulls,
      }),
    onError: error => {
      try {
        args.ownerContext.diag('initialPulls.error', toCloudSyncDiagPayload(error));
      } catch {
        // Non-fatal: lifecycle should stay installed even when diagnostics fail.
      }
    },
  });
}
