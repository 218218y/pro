import type { CloudSyncRealtimeHintPayload } from '../../../types';

import { asRecord } from './cloud_sync_support.js';
import {
  normalizeCloudSyncRealtimeHintRowName,
  normalizeCloudSyncRealtimeHintScope,
} from './cloud_sync_pull_scopes.js';

export function readCloudSyncRealtimeHintPayload(evt: unknown): CloudSyncRealtimeHintPayload | null {
  const rec = asRecord(evt);
  const payload = asRecord(rec?.payload);
  if (!payload) return null;
  const scope = normalizeCloudSyncRealtimeHintScope(payload.scope);
  if (!scope) return null;
  const room = typeof payload.room === 'string' ? payload.room.trim() : '';
  const by = typeof payload.by === 'string' ? payload.by.trim() : '';
  const row = normalizeCloudSyncRealtimeHintRowName(payload.row);
  const ts = typeof payload.ts === 'number' && Number.isFinite(payload.ts) ? payload.ts : undefined;
  return {
    scope,
    ...(room ? { room } : {}),
    ...(by ? { by } : {}),
    ...(row ? { row } : {}),
    ...(typeof ts === 'number' ? { ts } : {}),
  };
}
