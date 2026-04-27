import type { AppContainer, CloudSyncRealtimeChannelLike, CloudSyncRealtimeClientLike } from '../../../types';

import { getWindowMaybe } from '../runtime/api.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { removeRealtimeChannel } from './cloud_sync_realtime.js';

type CloudSyncListenerTargetLike = {
  addEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
  removeEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
};

type CloudSyncAddListenerLike = (
  target: CloudSyncListenerTargetLike | null,
  type: string,
  handler: (ev: unknown) => void
) => void;

type CloudSyncRealtimeRefsLike = {
  client: CloudSyncRealtimeClientLike | null;
  channel: CloudSyncRealtimeChannelLike | null;
};

export function bindCloudSyncRealtimeBeforeUnloadCleanup(args: {
  App: AppContainer;
  refs: CloudSyncRealtimeRefsLike;
  addListener: CloudSyncAddListenerLike;
}): void {
  const { App, refs, addListener } = args;
  try {
    const w = getWindowMaybe(App);
    const onBeforeUnload = (_ev: unknown): void => {
      try {
        removeRealtimeChannel(refs.client, refs.channel);
      } catch (err) {
        _cloudSyncReportNonFatal(App, 'realtime.beforeUnload.removeChannel', err, { throttleMs: 10000 });
      }
    };
    addListener(w, 'beforeunload', onBeforeUnload);
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'realtime.beforeUnload.listener', err, { throttleMs: 10000 });
  }
}
