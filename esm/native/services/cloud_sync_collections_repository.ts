import type {
  CloudCollectionsCommitResult,
  CloudCollectionsEnvelope,
  CloudCollectionsMutation,
  CloudCollectionsReadResult,
  CloudCollectionsRepositoryLike,
  CloudSyncLocalCollections,
  CloudSyncOrderList,
  SavedColorLike,
  SavedModelLike,
} from '../../../types';

import { normalizeList, normalizeModelList, normalizeSavedColorsList } from './cloud_sync_support_shared.js';
import type { StorageLike } from './cloud_sync_support_storage_shared.js';

const CLOUD_COLLECTIONS_SCHEMA_VERSION = 1 as const;
const repositoryCache = new WeakMap<object, Map<string, CloudCollectionsRepository>>();

export type CloudCollectionsRepositoryKeys = {
  models: string;
  colors: string;
  colorOrder: string;
  presetOrder: string;
  hiddenPresets: string;
};

export interface CloudCollectionsRepository extends CloudCollectionsRepositoryLike {}

type StoredEnvelopeValue =
  { kind: 'missing' } | { kind: 'value'; value: unknown } | { kind: 'corrupt'; raw: string };

export class CloudCollectionsCorruptionError extends Error {
  readonly result: Extract<CloudCollectionsReadResult, { ok: false }>;

  constructor(result: Extract<CloudCollectionsReadResult, { ok: false }>) {
    super(`Cloud collections envelope is corrupt for ${result.corruption.envelopeKey}`);
    this.name = 'CloudCollectionsCorruptionError';
    this.result = result;
  }
}

function readStorageEntry(storage: StorageLike, key: string): StoredEnvelopeValue {
  if (typeof storage.getString === 'function') {
    const raw = storage.getString(key);
    if (typeof raw !== 'string' || !raw) return { kind: 'missing' };
    try {
      return { kind: 'value', value: JSON.parse(raw) };
    } catch {
      return { kind: 'corrupt', raw };
    }
  }
  if (typeof storage.getJSON === 'function') {
    const missing = Object.freeze({ __cloudCollectionsMissing: true });
    const value = storage.getJSON(key, missing);
    return value === missing ? { kind: 'missing' } : { kind: 'value', value };
  }
  return { kind: 'missing' };
}

