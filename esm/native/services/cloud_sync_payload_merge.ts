import type { CloudSyncPayload } from '../../../types';

import { asRecord } from './cloud_sync_support.js';
import { stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';

type MergeResult = { ok: true; payload: CloudSyncPayload } | { ok: false; conflictKeys: string[] };

type MergeValue = { readonly present: false } | { readonly present: true; readonly value: unknown };

const MISSING: MergeValue = Object.freeze({ present: false });
const ENTITY_COLLECTION_KEYS = new Set(['savedModels', 'savedColors']);

function hasOwn(rec: CloudSyncPayload, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(rec, key);
}

function present(value: unknown): MergeValue {
  return { present: true, value };
}

function readField(rec: CloudSyncPayload, key: string): MergeValue {
  return hasOwn(rec, key) ? present(rec[key]) : MISSING;
}

function valuesEqual(left: MergeValue, right: MergeValue): boolean {
  if (!left.present || !right.present) return left.present === right.present;
  return stableSerializeCloudSyncValue(left.value) === stableSerializeCloudSyncValue(right.value);
}

function readEntityId(value: unknown): string {
  const rec = asRecord(value);
  return typeof rec?.id === 'string' ? rec.id.trim() : '';
}

function toEntityMap(candidate: MergeValue): Map<string, unknown> | null {
  if (!candidate.present) return new Map();
  if (!Array.isArray(candidate.value)) return null;
  const out = new Map<string, unknown>();
  for (const entry of candidate.value) {
    const id = readEntityId(entry);
    if (!id || out.has(id)) return null;
    out.set(id, entry);
  }
  return out;
}

function readEntity(map: Map<string, unknown>, id: string): MergeValue {
  return map.has(id) ? present(map.get(id)) : MISSING;
}

function mergeEntityCollection(args: {
  base: MergeValue;
  local: MergeValue;
  remote: MergeValue;
}): unknown[] | null {
  const baseMap = toEntityMap(args.base);
  const localMap = toEntityMap(args.local);
  const remoteMap = toEntityMap(args.remote);
  if (!baseMap || !localMap || !remoteMap) return null;

  const ids = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);
  const merged = new Map<string, unknown>();
  for (const id of ids) {
    const base = readEntity(baseMap, id);
    const local = readEntity(localMap, id);
    const remote = readEntity(remoteMap, id);
    let selected: MergeValue;
    if (valuesEqual(local, base)) selected = remote;
    else if (valuesEqual(remote, base) || valuesEqual(local, remote)) selected = local;
    else return null;
    if (selected.present) merged.set(id, selected.value);
  }

  const orderedIds = [...localMap.keys(), ...Array.from(remoteMap.keys()).filter(id => !localMap.has(id))];
  return orderedIds.flatMap(id => (merged.has(id) ? [merged.get(id)] : []));
}

function applyLocalEntityDelta(args: {
  base: MergeValue;
  local: MergeValue;
  latestRemote: MergeValue;
}): unknown[] | null {
  const baseMap = toEntityMap(args.base);
  const localMap = toEntityMap(args.local);
  const remoteMap = toEntityMap(args.latestRemote);
  if (!baseMap || !localMap || !remoteMap) return null;

  const resolved = new Map(remoteMap);
  for (const id of new Set([...baseMap.keys(), ...localMap.keys()])) {
    const base = readEntity(baseMap, id);
    const local = readEntity(localMap, id);
    if (valuesEqual(base, local)) continue;
    if (local.present) resolved.set(id, local.value);
    else resolved.delete(id);
  }

  const orderedIds = [...remoteMap.keys(), ...Array.from(localMap.keys()).filter(id => !remoteMap.has(id))];
  return orderedIds.flatMap(id => (resolved.has(id) ? [resolved.get(id)] : []));
}

function mergeField(args: {
  key: string;
  base: MergeValue;
  local: MergeValue;
  remote: MergeValue;
}): { ok: true; value: MergeValue } | { ok: false } {
  if (valuesEqual(args.local, args.base)) return { ok: true, value: args.remote };
  if (valuesEqual(args.remote, args.base) || valuesEqual(args.local, args.remote)) {
    return { ok: true, value: args.local };
  }
  if (ENTITY_COLLECTION_KEYS.has(args.key)) {
    const value = mergeEntityCollection(args);
    if (value) return { ok: true, value: present(value) };
  }
  return { ok: false };
}

export function mergeCloudSyncPayloads(args: {
  base: CloudSyncPayload;
  local: CloudSyncPayload;
  remote: CloudSyncPayload;
}): MergeResult {
  const keys = new Set([...Object.keys(args.base), ...Object.keys(args.local), ...Object.keys(args.remote)]);
  const payload: CloudSyncPayload = {};
  const conflictKeys: string[] = [];

  for (const key of Array.from(keys).sort()) {
    const result = mergeField({
      key,
      base: readField(args.base, key),
      local: readField(args.local, key),
      remote: readField(args.remote, key),
    });
    if (!result.ok) {
      conflictKeys.push(key);
      continue;
    }
    if (result.value.present) payload[key] = result.value.value;
  }

  return conflictKeys.length ? { ok: false, conflictKeys } : { ok: true, payload };
}

export function rebaseCloudSyncKeepLocal(args: {
  conflictKeys: readonly string[];
  base: CloudSyncPayload;
  local: CloudSyncPayload;
  latestRemote: CloudSyncPayload;
}): MergeResult {
  const forcedLocalKeys = new Set(args.conflictKeys);
  const keys = new Set([
    ...Object.keys(args.base),
    ...Object.keys(args.local),
    ...Object.keys(args.latestRemote),
  ]);
  const payload: CloudSyncPayload = {};
  const conflictKeys: string[] = [];
  for (const key of Array.from(keys).sort()) {
    const local = readField(args.local, key);
    const base = readField(args.base, key);
    const latestRemote = readField(args.latestRemote, key);
    if (forcedLocalKeys.has(key)) {
      if (ENTITY_COLLECTION_KEYS.has(key)) {
        const resolved = applyLocalEntityDelta({ base, local, latestRemote });
        if (resolved) {
          payload[key] = resolved;
          continue;
        }
      }
      if (local.present) payload[key] = local.value;
      continue;
    }
    const merged = mergeField({ key, base, local, remote: latestRemote });
    if (!merged.ok) {
      conflictKeys.push(key);
      continue;
    }
    if (merged.value.present) {
      payload[key] = merged.value.value;
    }
  }
  return conflictKeys.length ? { ok: false, conflictKeys } : { ok: true, payload };
}
