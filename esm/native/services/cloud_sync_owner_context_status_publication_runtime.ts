import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import { ensureCloudSyncServiceState } from '../runtime/cloud_sync_access.js';

import { buildRuntimeStatusSnapshotKey } from './cloud_sync_support.js';
import { isCloudSyncPublicationEpochCurrent } from './cloud_sync_install_support.js';
import { installCloudSyncStatusSurface, isCloudSyncStatusSurfaceFresh } from './cloud_sync_status_install.js';
import type { CloudSyncReportNonFatal } from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncOwnerStatusPublicationReason =
  | 'published'
  | 'fresh-surface'
  | 'healed-surface'
  | 'stale-epoch'
  | 'missing-state';

export type CloudSyncOwnerStatusPublicationResult = {
  published: boolean;
  snapshot: string;
  reason: CloudSyncOwnerStatusPublicationReason;
};

export function publishCloudSyncOwnerStatusSurface(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  publicationEpoch: number;
  lastPublishedStatusSnapshot: string;
}): CloudSyncOwnerStatusPublicationResult {
  const { App, runtimeStatus, publicationEpoch, lastPublishedStatusSnapshot } = args;
  const nextSnapshot = buildRuntimeStatusSnapshotKey(runtimeStatus);
  if (!isCloudSyncPublicationEpochCurrent(App, publicationEpoch)) {
    return { published: false, snapshot: nextSnapshot, reason: 'stale-epoch' };
  }
  const state = ensureCloudSyncServiceState(App);
  if (!state || typeof state !== 'object') {
    return { published: false, snapshot: nextSnapshot, reason: 'missing-state' };
  }
  if (isCloudSyncStatusSurfaceFresh(state.status, runtimeStatus)) {
    return {
      published: false,
      snapshot: nextSnapshot,
      reason: 'fresh-surface',
    };
  }
  if (nextSnapshot === lastPublishedStatusSnapshot) {
    state.status = installCloudSyncStatusSurface(state.status, runtimeStatus);
    return { published: false, snapshot: nextSnapshot, reason: 'healed-surface' };
  }
  state.status = installCloudSyncStatusSurface(state.status, runtimeStatus);
  return { published: true, snapshot: nextSnapshot, reason: 'published' };
}

export function createCloudSyncOwnerStatusPublisher(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  publicationEpoch: number;
  reportNonFatal: CloudSyncReportNonFatal;
}): {
  publishStatus: () => void;
  readLastPublishedStatusSnapshot: () => string;
} {
  const { App, runtimeStatus, publicationEpoch, reportNonFatal } = args;
  let lastPublishedStatusSnapshot = '';

  const publishStatus = (): void => {
    try {
      const result = publishCloudSyncOwnerStatusSurface({
        App,
        runtimeStatus,
        publicationEpoch,
        lastPublishedStatusSnapshot,
      });
      if (result.reason !== 'missing-state' && result.reason !== 'stale-epoch') {
        lastPublishedStatusSnapshot = result.snapshot;
      }
    } catch (error) {
      reportNonFatal(App, 'diag.publishStatus', error, { throttleMs: 8000, noConsole: true });
    }
  };

  return {
    publishStatus,
    readLastPublishedStatusSnapshot: (): string => lastPublishedStatusSnapshot,
  };
}
