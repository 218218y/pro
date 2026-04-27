import type { AppContainer } from '../../../types';

import { ensureCloudSyncServiceState } from '../runtime/cloud_sync_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  type ClearCloudSyncPublishedStateOptions,
  type CloudSyncPublishedStateLike,
  canInvokeCloudSyncPublishedDispose,
  invalidateCloudSyncPublicationEpoch,
  isCloudSyncPublicationEpochCurrent,
} from './cloud_sync_install_support_shared.js';
import {
  clearCloudSyncPublishedSlots,
  restoreCloudSyncPublishedPreservedState,
} from './cloud_sync_install_support_publication_shared.js';

export function clearCloudSyncPublishedState(
  App: AppContainer,
  opts?: ClearCloudSyncPublishedStateOptions
): void {
  try {
    const resolvedOptions: Required<ClearCloudSyncPublishedStateOptions> = {
      preserveDispose: false,
      preserveTestHooks: true,
      invalidatePublicationEpoch: false,
      publicationEpoch: null,
      ...(opts || {}),
    };

    const { invalidatePublicationEpoch, publicationEpoch } = resolvedOptions;

    if (typeof publicationEpoch === 'number' && publicationEpoch > 0) {
      if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) return;
    }

    if (invalidatePublicationEpoch) invalidateCloudSyncPublicationEpoch(App, publicationEpoch);

    const state = ensureCloudSyncServiceState(App) as CloudSyncPublishedStateLike | null;
    if (!state || typeof state !== 'object') return;

    const preserved = clearCloudSyncPublishedSlots(App, state, resolvedOptions);
    restoreCloudSyncPublishedPreservedState(state, preserved);
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'install.clearState', error, { throttleMs: 6000 });
  }
}

export function disposePreviousCloudSyncInstall(App: AppContainer): void {
  try {
    const state = ensureCloudSyncServiceState(App);
    const dispose = state && typeof state.dispose === 'function' ? state.dispose : null;
    if (dispose && canInvokeCloudSyncPublishedDispose(App, state)) {
      dispose();
      return;
    }
    clearCloudSyncPublishedState(App, { invalidatePublicationEpoch: true });
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'install.disposePrev', error, { throttleMs: 6000 });
  }
}

export function publishCloudSyncDispose(
  App: AppContainer,
  dispose: () => void,
  publicationEpoch?: number | null
): void {
  try {
    if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) return;
    const state = ensureCloudSyncServiceState(App);
    if (state && typeof state === 'object') {
      let disposed = false;
      state.dispose = (): void => {
        if (disposed) return;
        if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) return;
        disposed = true;
        try {
          dispose();
        } finally {
          clearCloudSyncPublishedState(App, {
            preserveDispose: true,
            invalidatePublicationEpoch: true,
            publicationEpoch,
          });
        }
      };
      if (typeof publicationEpoch === 'number' && publicationEpoch > 0)
        state.__disposePublicationEpoch = publicationEpoch;
      else delete state.__disposePublicationEpoch;
      state.installedAt = Date.now();
    }
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'install.publishStateDispose', error, { throttleMs: 4000 });
  }
}
