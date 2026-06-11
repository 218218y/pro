import type { AppContainer, CloudSyncSessionStorageLike } from '../../../types';

import { getWindowMaybe } from '../runtime/api.js';
import { randomRoomId } from './cloud_sync_config.js';
import {
  CLOUD_SYNC_CLIENT_KEY,
  type CloudSyncReportNonFatal,
} from './cloud_sync_owner_context_runtime_shared.js';

function getCloudSyncSessionStorageMaybe(
  App: AppContainer,
  reportNonFatal: CloudSyncReportNonFatal
): CloudSyncSessionStorageLike | null {
  try {
    const ss = getWindowMaybe(App)?.sessionStorage || null;
    return ss && typeof ss.getItem === 'function' && typeof ss.setItem === 'function' ? ss : null;
  } catch (e) {
    reportNonFatal(App, 'clientId.read.session', e, { throttleMs: 8000 });
    return null;
  }
}

export function resolveCloudSyncClientId(App: AppContainer, reportNonFatal: CloudSyncReportNonFatal): string {
  const ss = getCloudSyncSessionStorageMaybe(App, reportNonFatal);
  if (ss) {
    const fromSession = String(ss.getItem?.(CLOUD_SYNC_CLIENT_KEY) || '').trim();
    if (fromSession) return fromSession;
    const next = `client_${randomRoomId()}`;
    ss.setItem?.(CLOUD_SYNC_CLIENT_KEY, next);
    return next;
  }
  return `client_${randomRoomId()}`;
}
