import type {
  CloudCollectionsEnvelope,
  CloudSyncLocalCollections,
  CloudSyncOrderList,
  SavedColorLike,
} from '../../../types';
import { savedModelCodec } from './saved_model_codec_access.js';
import { hashString32, stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';
import { normalizeList, normalizeSavedColorsList } from './cloud_sync_support_shared_core.js';

export const CLOUD_COLLECTIONS_SCHEMA_VERSION = 1 as const;

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStoredColor(value: unknown): value is SavedColorLike {
  if (!isRecordValue(value)) return false;
  if (typeof value.id !== 'string' || !value.id.trim()) return false;
  if (typeof value.name !== 'undefined' && typeof value.name !== 'string') return false;
  if (typeof value.type !== 'undefined' && typeof value.type !== 'string') return false;
  if (typeof value.value !== 'undefined' && typeof value.value !== 'string') return false;
  if (typeof value.locked !== 'undefined' && typeof value.locked !== 'boolean') return false;
  return true;
}

function isStoredOrderEntry(value: unknown): value is CloudSyncOrderList[number] {
  return value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

export function normalizeCloudCollectionsRevision(value: unknown): number {
  const revision = Number(value);
  return Number.isFinite(revision) && revision >= 0 ? Math.floor(revision) : 0;
}

export function buildCloudCollectionsEnvelope(
  collections: CloudSyncLocalCollections,
  revision: number
): CloudCollectionsEnvelope {
  return {
    schemaVersion: CLOUD_COLLECTIONS_SCHEMA_VERSION,
    revision: normalizeCloudCollectionsRevision(revision),
    savedModels: collections.m.filter(savedModelCodec.validate).map(model => savedModelCodec.clone(model)),
    savedColors: normalizeSavedColorsList(collections.c).filter(isStoredColor),
    colorOrder: normalizeList(collections.o).filter(isStoredOrderEntry),
    presetOrder: normalizeList(collections.p).filter(isStoredOrderEntry),
    hiddenPresets: normalizeList(collections.h).filter(isStoredOrderEntry),
  };
}

export function validateCloudCollectionsEnvelope(value: unknown): value is CloudCollectionsEnvelope {
  if (!isRecordValue(value)) return false;
  if (value.schemaVersion !== CLOUD_COLLECTIONS_SCHEMA_VERSION) return false;
  if (typeof value.revision !== 'number' || !Number.isInteger(value.revision) || value.revision < 0) {
    return false;
  }
  if (
    !Array.isArray(value.savedModels) ||
    !Array.isArray(value.savedColors) ||
    !Array.isArray(value.colorOrder) ||
    !Array.isArray(value.presetOrder) ||
    !Array.isArray(value.hiddenPresets)
  ) {
    return false;
  }
  return (
    value.savedModels.every(savedModelCodec.validate) &&
    value.savedColors.every(isStoredColor) &&
    value.colorOrder.every(isStoredOrderEntry) &&
    value.presetOrder.every(isStoredOrderEntry) &&
    value.hiddenPresets.every(isStoredOrderEntry)
  );
}

function cloneValidatedEnvelope(value: CloudCollectionsEnvelope): CloudCollectionsEnvelope {
  return {
    schemaVersion: CLOUD_COLLECTIONS_SCHEMA_VERSION,
    revision: value.revision,
    savedModels: value.savedModels.map(model => savedModelCodec.clone(model)),
    savedColors: JSON.parse(stableSerializeCloudSyncValue(value.savedColors)),
    colorOrder: value.colorOrder.slice(),
    presetOrder: value.presetOrder.slice(),
    hiddenPresets: value.hiddenPresets.slice(),
  };
}

function normalizeEnvelope(value: unknown): CloudCollectionsEnvelope | null {
  if (!validateCloudCollectionsEnvelope(value)) return null;
  return {
    schemaVersion: CLOUD_COLLECTIONS_SCHEMA_VERSION,
    revision: value.revision,
    savedModels: value.savedModels.map(model => savedModelCodec.clone(model)),
    savedColors: normalizeSavedColorsList(value.savedColors).filter(isStoredColor),
    colorOrder: normalizeList(value.colorOrder).filter(isStoredOrderEntry),
    presetOrder: normalizeList(value.presetOrder).filter(isStoredOrderEntry),
    hiddenPresets: normalizeList(value.hiddenPresets).filter(isStoredOrderEntry),
  };
}

export function parseCloudCollectionsEnvelope(
  value: unknown
): { ok: true; envelope: CloudCollectionsEnvelope } | { ok: false; reason: 'schema' | 'shape' } {
  if (!isRecordValue(value)) return { ok: false, reason: 'shape' };
  if (value.schemaVersion !== CLOUD_COLLECTIONS_SCHEMA_VERSION) return { ok: false, reason: 'schema' };
  const normalized = normalizeEnvelope(value);
  return normalized ? { ok: true, envelope: normalized } : { ok: false, reason: 'shape' };
}

export function toCloudSyncLocalCollections(envelope: CloudCollectionsEnvelope): CloudSyncLocalCollections {
  return {
    m: envelope.savedModels.map(model => savedModelCodec.clone(model)),
    c: JSON.parse(stableSerializeCloudSyncValue(envelope.savedColors)),
    o: envelope.colorOrder.slice(),
    p: envelope.presetOrder.slice(),
    h: envelope.hiddenPresets.slice(),
  };
}

export function fingerprintCloudCollectionsPayload(
  value: CloudCollectionsEnvelope | CloudSyncLocalCollections
): string {
  const collections = 'schemaVersion' in value ? toCloudSyncLocalCollections(value) : value;
  return hashString32(
    stableSerializeCloudSyncValue({
      savedModels: collections.m,
      savedColors: collections.c,
      colorOrder: collections.o,
      presetOrder: collections.p,
      hiddenPresets: collections.h,
    })
  );
}

export const cloudCollectionsCodec = Object.freeze({
  validate: validateCloudCollectionsEnvelope,
  normalize: normalizeEnvelope,
  clone: cloneValidatedEnvelope,
  serialize(value: CloudCollectionsEnvelope): string {
    return stableSerializeCloudSyncValue(value);
  },
  fingerprint(value: CloudCollectionsEnvelope): string {
    return hashString32(stableSerializeCloudSyncValue(value));
  },
});
