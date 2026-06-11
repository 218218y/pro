import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import {
  invokeCloudSyncRealtimeScopedHandler,
  type CloudSyncRealtimeScopedHandlerMap,
} from './cloud_sync_pull_scopes.js';
import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support.js';
import { createCloudSyncRealtimeBroadcastRefreshProfile } from './cloud_sync_lifecycle_refresh_profiles.js';
import { requestCloudSyncLifecycleRefresh } from './cloud_sync_lifecycle_support_refresh.js';
import { readCloudSyncRealtimeHintPayload } from './cloud_sync_lifecycle_realtime_support_broadcast_payload.js';

export function routeCloudSyncRealtimeBroadcastEvent(args: {
  App: AppContainer;
  evt: unknown;
  clientId: string;
  room: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  suppressRef: { v: boolean };
  markRealtimeEvent: () => boolean;
  pullAllNow: CloudSyncPullAllNowFn;
  realtimeScopedHandlers: CloudSyncRealtimeScopedHandlerMap;
}): void {
  const {
    App,
    evt,
    clientId,
    room,
    runtimeStatus,
    suppressRef,
    markRealtimeEvent,
    pullAllNow,
    realtimeScopedHandlers,
  } = args;
  const hint = readCloudSyncRealtimeHintPayload(evt);
  if (!hint) return;
  if (hint.by && hint.by === clientId) return;
  if (hint.room && hint.room !== room) return;
  if (invokeCloudSyncRealtimeScopedHandler(hint.scope, realtimeScopedHandlers)) return;
  if (!markRealtimeEvent()) return;
  const profile = createCloudSyncRealtimeBroadcastRefreshProfile();
  requestCloudSyncLifecycleRefresh({
    App,
    runtimeStatus,
    suppressRef,
    pullAllNow,
    opts: profile.opts,
    policy: profile.policy,
  });
}
