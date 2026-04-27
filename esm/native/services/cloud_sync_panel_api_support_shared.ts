import type {
  CloudSyncClipboardLike,
  CloudSyncPromptSinkLike,
  CloudSyncStorageValueStoreLike,
} from '../../../types';

import {
  type CloudSyncAsyncFamilyFlight,
  createCloudSyncAsyncFamilySingleFlightRunner,
  createCloudSyncAsyncSingleFlightRunner,
} from './cloud_sync_async_singleflight.js';

export const CLOUD_SYNC_DIAG_LS_KEY = 'WP_CLOUDSYNC_DIAG';

export function buildCloudSyncPanelApiOp(name: string): string {
  return `services/cloud_sync.panelApi.${name}`;
}

export function getCloudSyncDiagStorageMaybe(
  read: () => CloudSyncStorageValueStoreLike | null
): CloudSyncStorageValueStoreLike | null {
  try {
    const ls = read();
    return ls && typeof ls.setItem === 'function' ? ls : null;
  } catch {
    return null;
  }
}

export function getCloudSyncClipboardMaybe(
  read: () => CloudSyncClipboardLike | null
): CloudSyncClipboardLike | null {
  try {
    const cb = read();
    return cb && typeof cb.writeText === 'function' ? cb : null;
  } catch {
    return null;
  }
}

export function getCloudSyncPromptSinkMaybe(
  read: () => CloudSyncPromptSinkLike | null
): CloudSyncPromptSinkLike | null {
  try {
    const sink = read();
    return sink && typeof sink.prompt === 'function' ? sink : null;
  } catch {
    return null;
  }
}

export {
  type CloudSyncAsyncFamilyFlight,
  createCloudSyncAsyncFamilySingleFlightRunner,
  createCloudSyncAsyncSingleFlightRunner,
};
