import type { CloudSyncLifecycleRefreshPolicy } from './cloud_sync_lifecycle_support_refresh.js';
import type { CloudSyncPullAllNowOptions } from './cloud_sync_lifecycle_support_bindings.js';

export type CloudSyncLifecycleRefreshProfile = {
  opts: CloudSyncPullAllNowOptions;
  policy: CloudSyncLifecycleRefreshPolicy;
};

const ATTENTION_RECENT_PULL_MS = 8000;
const REALTIME_GAP_RECENT_PULL_MS = 4000;
const REALTIME_BROADCAST_RECENT_PULL_MS = 1500;

function normalizeRefreshReason(value: unknown, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
}

function createCloudSyncLifecycleRefreshProfile(
  opts: CloudSyncPullAllNowOptions,
  policy: CloudSyncLifecycleRefreshPolicy
): CloudSyncLifecycleRefreshProfile {
  return {
    opts,
    policy,
  };
}

export function createCloudSyncAttentionRefreshProfile(reason: unknown): CloudSyncLifecycleRefreshProfile {
  return createCloudSyncLifecycleRefreshProfile(
    {
      includeControls: false,
      reason: `attention:${normalizeRefreshReason(reason, 'tab')}`,
      minRecentPullGapMs: ATTENTION_RECENT_PULL_MS,
    },
    {
      allowWhenRealtime: false,
      allowWhenOffline: false,
      allowWhenHidden: false,
    }
  );
}

export function createCloudSyncPollingRefreshProfile(
  pollIntervalMs: number
): CloudSyncLifecycleRefreshProfile {
  return createCloudSyncLifecycleRefreshProfile(
    {
      reason: 'polling',
      minRecentPullGapMs: Math.max(0, Number(pollIntervalMs) || 0),
    },
    {
      allowWhenRealtime: false,
      allowWhenOffline: false,
      allowWhenHidden: false,
    }
  );
}

export function createCloudSyncRealtimeGapRefreshProfile(): CloudSyncLifecycleRefreshProfile {
  return createCloudSyncLifecycleRefreshProfile(
    {
      includeControls: false,
      reason: 'realtime-gap',
      minRecentPullGapMs: REALTIME_GAP_RECENT_PULL_MS,
    },
    {
      allowWhenRealtime: true,
      allowWhenOffline: true,
      allowWhenHidden: true,
    }
  );
}

export function createCloudSyncRealtimeBroadcastRefreshProfile(): CloudSyncLifecycleRefreshProfile {
  return createCloudSyncLifecycleRefreshProfile(
    {
      reason: 'realtime.broadcast',
      minRecentPullGapMs: REALTIME_BROADCAST_RECENT_PULL_MS,
    },
    {
      allowWhenRealtime: true,
      allowWhenOffline: true,
      allowWhenHidden: true,
    }
  );
}

export function createCloudSyncAttentionRefreshOptions(reason: unknown): CloudSyncPullAllNowOptions {
  return createCloudSyncAttentionRefreshProfile(reason).opts;
}

export function createCloudSyncPollingRefreshOptions(pollIntervalMs: number): CloudSyncPullAllNowOptions {
  return createCloudSyncPollingRefreshProfile(pollIntervalMs).opts;
}

export function createCloudSyncRealtimeGapRefreshOptions(): CloudSyncPullAllNowOptions {
  return createCloudSyncRealtimeGapRefreshProfile().opts;
}

export function createCloudSyncRealtimeBroadcastRefreshOptions(): CloudSyncPullAllNowOptions {
  return createCloudSyncRealtimeBroadcastRefreshProfile().opts;
}
