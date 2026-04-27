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

export async function installCloudSyncService(App: AppContainer): Promise<void> {
  try {
    disposePreviousCloudSyncInstall(App);

    const ownerContext = createCloudSyncOwnerContext(App);
    if (!ownerContext) {
      clearCloudSyncPublishedState(App);
      return;
    }

    const cleanup: Array<() => void> = [];
    const disposedRef = { v: false };
    const suppressRef = { v: false };
    let sendRealtimeHint: CloudSyncHintSender = null;

    const runtime = createCloudSyncInstallRuntime({
      App,
      ownerContext,
      suppressRef,
      getSendRealtimeHint: () => sendRealtimeHint,
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
  } catch (error) {
    handleCloudSyncInstallError(App, error);
  }
}
