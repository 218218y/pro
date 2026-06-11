import { getWindowMaybe } from '../runtime/api.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { createCloudSyncAttentionPullMutableState } from './cloud_sync_lifecycle_attention_pulls_runtime.js';
import { createCloudSyncAttentionPullHandlers } from './cloud_sync_lifecycle_attention_pulls_handlers.js';
import type { CloudSyncAttentionPullArgs } from './cloud_sync_lifecycle_attention_shared.js';

export function bindCloudSyncAttentionPulls(args: CloudSyncAttentionPullArgs): void {
  const { App, addListener } = args;
  try {
    const w = getWindowMaybe(App);
    const state = createCloudSyncAttentionPullMutableState();
    const handlers = createCloudSyncAttentionPullHandlers({
      ...args,
      state,
    });

    addListener(w, 'focus', handlers.onFocus);
    addListener(w, 'online', handlers.onOnline);
    handlers.initializeVisibilityState();

    const doc = getWindowMaybe(App)?.document || null;
    addListener(doc, 'visibilitychange', handlers.onVisibilityChange);
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'attentionPulls.bind', err, { throttleMs: 10000 });
  }
}
