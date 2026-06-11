import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import { getDocumentMaybe, getNavigatorMaybe } from '../runtime/api.js';
import { hasLiveRealtimeSubscriptionStatus } from './cloud_sync_realtime.js';

export type CloudSyncLifecycleBrowserActivity = {
  visibilityState: string;
  isHidden: boolean;
  isVisible: boolean;
  online: boolean | null;
};

export type CloudSyncLifecycleRefreshBlockReason = 'realtime' | 'offline' | 'hidden';

export function readCloudSyncLifecycleBrowserActivity(App: AppContainer): CloudSyncLifecycleBrowserActivity {
  const doc = getDocumentMaybe(App);
  const nav = getNavigatorMaybe(App);
  const visibilityState = typeof doc?.visibilityState === 'string' ? String(doc.visibilityState) : '';
  const online = typeof nav?.onLine === 'boolean' ? nav.onLine : null;
  return {
    visibilityState,
    isHidden: visibilityState === 'hidden',
    isVisible: visibilityState === '' || visibilityState === 'visible',
    online,
  };
}

export function readCloudSyncLifecycleRefreshBlockReason(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  allowWhenRealtime?: boolean;
  allowWhenOffline?: boolean;
  allowWhenHidden?: boolean;
}): CloudSyncLifecycleRefreshBlockReason | null {
  const { App, runtimeStatus, allowWhenRealtime, allowWhenOffline, allowWhenHidden } = args;
  if (!allowWhenRealtime && hasLiveRealtimeSubscriptionStatus(runtimeStatus)) return 'realtime';

  const activity = readCloudSyncLifecycleBrowserActivity(App);
  if (!allowWhenOffline && activity.online === false) return 'offline';
  if (!allowWhenHidden && activity.isHidden) return 'hidden';
  return null;
}
