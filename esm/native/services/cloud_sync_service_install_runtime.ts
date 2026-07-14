import type { AppContainer } from '../../../types';

import { createCloudSyncOwnerContext } from './cloud_sync_owner_context.js';
import { disposeCloudSyncOwnerCleanup } from './cloud_sync_owner_support.js';
import { createCloudSyncInstallRuntime, type CloudSyncHintSender } from './cloud_sync_install_runtime.js';
import { installCloudSyncOwnerLifecycle } from './cloud_sync_install_lifecycle.js';
import {
  clearCloudSyncPublishedState,
  disposePreviousCloudSyncInstall,
  publishCloudSyncDispose,
} from './cloud_sync_install_support.js';
import { handleCloudSyncInstallError } from './cloud_sync_service_install_error.js';
import { getCloudSyncServiceMaybe } from '../runtime/cloud_sync_access.js';

type CloudSyncOwnerInstallOptions = {
  preserveStableSurfaces?: boolean;
};

async function installCloudSyncOwnerRuntime(
  App: AppContainer,
  opts: CloudSyncOwnerInstallOptions = {}
): Promise<void> {
  disposePreviousCloudSyncInstall(App, {
    preserveStableSurfaces: opts.preserveStableSurfaces === true,
  });

  const ownerContext = createCloudSyncOwnerContext(App);
  if (!ownerContext) {
    clearCloudSyncPublishedState(App);
    return;
  }

  const cleanup: Array<() => void> = [];
  const disposedRef = { v: false };
  const suppressRef = { v: false };
  let sendRealtimeHint: CloudSyncHintSender = null;

  const reinstallOwnerForRoomChange = async (expectedRoom: string): Promise<void> => {
    try {
      await installCloudSyncOwnerRuntime(App, { preserveStableSurfaces: true });
      const activeRoom = String(getCloudSyncServiceMaybe(App)?.getCurrentRoom?.() || '').trim();
      if (activeRoom !== expectedRoom) {
        throw new Error(
          `Cloud Sync owner reinstalled for an unexpected room: expected ${expectedRoom}, received ${activeRoom || 'none'}`
        );
      }
    } catch (error) {
      handleCloudSyncInstallError(App, error);
      throw error;
    }
  };

  const runtime = createCloudSyncInstallRuntime({
    App,
    ownerContext,
    suppressRef,
    getSendRealtimeHint: () => sendRealtimeHint,
    reinstallOwnerForRoomChange,
  });

  const dispose = (): void => {
    disposeCloudSyncOwnerCleanup({
      App,
      cleanup,
      disposeTabsGate: runtime.cloudSyncTabsGate.dispose,
      disposeSketchOps: runtime.cloudSyncSketch.dispose,
      suppressRef,
      disposedRef,
    });
  };

  publishCloudSyncDispose(App, dispose, ownerContext.publicationEpoch);

  await installCloudSyncOwnerLifecycle({
    App,
    ownerContext,
    runtime,
    cleanup,
    suppressRef,
    disposedRef,
    setSendRealtimeHint: next => {
      sendRealtimeHint = next;
    },
  });
}

export async function installCloudSyncService(App: AppContainer): Promise<void> {
  try {
    await installCloudSyncOwnerRuntime(App);
  } catch (error) {
    handleCloudSyncInstallError(App, error);
  }
}
