import type {
  CloudSyncConflictFieldProjection,
  CloudSyncConflictRecord,
  CloudSyncConflictValue,
  CloudSyncPayload,
} from '../../../types';

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

function toConflictValue(value: MergeValue): CloudSyncConflictValue {
  return value.present ? { present: true, value: value.value } : { present: false };
}

function fromConflictValue(value: CloudSyncConflictValue): MergeValue {
  return value.present ? present(value.value) : MISSING;
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

export function buildCloudSyncConflictFields(args: {
  conflictKeys: readonly string[];
  base: CloudSyncPayload;
  local: CloudSyncPayload;
  remote: CloudSyncPayload;
}): Record<string, CloudSyncConflictFieldProjection> {
  const fields: Record<string, CloudSyncConflictFieldProjection> = {};
  for (const key of [...new Set(args.conflictKeys)].sort()) {
    const base = readField(args.base, key);
    const local = readField(args.local, key);
    const remote = readField(args.remote, key);
    if (ENTITY_COLLECTION_KEYS.has(key)) {
      const baseMap = toEntityMap(base);
      const localMap = toEntityMap(local);
      const remoteMap = toEntityMap(remote);
      if (baseMap && localMap && remoteMap) {
        const entities = Array.from(new Set([...baseMap.keys(), ...localMap.keys()]))
          .sort()
          .filter(id => !valuesEqual(readEntity(baseMap, id), readEntity(localMap, id)))
          .map(id => ({
            id,
            base: toConflictValue(readEntity(baseMap, id)),
            local: toConflictValue(readEntity(localMap, id)),
            remote: toConflictValue(readEntity(remoteMap, id)),
          }));
        fields[key] = { kind: 'entities', entities };
        continue;
      }
    }
    fields[key] = {
      kind: 'field',
      base: toConflictValue(base),
      local: toConflictValue(local),
      remote: toConflictValue(remote),
    };
  }
  return fields;
}

export function projectCloudSyncConflictRemotePayload(conflict: CloudSyncConflictRecord): CloudSyncPayload {
  const payload: CloudSyncPayload = {};
  for (const [key, field] of Object.entries(conflict.fields)) {
    if (field.kind === 'field') {
      const remote = fromConflictValue(field.remote);
      if (remote.present) payload[key] = remote.value;
      continue;
    }
    payload[key] = field.entities.flatMap(entity => (entity.remote.present ? [entity.remote.value] : []));
  }
  return payload;
}

export function rebaseCloudSyncKeepLocal(args: {
  conflict: CloudSyncConflictRecord;
  currentLocal: CloudSyncPayload;
  latestRemote: CloudSyncPayload;
  transientBase?: CloudSyncPayload | null;
}): MergeResult {
  if (!args.conflict.projectionAvailable) {
    return { ok: false, conflictKeys: args.conflict.keys.slice() };
  }
  const payload: CloudSyncPayload = { ...args.latestRemote };
  const conflictKeys: string[] = [];
  for (const key of args.conflict.keys) {
    const field = args.conflict.fields[key];
    if (!field) {
      conflictKeys.push(key);
      continue;
    }
    const currentLocal = readField(args.currentLocal, key);
    if (field.kind === 'field') {
      if (currentLocal.present) payload[key] = currentLocal.value;
      else delete payload[key];
      continue;
    }
    const remoteMap = toEntityMap(readField(args.latestRemote, key));
    const currentLocalMap = toEntityMap(currentLocal);
    if (!remoteMap || !currentLocalMap) {
      conflictKeys.push(key);
      continue;
    }
    const resolved = new Map(remoteMap);
    for (const entity of field.entities) {
      const local = readEntity(currentLocalMap, entity.id);
      if (local.present) resolved.set(entity.id, local.value);
      else resolved.delete(entity.id);
    }
    const order = [
      ...remoteMap.keys(),
      ...Array.from(currentLocalMap.keys()).filter(id => !remoteMap.has(id) && resolved.has(id)),
    ];
    payload[key] = order.flatMap(id => (resolved.has(id) ? [resolved.get(id)] : []));
  }
  if (args.transientBase) {
    const forced = new Set(args.conflict.keys);
    const keys = new Set([
      ...Object.keys(args.transientBase),
      ...Object.keys(args.currentLocal),
      ...Object.keys(args.latestRemote),
    ]);
    for (const key of keys) {
      if (forced.has(key)) continue;
      const merged = mergeField({
        key,
        base: readField(args.transientBase, key),
        local: readField(args.currentLocal, key),
        remote: readField(args.latestRemote, key),
      });
      if (!merged.ok) {
        conflictKeys.push(key);
      } else if (merged.value.present) {
        payload[key] = merged.value.value;
      } else {
        delete payload[key];
      }
    }
  }
  return conflictKeys.length ? { ok: false, conflictKeys } : { ok: true, payload };
}
