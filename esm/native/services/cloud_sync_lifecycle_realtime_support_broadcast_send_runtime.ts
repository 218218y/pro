import type {
  AppContainer,
  CloudSyncRealtimeChannelLike,
  CloudSyncRuntimeStatus,
  CloudSyncRealtimeHintPayload,
} from '../../../types';

import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  normalizeCloudSyncRealtimeHintRowName,
  normalizeCloudSyncRealtimeHintScope,
} from './cloud_sync_pull_scopes.js';
import { hasLiveRealtimeSubscriptionStatus } from './cloud_sync_realtime.js';

function buildCloudSyncRealtimeHintDedupeKey(args: {
  scope: CloudSyncRealtimeHintPayload['scope'];
  rowName?: string;
  room: string;
}): string {
  const { scope, rowName, room } = args;
  return `${scope}|${rowName || ''}|${room}`;
}

export async function sendCloudSyncRealtimeHint(args: {
  App: AppContainer;
  isDisposed: () => boolean;
  channel: CloudSyncRealtimeChannelLike | null;
  realtimeMode: string;
  runtimeStatus: CloudSyncRuntimeStatus;
  scope: CloudSyncRealtimeHintPayload['scope'] | string;
  rowName?: string;
  room: string;
  clientId: string;
  eventName: string;
  dedupeMs: number;
  sentAtByKey: Map<string, number>;
}): Promise<void> {
  const {
    App,
    isDisposed,
    channel,
    realtimeMode,
    runtimeStatus,
    scope,
    rowName,
    room,
    clientId,
    eventName,
    dedupeMs,
    sentAtByKey,
  } = args;
  try {
    if (isDisposed()) return;
    if (!channel || realtimeMode !== 'broadcast') return;
    if (!hasLiveRealtimeSubscriptionStatus(runtimeStatus)) return;
    const send = channel.send;
    if (typeof send !== 'function') return;
    const normalizedScope = normalizeCloudSyncRealtimeHintScope(scope);
    if (!normalizedScope) return;
    const normalizedRowName = normalizeCloudSyncRealtimeHintRowName(rowName);
    const key = buildCloudSyncRealtimeHintDedupeKey({
      scope: normalizedScope,
      rowName: normalizedRowName,
      room,
    });
    const now = Date.now();
    const lastAt = sentAtByKey.get(key) || 0;
    if (now - lastAt < dedupeMs) return;
    sentAtByKey.set(key, now);
    await send.call(channel, {
      type: 'broadcast',
      event: eventName,
      payload: {
        scope: normalizedScope,
        row: normalizedRowName,
        room,
        by: clientId,
        ts: now,
      },
    });
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'realtime.broadcast.send', err, { throttleMs: 4000, noConsole: true });
  }
}
