import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { readCloudSyncLifecycleBrowserActivity } from './cloud_sync_lifecycle_activity.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import {
  applyCloudSyncAttentionVisibilityState,
  requestCloudSyncAttentionPull,
  shouldRequestCloudSyncAttentionVisibilityPull,
  type CloudSyncAttentionPullMutableState,
} from './cloud_sync_lifecycle_attention_pulls_runtime.js';
import type { CloudSyncAttentionPullArgs } from './cloud_sync_lifecycle_attention_shared.js';

export function createCloudSyncAttentionPullHandlers(
  args: Pick<CloudSyncAttentionPullArgs, 'App' | 'runtimeStatus' | 'suppressRef' | 'pullAllNow'> & {
    isDisposed?: () => boolean;
    state: CloudSyncAttentionPullMutableState;
  }
): {
  initializeVisibilityState: () => void;
  onFocus: (_ev: unknown) => void;
  onOnline: (_ev: unknown) => void;
  onVisibilityChange: (_ev: unknown) => void;
} {
  const { App, runtimeStatus, suppressRef, pullAllNow, isDisposed, state } = args;

  const triggerAttentionPull = (reason: string): void => {
    requestCloudSyncAttentionPull({
      App,
      runtimeStatus,
      suppressRef,
      pullAllNow,
      isDisposed,
      state,
      reason,
    });
  };

  const initializeVisibilityState = (): void => {
    try {
      const visibilityState = readCloudSyncLifecycleBrowserActivity(App).visibilityState;
      if (!visibilityState) return;
      applyCloudSyncAttentionVisibilityState({ state, visibilityState });
    } catch (err) {
      _cloudSyncReportNonFatal(App, 'visibilityListener.init', err, { throttleMs: 10000 });
    }
  };

  const onFocus = (_ev: unknown): void => {
    try {
      if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return;
      triggerAttentionPull('focus');
    } catch (err) {
      _cloudSyncReportNonFatal(App, 'focusListener.callback', err, { throttleMs: 10000 });
    }
  };

  const onOnline = (_ev: unknown): void => {
    try {
      if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return;
      triggerAttentionPull('online');
    } catch (err) {
      _cloudSyncReportNonFatal(App, 'onlineListener.callback', err, { throttleMs: 10000 });
    }
  };

  const onVisibilityChange = (_ev: unknown): void => {
    try {
      if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return;
      const visibilityState = readCloudSyncLifecycleBrowserActivity(App).visibilityState;
      if (!visibilityState) return;
      if (!shouldRequestCloudSyncAttentionVisibilityPull({ state, visibilityState })) return;
      triggerAttentionPull('visibility');
    } catch (err) {
      _cloudSyncReportNonFatal(App, 'visibilityListener.callback', err, { throttleMs: 10000 });
    }
  };

  return {
    initializeVisibilityState,
    onFocus,
    onOnline,
    onVisibilityChange,
  };
}
