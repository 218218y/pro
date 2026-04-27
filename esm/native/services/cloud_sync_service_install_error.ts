import type { AppContainer } from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { ensureCloudSyncServiceState } from '../runtime/cloud_sync_access.js';
import {
  canInvokeCloudSyncPublishedDispose,
  clearCloudSyncPublishedState,
} from './cloud_sync_install_support.js';

export function handleCloudSyncInstallError(App: AppContainer, error: unknown): void {
  let disposedPartial = false;

  try {
    const st = ensureCloudSyncServiceState(App);
    if (canInvokeCloudSyncPublishedDispose(App, st)) {
      st?.dispose?.();
      disposedPartial = true;
    }
  } catch (disposeError) {
    _cloudSyncReportNonFatal(App, 'install.disposePartialOnError', disposeError, { throttleMs: 10000 });
  }

  if (disposedPartial) {
    clearCloudSyncPublishedState(App);
  } else {
    clearCloudSyncPublishedState(App, { invalidatePublicationEpoch: true });
  }
  _cloudSyncReportNonFatal(App, 'install.outer', error, { throttleMs: 6000 });
}
