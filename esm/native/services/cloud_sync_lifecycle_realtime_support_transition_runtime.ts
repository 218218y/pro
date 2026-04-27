import type { CloudSyncRuntimeStatus } from '../../../types';

import { syncCloudSyncRealtimeStatusInPlace } from './cloud_sync_lifecycle_support_realtime.js';
import {
  applyCloudSyncRealtimeLifecycleTransition,
  type CloudSyncRealtimePublishArgs,
  type CloudSyncRealtimeTransitionArgs,
  type CloudSyncPollingTransitionFn,
} from './cloud_sync_lifecycle_realtime_support_status_shared.js';

export function markCloudSyncRealtimeConnecting(
  args: CloudSyncRealtimeTransitionArgs & {
    enabled: boolean;
    mode: CloudSyncRuntimeStatus['realtime']['mode'];
    channel: string;
  }
): void {
  const { runtimeStatus, publishStatus, diag, enabled, mode, channel } = args;
  applyCloudSyncRealtimeLifecycleTransition({
    runtimeStatus,
    publishStatus,
    diag,
    diagEvent: 'realtime:connecting',
    diagPayload: mode,
    lastError: '',
    enabled,
    mode,
    state: 'connecting',
    channel,
    syncRealtimeStatus: syncCloudSyncRealtimeStatusInPlace,
  });
}

export function markCloudSyncRealtimeDisconnected(
  args: CloudSyncRealtimeTransitionArgs & {
    startPolling: CloudSyncPollingTransitionFn;
    subscribedRef: { current: boolean };
    why: string;
    lastError?: string;
  }
): void {
  const { runtimeStatus, publishStatus, diag, startPolling, subscribedRef, why, lastError } = args;
  subscribedRef.current = false;
  applyCloudSyncRealtimeLifecycleTransition({
    runtimeStatus,
    publishStatus,
    diag,
    diagEvent: 'realtime:disconnected',
    diagPayload: why,
    ...(typeof lastError === 'string' ? { lastError } : {}),
    state: `disconnected:${why}`,
    channel: '',
    syncRealtimeStatus: syncCloudSyncRealtimeStatusInPlace,
    runPollingTransition: () => {
      startPolling(`realtime-${why}`, { publish: false });
    },
  });
}

export function markCloudSyncRealtimeTimeout(
  args: CloudSyncRealtimeTransitionArgs & {
    startPolling: CloudSyncPollingTransitionFn;
  }
): void {
  const { runtimeStatus, publishStatus, diag, startPolling } = args;
  applyCloudSyncRealtimeLifecycleTransition({
    runtimeStatus,
    publishStatus,
    diag,
    diagEvent: 'realtime:timeout',
    state: 'timeout',
    channel: '',
    syncRealtimeStatus: syncCloudSyncRealtimeStatusInPlace,
    runPollingTransition: () => {
      startPolling('realtime-timeout', { publish: false });
    },
  });
}

export function markCloudSyncRealtimeFailure(
  args: CloudSyncRealtimeTransitionArgs & {
    state: CloudSyncRuntimeStatus['realtime']['state'];
    lastError: string;
    diagEvent?: string;
    pollingReason: string;
    startPolling: CloudSyncPollingTransitionFn;
    enabled?: boolean;
  }
): void {
  const {
    runtimeStatus,
    publishStatus,
    diag,
    state,
    lastError,
    diagEvent,
    pollingReason,
    startPolling,
    enabled,
  } = args;
  applyCloudSyncRealtimeLifecycleTransition({
    runtimeStatus,
    publishStatus,
    diag,
    ...(typeof diagEvent === 'string' && diagEvent ? { diagEvent, diagPayload: lastError || undefined } : {}),
    lastError,
    ...(typeof enabled === 'boolean' ? { enabled } : {}),
    state,
    channel: '',
    syncRealtimeStatus: syncCloudSyncRealtimeStatusInPlace,
    runPollingTransition: () => {
      startPolling(pollingReason, { publish: false });
    },
  });
}

export function markCloudSyncRealtimeDisposed(
  args: CloudSyncRealtimePublishArgs & { publish?: boolean }
): void {
  const { runtimeStatus, publishStatus } = args;
  applyCloudSyncRealtimeLifecycleTransition({
    runtimeStatus,
    publishStatus: args.publish === false ? () => undefined : publishStatus,
    lastError: '',
    enabled: false,
    state: 'disabled',
    channel: '',
    syncRealtimeStatus: syncCloudSyncRealtimeStatusInPlace,
  });
}
