import type { AppContainer, CloudSyncDiagFn, CloudSyncRuntimeStatus } from '../../../types';

import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support_bindings.js';
import { createCloudSyncRealtimeGapRefreshProfile } from './cloud_sync_lifecycle_refresh_profiles.js';
import { requestCloudSyncLifecycleRefresh } from './cloud_sync_lifecycle_support_refresh.js';
import { syncCloudSyncRealtimeStatusInPlace } from './cloud_sync_lifecycle_support_realtime.js';
import {
  applyCloudSyncRealtimeLifecycleTransition,
  type CloudSyncPollingTransitionFn,
} from './cloud_sync_lifecycle_realtime_support_status_shared.js';

function requestCloudSyncRealtimeGapRefresh(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  suppressRef: { v: boolean };
  pullAllNow: CloudSyncPullAllNowFn;
}): void {
  const { App, runtimeStatus, suppressRef, pullAllNow } = args;
  const profile = createCloudSyncRealtimeGapRefreshProfile();
  requestCloudSyncLifecycleRefresh({
    App,
    runtimeStatus,
    suppressRef,
    pullAllNow,
    opts: profile.opts,
    policy: profile.policy,
  });
}

export function markCloudSyncRealtimeSubscribed(args: {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  suppressRef: { v: boolean };
  stopPolling: CloudSyncPollingTransitionFn;
  pullAllNow: CloudSyncPullAllNowFn;
  subscribedRef: { current: boolean };
  everSubscribedRef: { current: boolean };
}): void {
  const {
    App,
    runtimeStatus,
    publishStatus,
    diag,
    suppressRef,
    stopPolling,
    pullAllNow,
    subscribedRef,
    everSubscribedRef,
  } = args;
  const wasSubscribed = subscribedRef.current;
  const shouldGapPull = everSubscribedRef.current && !wasSubscribed;
  subscribedRef.current = true;
  everSubscribedRef.current = true;
  applyCloudSyncRealtimeLifecycleTransition({
    runtimeStatus,
    publishStatus,
    diag,
    diagEvent: 'realtime:subscribed',
    state: 'subscribed',
    syncRealtimeStatus: syncCloudSyncRealtimeStatusInPlace,
    runPollingTransition: () => {
      stopPolling('realtime-subscribed', { publish: false });
    },
  });
  if (!shouldGapPull) return;
  requestCloudSyncRealtimeGapRefresh({ App, runtimeStatus, suppressRef, pullAllNow });
}
