import { requestCloudSyncLifecycleRefresh } from './cloud_sync_lifecycle_support_refresh.js';
import { createCloudSyncAttentionRefreshProfile } from './cloud_sync_lifecycle_refresh_profiles.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import type { CloudSyncAttentionPullArgs } from './cloud_sync_lifecycle_attention_shared.js';

const BOOT_GRACE_MS = 5000;
const ATTENTION_MIN_GAP_MS = 15000;
const HIDDEN_MIN_MS = 5000;

export type CloudSyncAttentionPullMutableState = {
  bootAt: number;
  lastAttentionPullAt: number;
  lastVisState: string;
  lastHiddenAt: number;
};

export function createCloudSyncAttentionPullMutableState(
  now = Date.now()
): CloudSyncAttentionPullMutableState {
  return {
    bootAt: now,
    lastAttentionPullAt: 0,
    lastVisState: '',
    lastHiddenAt: 0,
  };
}

function getCloudSyncAttentionPullReportOp(reason: string): string {
  if (reason === 'online') return 'onlineListener.callback';
  if (reason === 'focus') return 'focusListener.callback';
  if (reason === 'visibility') return 'visibilityListener.callback';
  return 'cloudSyncAttention.pull';
}

export function requestCloudSyncAttentionPull(
  args: Pick<CloudSyncAttentionPullArgs, 'App' | 'runtimeStatus' | 'suppressRef' | 'pullAllNow'> & {
    isDisposed?: () => boolean;
    state: CloudSyncAttentionPullMutableState;
    reason: string;
    now?: number;
  }
): boolean {
  const { App, runtimeStatus, suppressRef, pullAllNow, isDisposed, state, reason } = args;
  const now = Number(args.now) || Date.now();
  if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return false;
  if (now - state.bootAt < BOOT_GRACE_MS) return false;
  if (state.lastAttentionPullAt && now - state.lastAttentionPullAt < ATTENTION_MIN_GAP_MS) return false;
  const profile = createCloudSyncAttentionRefreshProfile(reason);
  const refreshRequest = requestCloudSyncLifecycleRefresh({
    App,
    runtimeStatus,
    suppressRef,
    pullAllNow,
    opts: profile.opts,
    policy: profile.policy,
    reportOp: getCloudSyncAttentionPullReportOp(reason),
  });
  if (!refreshRequest.accepted) return false;
  state.lastAttentionPullAt = now;
  return true;
}

export function applyCloudSyncAttentionVisibilityState(args: {
  state: CloudSyncAttentionPullMutableState;
  visibilityState: string;
  now?: number;
}): void {
  const { state, visibilityState } = args;
  const now = Number(args.now) || Date.now();
  if (visibilityState === 'hidden') {
    state.lastHiddenAt = now;
  }
  state.lastVisState = visibilityState;
}

export function shouldRequestCloudSyncAttentionVisibilityPull(args: {
  state: CloudSyncAttentionPullMutableState;
  visibilityState: string;
  now?: number;
}): boolean {
  const { state, visibilityState } = args;
  const now = Number(args.now) || Date.now();
  if (visibilityState === 'hidden') {
    applyCloudSyncAttentionVisibilityState({ state, visibilityState, now });
    return false;
  }
  if (visibilityState !== 'visible') {
    state.lastVisState = visibilityState;
    return false;
  }
  const was = state.lastVisState;
  state.lastVisState = visibilityState;
  if (was !== 'hidden') return false;
  const hiddenFor = state.lastHiddenAt ? now - state.lastHiddenAt : 0;
  return !(hiddenFor > 0 && hiddenFor < HIDDEN_MIN_MS);
}