function readStorageValue(storage: StorageLike, key: string): unknown {
  const entry = readStorageEntry(storage, key);
  return entry.kind === 'value' ? entry.value : null;
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

function applyMutation(
  current: CloudCollectionsEnvelope,
  mutation: CloudCollectionsMutation
): CloudSyncLocalCollections {
  return {
    m: Object.prototype.hasOwnProperty.call(mutation, 'savedModels')
      ? normalizeModelList(mutation.savedModels)
      : current.savedModels,
    c: Object.prototype.hasOwnProperty.call(mutation, 'savedColors')
      ? normalizeSavedColorsList(mutation.savedColors)
      : current.savedColors,
    o: Object.prototype.hasOwnProperty.call(mutation, 'colorOrder')
      ? normalizeList(mutation.colorOrder)
      : current.colorOrder,
    p: Object.prototype.hasOwnProperty.call(mutation, 'presetOrder')
      ? normalizeList(mutation.presetOrder)
      : current.presetOrder,
    h: Object.prototype.hasOwnProperty.call(mutation, 'hiddenPresets')
      ? normalizeList(mutation.hiddenPresets)
      : current.hiddenPresets,
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

function perKeyEntries(
  keys: CloudCollectionsRepositoryKeys,
  envelope: CloudCollectionsEnvelope
): Array<[string, unknown]> {
  return [
    [keys.models, envelope.savedModels],
    [keys.colors, envelope.savedColors],
    [keys.colorOrder, envelope.colorOrder],
    [keys.presetOrder, envelope.presetOrder],
    [keys.hiddenPresets, envelope.hiddenPresets],
  ];
}

function repositoryCacheKey(keys: CloudCollectionsRepositoryKeys): string {
  return `${keys.models}:cloudCollections:v1`;
}

function mirrorKeysForMutation(
  keys: CloudCollectionsRepositoryKeys,
  mutation: CloudCollectionsMutation
): Set<string> {
  const out = new Set<string>();
  if (Object.prototype.hasOwnProperty.call(mutation, 'savedModels')) out.add(keys.models);
  if (Object.prototype.hasOwnProperty.call(mutation, 'savedColors')) out.add(keys.colors);
  if (Object.prototype.hasOwnProperty.call(mutation, 'colorOrder')) out.add(keys.colorOrder);
  if (Object.prototype.hasOwnProperty.call(mutation, 'presetOrder')) out.add(keys.presetOrder);
  if (Object.prototype.hasOwnProperty.call(mutation, 'hiddenPresets')) out.add(keys.hiddenPresets);
  return out;
}

export function createCloudCollectionsRepository(args: {
  storage: StorageLike;
  keys: CloudCollectionsRepositoryKeys;
}): CloudCollectionsRepository {
  const { storage, keys } = args;
  const envelopeKey = repositoryCacheKey(keys);
  const storageObject = storage as object;
  const cached = repositoryCache.get(storageObject)?.get(envelopeKey);
  if (cached) return cached;

  const listeners = new Set<(envelope: CloudCollectionsEnvelope) => void>();
  const pendingMirrorKeys = new Set<string>();
  const rawBackupKey = `${envelopeKey}:corrupt-backup`;

  const readStoredEnvelopeResult = (): CloudCollectionsReadResult | null => {
    const entry = readStorageEntry(storage, envelopeKey);
    if (entry.kind === 'missing') return null;
    const envelope = entry.kind === 'value' ? normalizeEnvelope(entry.value) : null;
    if (envelope) return { ok: true, envelope };
    return {
      ok: false,
      corruption: {
        kind: 'corrupt',
        envelopeKey,
        rawBackupKey,
        repairAvailable: true,
      },
    };
  };

  const readEnvelopeWithoutRepair = (): CloudCollectionsEnvelope => {
    const stored = readStoredEnvelopeResult();
    if (stored?.ok === false) throw new CloudCollectionsCorruptionError(stored);
    if (stored?.ok === true) return stored.envelope;
    const migrated = buildEnvelope(readPerKeyCollections(storage, keys), 0);
    writeStorageValue(storage, envelopeKey, migrated);
    return migrated;
  };

  const mirrorEnvelope = (envelope: CloudCollectionsEnvelope, onlyKeys?: ReadonlySet<string>): string[] => {
    const failures: string[] = [];
    for (const [key, value] of perKeyEntries(keys, envelope)) {
      if (onlyKeys && !onlyKeys.has(key)) continue;
      try {
        writeStorageValue(storage, key, value);
        pendingMirrorKeys.delete(key);
      } catch {
        pendingMirrorKeys.add(key);
        failures.push(key);
      }
    }
    return failures;
  };

  const notifyCommitted = (envelope: CloudCollectionsEnvelope): void => {
    const committedListeners = Array.from(listeners);
    for (const listener of committedListeners) listener(envelope);
  };

  const repairMirrors = (): string[] => {
    if (!pendingMirrorKeys.size) return [];
    return mirrorEnvelope(readEnvelopeWithoutRepair(), new Set(pendingMirrorKeys));
  };

  const commitEnvelope = (
    envelope: CloudCollectionsEnvelope,
    mirrorKeys?: ReadonlySet<string>
  ): CloudCollectionsCommitResult => {
    writeStorageValue(storage, envelopeKey, envelope);
    const mirrorFailures = mirrorEnvelope(envelope, mirrorKeys);
    notifyCommitted(envelope);
    return { envelope, mirrorFailures };
  };

  const repository: CloudCollectionsRepository = {
    envelopeKey,
    read: (): CloudSyncLocalCollections => toCollections(repository.readEnvelope()),
    readEnvelope(): CloudCollectionsEnvelope {
      const envelope = readEnvelopeWithoutRepair();
      repairMirrors();
      return envelope;
    },
    readResult(): CloudCollectionsReadResult {
      const stored = readStoredEnvelopeResult();
      if (stored) return stored;
      try {
        return { ok: true, envelope: readEnvelopeWithoutRepair() };
      } catch (error) {
        if (error instanceof CloudCollectionsCorruptionError) return error.result;
        throw error;
      }
    },
    update(mutation: CloudCollectionsMutation): CloudCollectionsCommitResult {
      const current = readEnvelopeWithoutRepair();
      return commitEnvelope(
        buildEnvelope(applyMutation(current, mutation), current.revision + 1),
        mirrorKeysForMutation(keys, mutation)
      );
    },
    commit(next: CloudSyncLocalCollections): CloudCollectionsCommitResult {
      const current = readEnvelopeWithoutRepair();
      return commitEnvelope(buildEnvelope(next, current.revision + 1));
    },
    repairMirrors,
    backupCorruptEnvelope(): string {
      const entry = readStorageEntry(storage, envelopeKey);
      if (entry.kind !== 'corrupt') {
        throw new Error(`Cloud collections envelope is not corrupt for ${envelopeKey}`);
      }
      writeStorageValue(storage, rawBackupKey, { raw: entry.raw, capturedAt: Date.now() });
      return rawBackupKey;
    },
    resetCorruptEnvelope(next: CloudSyncLocalCollections): CloudCollectionsCommitResult {
      const stored = readStoredEnvelopeResult();
      if (stored?.ok !== false) {
        throw new Error(`Cloud collections corruption reset requires a corrupt envelope for ${envelopeKey}`);
      }
      return commitEnvelope(buildEnvelope(next, 0));
    },
    subscribe(listener: (envelope: CloudCollectionsEnvelope) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const byKey = repositoryCache.get(storageObject) || new Map<string, CloudCollectionsRepository>();
  byKey.set(envelopeKey, repository);
  repositoryCache.set(storageObject, byKey);
  return repository;
}
