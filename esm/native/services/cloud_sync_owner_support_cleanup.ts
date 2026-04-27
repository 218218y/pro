import type { AppContainer } from '../../../types';

import {
  type CloudSyncOwnerCleanupStack,
  reportCloudSyncOwnerSupportError,
} from './cloud_sync_owner_support_shared.js';

export { type CloudSyncOwnerCleanupStack } from './cloud_sync_owner_support_shared.js';

export function addCloudSyncCleanup(cleanup: CloudSyncOwnerCleanupStack, fn: () => void): void {
  cleanup.push(fn);
}

export function disposeCloudSyncOwnerCleanup(args: {
  App: AppContainer;
  cleanup: CloudSyncOwnerCleanupStack;
  disposeTabsGate: () => void;
  disposeSketchOps: () => void;
  suppressRef: { v: boolean };
  disposedRef: { v: boolean };
}): void {
  const { App, cleanup, disposeTabsGate, disposeSketchOps, suppressRef, disposedRef } = args;

  if (disposedRef.v) return;
  disposedRef.v = true;
  suppressRef.v = true;

  try {
    disposeTabsGate();
  } catch (err) {
    reportCloudSyncOwnerSupportError(App, 'site2TabsGate.ownerDispose', err, 8000);
  }

  try {
    disposeSketchOps();
  } catch (err) {
    reportCloudSyncOwnerSupportError(App, 'cloudSketch.ownerDispose', err, 8000);
  }

  try {
    for (let i = cleanup.length - 1; i >= 0; i--) {
      try {
        cleanup[i]();
      } catch (err) {
        reportCloudSyncOwnerSupportError(App, 'services/cloud_sync.cleanupItem', err);
      }
    }
    cleanup.length = 0;
  } catch (err) {
    reportCloudSyncOwnerSupportError(App, 'services/cloud_sync.cleanupStack', err);
  }
}
