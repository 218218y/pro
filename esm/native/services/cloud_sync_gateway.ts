import type {
  CloudSyncCredentialIssueResult,
  CloudSyncFetchLike,
  CloudSyncGatewayFailure,
  CloudSyncGatewayReadResult,
  CloudSyncOrderList,
  CloudSyncPayload,
  CloudSyncRoomCredential,
  CloudSyncStateRow,
  CloudSyncUpsertResult,
} from '../../../types';

import {
  _cloudSyncReportNonFatal,
  asRecord,
  asString,
  normalizeList,
  normalizeModelList,
  normalizeSavedColorsList,
  readCloudSyncErrorMessage,
} from './cloud_sync_support.js';
import { makeHeaders } from './cloud_sync_config.js';

type CloudSyncGatewayRequest =
  | { action: 'issue-public'; storeId: string }
  | { action: 'create-room'; storeId: string }
  | { action: 'renew-room'; storeId: string; room: string; roomToken: string }
  | { action: 'read'; storeId: string; room: string; roomToken: string }
  | {
      action: 'write';
      storeId: string;
      room: string;
      roomToken: string;
      payload: CloudSyncPayload;
      expectedRevision: number;
      clientId: string;
    };

function readOrderList(value: unknown): CloudSyncOrderList | null {
  return Array.isArray(value) ? normalizeList(value) : null;
}

function readCloudSyncPayload(value: unknown): CloudSyncPayload {
  const rec = asRecord(value);
  if (!rec) return {};
  const next: CloudSyncPayload = {};
  if (Array.isArray(rec.savedModels)) next.savedModels = normalizeModelList(rec.savedModels);
  if (Array.isArray(rec.savedColors)) next.savedColors = normalizeSavedColorsList(rec.savedColors);
  const colorSwatchesOrder = readOrderList(rec.colorSwatchesOrder);
  if (colorSwatchesOrder) next.colorSwatchesOrder = colorSwatchesOrder;
  const presetOrder = readOrderList(rec.presetOrder);
  if (presetOrder) next.presetOrder = presetOrder;
  const hiddenPresets = readOrderList(rec.hiddenPresets);
  if (hiddenPresets) next.hiddenPresets = hiddenPresets;
  for (const [key, entry] of Object.entries(rec)) {
    if (key in next) continue;
    next[key] = entry;
  }
  return next;
}

function readCloudSyncStateRow(value: unknown): CloudSyncStateRow | null {
  const rec = asRecord(value);
  if (!rec) return null;
  const room = asString(rec.room) || '';
  const revision = typeof rec.revision === 'number' && Number.isInteger(rec.revision) ? rec.revision : 0;
  const updatedAt = asString(rec.updated_at) || '';
  const updatedBy = asString(rec.updated_by) || '';
  if (!room || revision < 1 || !updatedAt) return null;
  return {
    room,
    payload: readCloudSyncPayload(rec.payload),
    revision,
    updated_at: updatedAt,
    updated_by: updatedBy,
  };
}

function readGatewayRowEnvelope(value: unknown): CloudSyncStateRow | null {
  const rec = asRecord(value);
  return readCloudSyncStateRow(rec?.row);
}

function readRoomCredential(value: unknown): CloudSyncRoomCredential | null {
  const rec = asRecord(value);
  const credential = asRecord(rec?.credential);
  const room = asString(credential?.room) || '';
  const token = asString(credential?.token) || '';
  const expiresAt = asString(credential?.expiresAt) || '';
  return room && token && expiresAt ? { room, token, expiresAt } : null;
}

async function postGateway(
  fetchFn: CloudSyncFetchLike,
  gatewayUrl: string,
  anonKey: string,
  request: CloudSyncGatewayRequest
): Promise<{ ok: boolean; status: number; data: unknown; retryAfterMs?: number }> {
  const response = await fetchFn(gatewayUrl, {
    method: 'POST',
    headers: Object.assign({}, makeHeaders(anonKey), { Accept: 'application/json' }),
    body: JSON.stringify(request),
  });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const retryAfter = response.headers?.get?.('Retry-After');
  const retryAfterSeconds = Number(retryAfter);
  const retryAfterMs =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
      ? Math.ceil(retryAfterSeconds * 1000)
      : undefined;
  return {
    ok: response.ok,
    status: response.status || 0,
    data,
    ...(retryAfterMs != null ? { retryAfterMs } : {}),
  };
}

function readGatewayCode(value: unknown): string {
  const rec = asRecord(value);
  return asString(rec?.code) || '';
}

function readGatewayRetryAfterMs(value: unknown, headerRetryAfterMs?: number): number | undefined {
  if (headerRetryAfterMs != null) return headerRetryAfterMs;
  const rec = asRecord(value);
  const retryAfterSeconds = rec?.retryAfterSeconds;
  return typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
    ? Math.ceil(retryAfterSeconds * 1000)
    : undefined;
}

