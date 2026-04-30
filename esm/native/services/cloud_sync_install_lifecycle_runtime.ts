import type { CloudSyncDiagPayload } from '../../../types';

import { addCloudSyncCleanup, runCloudSyncInitialPulls } from './cloud_sync_owner_support.js';
import { type CloudSyncInstallLifecycleArgs } from './cloud_sync_install_lifecycle_shared.js';
import { prepareCloudSyncInstallLifecycle } from './cloud_sync_install_lifecycle_runtime_setup.js';

const INITIAL_PULL_START_DELAY_MS = 250;
const INITIAL_PULL_PHASE_YIELD_MS = 16;

function toCloudSyncDiagPayload(error: unknown): CloudSyncDiagPayload {
  if (error == null) return error;
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
  setTimeoutFn: (handler: () => void, ms: number) => unknown;
  isInstallLive: () => boolean;
  run: (yieldBetweenPulls: () => Promise<void>) => Promise<void>;
  onError?: (error: unknown) => void;
}): void {
  const { setTimeoutFn, isInstallLive, run, onError } = args;

  const waitForNextPhase = (): Promise<void> => {
    return new Promise(resolve => {
      if (!isInstallLive()) {
        resolve();
        return;
      }

      try {
        setTimeoutFn(resolve, INITIAL_PULL_PHASE_YIELD_MS);
      } catch {
        resolve();
      }
    });
  };

  try {
    setTimeoutFn(() => {
      if (!isInstallLive()) return;
      void run(waitForNextPhase).catch(error => {
        if (typeof onError === 'function') onError(error);
      });
    }, INITIAL_PULL_START_DELAY_MS);
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
