import type {
  CloudSyncDiagFn,
  CloudSyncDiagPayload,
  CloudSyncRealtimeSubscribeStatus,
  CloudSyncRuntimeStatus,
} from '../../../types';
import { mutateCloudSyncLifecycleSnapshot } from './cloud_sync_lifecycle_status_runtime.js';

export type CloudSyncRealtimePublishArgs = {
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
};

export type CloudSyncRealtimeTransitionArgs = CloudSyncRealtimePublishArgs & {
  diag: CloudSyncDiagFn;
};

export type CloudSyncPollingTransitionFn = (reason: string, opts?: { publish?: boolean }) => void;

type SyncRealtimeStatusArgs = {
  runtimeStatus: CloudSyncRuntimeStatus;
  enabled?: boolean;
  mode?: CloudSyncRuntimeStatus['realtime']['mode'];
  state: CloudSyncRuntimeStatus['realtime']['state'];
  channel?: string;
};

export type {
  CloudSyncLifecyclePhase,
  CloudSyncLifecycleSnapshot,
} from './cloud_sync_lifecycle_status_runtime.js';
export { readCloudSyncLifecycleSnapshot } from './cloud_sync_lifecycle_status_runtime.js';

export function normalizeCloudSyncRealtimeSubscribeStatus(status: unknown): CloudSyncRealtimeSubscribeStatus {
  const raw = typeof status === 'string' ? status.trim().toUpperCase() : '';
  if (raw === 'SUBSCRIBED' || raw === 'CHANNEL_ERROR' || raw === 'TIMED_OUT' || raw === 'CLOSED') return raw;
  return '';
}

export function applyCloudSyncRealtimeStatus(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  enabled?: boolean;
  mode?: CloudSyncRuntimeStatus['realtime']['mode'];
  state: CloudSyncRuntimeStatus['realtime']['state'];
  channel?: string;
  syncRealtimeStatus: (args: SyncRealtimeStatusArgs) => void;
}): void {
  const { runtimeStatus, enabled, mode, state, channel, syncRealtimeStatus } = args;
  syncRealtimeStatus({
    runtimeStatus,
    ...(typeof enabled === 'boolean' ? { enabled } : {}),
    ...(typeof mode === 'string' ? { mode } : {}),
    state,
    ...(typeof channel === 'string' ? { channel } : {}),
  });
}

export function applyCloudSyncRealtimeLifecycleTransition(
  args: CloudSyncRealtimePublishArgs & {
    syncRealtimeStatus: (args: SyncRealtimeStatusArgs) => void;
    enabled?: boolean;
    mode?: CloudSyncRuntimeStatus['realtime']['mode'];
    state: CloudSyncRuntimeStatus['realtime']['state'];
    channel?: string;
    lastError?: string;
    runPollingTransition?: () => void;
    diag?: CloudSyncDiagFn;
    diagEvent?: string;
    diagPayload?: CloudSyncDiagPayload;
  }
): boolean {
  const {
    runtimeStatus,
    publishStatus,
    syncRealtimeStatus,
    enabled,
    mode,
    state,
    channel,
    lastError,
    runPollingTransition,
    diag,
    diagEvent,
    diagPayload,
  } = args;
  let hasPollingTransitionError = false;
  let pollingTransitionError: unknown;

  const result = mutateCloudSyncLifecycleSnapshot({
    runtimeStatus,
    publishStatus,
    diag,
    diagEvent,
    diagPayload,
    mutate: () => {
      if (typeof lastError === 'string') runtimeStatus.lastError = lastError;
      applyCloudSyncRealtimeStatus({
        runtimeStatus,
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
        ...(typeof mode === 'string' ? { mode } : {}),
        state,
        ...(typeof channel === 'string' ? { channel } : {}),
        syncRealtimeStatus,
      });
      try {
        runPollingTransition?.();
      } catch (err) {
        hasPollingTransitionError = true;
        pollingTransitionError = err;
      }
    },
  });
  if (hasPollingTransitionError) throw pollingTransitionError;
  return result.changed;
}