function readGatewayFailure(response: {
  status: number;
  data: unknown;
  retryAfterMs?: number;
}): CloudSyncGatewayFailure {
  const code = readGatewayCode(response.data);
  if (response.status === 403 && code === 'room_token_expired') {
    return { kind: 'auth-expired', status: 403, code: 'room_token_expired' };
  }
  if (response.status === 410 && code === 'room_expired') {
    return { kind: 'room-expired', status: 410, code: 'room_expired' };
  }
  if (response.status === 403) {
    return { kind: 'auth-invalid', status: 403, ...(code ? { code } : {}) };
  }
  if (response.status === 429) {
    const retryAfterMs = readGatewayRetryAfterMs(response.data, response.retryAfterMs);
    return {
      kind: 'rate-limit',
      status: 429,
      code: 'rate_limit',
      ...(retryAfterMs != null ? { retryAfterMs } : {}),
    };
  }
  return { kind: 'server', status: response.status, ...(code ? { code } : {}) };
}

function readNetworkFailure(error: unknown): CloudSyncGatewayFailure {
  return { kind: 'network', message: readCloudSyncErrorMessage(error) };
}

export async function getGatewayRow(args: {
  fetchFn: CloudSyncFetchLike;
  gatewayUrl: string;
  anonKey: string;
  storeId: string;
  room: string;
  roomToken: string;
}): Promise<CloudSyncGatewayReadResult> {
  try {
    const response = await postGateway(args.fetchFn, args.gatewayUrl, args.anonKey, {
      action: 'read',
      storeId: args.storeId,
      room: args.room,
      roomToken: args.roomToken,
    });
    return response.ok
      ? { ok: true, row: readGatewayRowEnvelope(response.data) }
      : { ok: false, failure: readGatewayFailure(response) };
  } catch (error) {
    _cloudSyncReportNonFatal(null, 'getGatewayRow.fetch', error, { throttleMs: 6000 });
    return { ok: false, failure: readNetworkFailure(error) };
  }
}

export async function writeGatewayRow(args: {
  fetchFn: CloudSyncFetchLike;
  gatewayUrl: string;
  anonKey: string;
  storeId: string;
  room: string;
  roomToken: string;
  payload: CloudSyncPayload;
  expectedRevision: number;
  clientId: string;
}): Promise<CloudSyncUpsertResult> {
  try {
    const response = await postGateway(args.fetchFn, args.gatewayUrl, args.anonKey, {
      action: 'write',
      storeId: args.storeId,
      room: args.room,
      roomToken: args.roomToken,
      payload: args.payload,
      expectedRevision: args.expectedRevision,
      clientId: args.clientId,
    });
    const row = readGatewayRowEnvelope(response.data);
    if (response.ok && row) return { ok: true, row };
    if (response.status === 409 && row) return { ok: false, conflict: true, row };
    return { ok: false, failure: readGatewayFailure(response) };
  } catch (error) {
    _cloudSyncReportNonFatal(null, 'writeGatewayRow.fetch', error, { throttleMs: 6000 });
    return { ok: false, failure: readNetworkFailure(error) };
  }
}

async function issueRoomCredential(args: {
  fetchFn: CloudSyncFetchLike;
  gatewayUrl: string;
  anonKey: string;
  storeId: string;
  action: 'issue-public' | 'create-room' | 'renew-room';
  room?: string;
  roomToken?: string;
}): Promise<CloudSyncCredentialIssueResult> {
  try {
    const request: CloudSyncGatewayRequest =
      args.action === 'renew-room'
        ? {
            action: 'renew-room',
            storeId: args.storeId,
            room: args.room || '',
            roomToken: args.roomToken || '',
          }
        : { action: args.action, storeId: args.storeId };
    const response = await postGateway(args.fetchFn, args.gatewayUrl, args.anonKey, request);
    const credential = response.ok ? readRoomCredential(response.data) : null;
    return credential ? { ok: true, credential } : { ok: false, failure: readGatewayFailure(response) };
  } catch (error) {
    _cloudSyncReportNonFatal(null, `issueRoomCredential.${args.action}`, error, { throttleMs: 6000 });
    return { ok: false, failure: readNetworkFailure(error) };
  }
}

export function issuePublicRoomCredential(
  args: Omit<Parameters<typeof issueRoomCredential>[0], 'action'>
): Promise<CloudSyncCredentialIssueResult> {
  return issueRoomCredential({ ...args, action: 'issue-public' });
}

export function createPrivateRoomCredential(
  args: Omit<Parameters<typeof issueRoomCredential>[0], 'action'>
): Promise<CloudSyncCredentialIssueResult> {
  return issueRoomCredential({ ...args, action: 'create-room' });
}

export function renewPrivateRoomCredential(
  args: Omit<Parameters<typeof issueRoomCredential>[0], 'action'> & {
    room: string;
    roomToken: string;
  }
): Promise<CloudSyncCredentialIssueResult> {
  return issueRoomCredential({ ...args, action: 'renew-room' });
}

export { readCloudSyncPayload, readCloudSyncStateRow };
