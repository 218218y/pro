import type {
  CloudCollectionsEnvelope,
  CloudSyncLocalCollections,
  CloudSyncOrderList,
  SavedColorLike,
  SavedModelLike,
} from '../../../types';

import {
  normalizeList,
  normalizeModelList,
  normalizeSavedColorsList,
  safeParseJSON,
} from './cloud_sync_support_shared.js';
import type { StorageLike } from './cloud_sync_support_storage_shared.js';

const CLOUD_COLLECTIONS_SCHEMA_VERSION = 1 as const;

export type CloudCollectionsRepositoryKeys = {
  models: string;
  colors: string;
  colorOrder: string;
  presetOrder: string;
  hiddenPresets: string;
};

export type CloudCollectionsCommitResult = {
  envelope: CloudCollectionsEnvelope;
  mirrorFailures: string[];
};

export interface CloudCollectionsRepository {
  readonly envelopeKey: string;
  read(): CloudSyncLocalCollections;
  readEnvelope(): CloudCollectionsEnvelope;
  commit(next: CloudSyncLocalCollections): CloudCollectionsCommitResult;
  commitPerKeySnapshot(): CloudCollectionsEnvelope;
}

function readStorageValue(storage: StorageLike, key: string): unknown {
  if (typeof storage.getString === 'function') {
    const raw = storage.getString(key);
    return typeof raw === 'string' && raw ? safeParseJSON(raw) : null;
  }
  if (typeof storage.getJSON === 'function') return storage.getJSON(key, null);
  return null;
}

function writeStorageValue(storage: StorageLike, key: string, value: unknown): void {
  const ok =
    typeof storage.setString === 'function'
      ? storage.setString(key, JSON.stringify(value))
      : typeof storage.setJSON === 'function'
        ? storage.setJSON(key, value)
        : false;
  if (!ok) throw new Error(`Cloud collections atomic commit failed for ${key}`);
}

function normalizeRevision(value: unknown): number {
  const revision = Number(value);
  return Number.isFinite(revision) && revision >= 0 ? Math.floor(revision) : 0;
}

function buildEnvelope(collections: CloudSyncLocalCollections, revision: number): CloudCollectionsEnvelope {
  return {
    schemaVersion: CLOUD_COLLECTIONS_SCHEMA_VERSION,
    revision: normalizeRevision(revision),
    savedModels: normalizeModelList(collections.m),
    savedColors: normalizeSavedColorsList(collections.c),
    colorOrder: normalizeList(collections.o),
    presetOrder: normalizeList(collections.p),
    hiddenPresets: normalizeList(collections.h),
  };
}

function normalizeEnvelope(value: unknown): CloudCollectionsEnvelope | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== CLOUD_COLLECTIONS_SCHEMA_VERSION) return null;
  if (!Number.isFinite(Number(record.revision)) || Number(record.revision) < 0) return null;
  return buildEnvelope(
    {
      m: normalizeModelList(record.savedModels),
      c: normalizeSavedColorsList(record.savedColors),
      o: normalizeList(record.colorOrder),
      p: normalizeList(record.presetOrder),
      h: normalizeList(record.hiddenPresets),
    },
    Number(record.revision)
  );
}

function toCollections(envelope: CloudCollectionsEnvelope): CloudSyncLocalCollections {
  return {
    m: envelope.savedModels.slice() as SavedModelLike[],
    c: envelope.savedColors.slice() as SavedColorLike[],
    o: envelope.colorOrder.slice() as CloudSyncOrderList,
    p: envelope.presetOrder.slice() as CloudSyncOrderList,
    h: envelope.hiddenPresets.slice() as CloudSyncOrderList,
  };
}

function readPerKeyCollections(
  storage: StorageLike,
  keys: CloudCollectionsRepositoryKeys
): CloudSyncLocalCollections {
  return {
    m: normalizeModelList(readStorageValue(storage, keys.models)),
    c: normalizeSavedColorsList(readStorageValue(storage, keys.colors)),
    o: normalizeList(readStorageValue(storage, keys.colorOrder)),
    p: normalizeList(readStorageValue(storage, keys.presetOrder)),
    h: normalizeList(readStorageValue(storage, keys.hiddenPresets)),
  };
}

function mirrorEnvelopeToPerKeyStorage(
  storage: StorageLike,
  keys: CloudCollectionsRepositoryKeys,
  envelope: CloudCollectionsEnvelope
): string[] {
  const entries: Array<[string, unknown]> = [
    [keys.models, envelope.savedModels],
    [keys.colors, envelope.savedColors],
    [keys.colorOrder, envelope.colorOrder],
    [keys.presetOrder, envelope.presetOrder],
    [keys.hiddenPresets, envelope.hiddenPresets],
  ];
  const failures: string[] = [];
  for (const [key, value] of entries) {
    try {
      writeStorageValue(storage, key, value);
    } catch {
      failures.push(key);
    }
  }
  return failures;
}

export function createCloudCollectionsRepository(args: {
  storage: StorageLike;
  keys: CloudCollectionsRepositoryKeys;
}): CloudCollectionsRepository {
  const { storage, keys } = args;
  const envelopeKey = `${keys.models}:cloudCollections:v1`;

  const readStoredEnvelope = (): CloudCollectionsEnvelope | null => {
    const raw = readStorageValue(storage, envelopeKey);
    if (raw === null) return null;
    const envelope = normalizeEnvelope(raw);
    if (!envelope) throw new Error(`Cloud collections envelope is invalid for ${envelopeKey}`);
    return envelope;
  };

  const readEnvelope = (): CloudCollectionsEnvelope => {
    const stored = readStoredEnvelope();
    if (stored) return stored;
    const migrated = buildEnvelope(readPerKeyCollections(storage, keys), 0);
    writeStorageValue(storage, envelopeKey, migrated);
    return migrated;
  };

  return {
    envelopeKey,
    read: (): CloudSyncLocalCollections => toCollections(readEnvelope()),
    readEnvelope,
    commit(next: CloudSyncLocalCollections): CloudCollectionsCommitResult {
      const current = readEnvelope();
      const envelope = buildEnvelope(next, current.revision + 1);
      writeStorageValue(storage, envelopeKey, envelope);
      return {
        envelope,
        mirrorFailures: mirrorEnvelopeToPerKeyStorage(storage, keys, envelope),
      };
    },
    commitPerKeySnapshot(): CloudCollectionsEnvelope {
      const current = readEnvelope();
      const envelope = buildEnvelope(readPerKeyCollections(storage, keys), current.revision + 1);
      writeStorageValue(storage, envelopeKey, envelope);
      return envelope;
    },
  };
}
