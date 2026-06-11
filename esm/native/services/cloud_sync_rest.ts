// Cloud Sync REST helpers.
//
// Keeps the owner service focused on sync lifecycle/orchestration.

import type {
  CloudSyncFetchLike,
  CloudSyncOrderList,
  CloudSyncPayload,
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
} from './cloud_sync_support.js';
import { makeHeaders } from './cloud_sync_config.js';

function readOrderList(value: unknown): CloudSyncOrderList | null {
  return Array.isArray(value) ? normalizeList(value) : null;
}

function readCloudSyncPayload(v: unknown): CloudSyncPayload {
  const rec = asRecord(v);
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
  for (const [key, value] of Object.entries(rec)) {
    if (key in next) continue;
    next[key] = value;
  }
  return next;
}

function readCloudSyncStateRow(v: unknown): CloudSyncStateRow | null {
  const rec = asRecord(v);
  if (!rec) return null;
  const room = asString(rec.room) || '';
  const updated_at = asString(rec.updated_at) || '';
  if (!room || !updated_at) return null;
  return { room, payload: readCloudSyncPayload(rec.payload), updated_at };
}

function readCloudSyncStateRowResult(v: unknown): CloudSyncStateRow | null {
  if (Array.isArray(v)) {
    return v.length ? readCloudSyncStateRow(v[0]) : null;
  }
  return readCloudSyncStateRow(v);
}

async function getRow(
  fetchFn: CloudSyncFetchLike,
  restUrl: string,
  anonKey: string,
  room: string
): Promise<CloudSyncStateRow | null> {
  try {
    const url = `${restUrl}?select=room,payload,updated_at&room=eq.${encodeURIComponent(room)}&limit=1`;
    const r = await fetchFn(url, {
      method: 'GET',
      headers: Object.assign({}, makeHeaders(anonKey), {
        Accept: 'application/json',
      }),
    });
    if (!r.ok) {
      if (r.status === 406) return null;
      return null;
    }
    const data = await r.json();
    return readCloudSyncStateRowResult(data);
  } catch (e) {
    _cloudSyncReportNonFatal(null, 'getRow.fetch', e, { throttleMs: 6000 });
    return null;
  }
}

async function upsertRow(
  fetchFn: CloudSyncFetchLike,
  restUrl: string,
  anonKey: string,
  room: string,
  payload: CloudSyncPayload,
  opts?: { returnRepresentation?: boolean }
): Promise<CloudSyncUpsertResult> {
  try {
    const url = `${restUrl}?on_conflict=room`;
    const body = JSON.stringify([{ room, payload }]);
    const returnRep = !!(opts && opts.returnRepresentation);

    const r = await fetchFn(url, {
      method: 'POST',
      headers: Object.assign({}, makeHeaders(anonKey), {
        Prefer: `resolution=merge-duplicates,return=${returnRep ? 'representation' : 'minimal'}`,
      }),
      body,
    });

    if (!r.ok) return { ok: false };

    if (!returnRep) return { ok: true };

    let data: unknown = null;
    try {
      data = await r.json();
    } catch {
      data = null;
    }

    // PostgREST typically returns an array for bulk upserts.
    const row = readCloudSyncStateRowResult(data);
    return { ok: true, row };
  } catch (e) {
    _cloudSyncReportNonFatal(null, 'upsertRow.fetch', e, { throttleMs: 6000 });
    return { ok: false };
  }
}

export { getRow, upsertRow };
