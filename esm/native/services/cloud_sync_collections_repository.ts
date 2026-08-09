import type {
  CloudCollectionsCommitResult,
  CloudCollectionsEnvelope,
  CloudCollectionsInitializationResult,
  CloudCollectionsMutation,
  CloudCollectionsMutationLockLike,
  CloudCollectionsMutator,
  CloudCollectionsReadResult,
  CloudCollectionsRepositoryLike,
  CloudSyncLocalCollections,
} from '../../../types';

import {
  buildCloudCollectionsEnvelope,
  cloudCollectionsCodec,
  fingerprintCloudCollectionsPayload,
  normalizeCloudCollectionsRevision,
  parseCloudCollectionsEnvelope,
  toCloudSyncLocalCollections,
} from './cloud_collections_codec.js';
import { normalizeList, normalizeModelList, normalizeSavedColorsList } from './cloud_sync_support_shared.js';
import { hashString32, stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';
import type { StorageLike } from './cloud_sync_support_storage_shared.js';

const repositoryCache = new WeakMap<object, Map<string, CloudCollectionsRepository>>();

export class CloudCollectionsMutationLockUnavailableError extends Error {
  constructor(envelopeKey: string) {
    super(`Cloud collections mutation requires cross-tab locking for ${envelopeKey}`);
    this.name = 'CloudCollectionsMutationLockUnavailableError';
  }
}

export function createInProcessCloudCollectionsMutationLock(): CloudCollectionsMutationLockLike {
  const tails = new Map<string, Promise<void>>();
  return {
    isolation: 'process',
    async runExclusive<T>(name: string, operation: () => Promise<T> | T): Promise<T> {
      const previous = tails.get(name) || Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>(resolve => {
        release = resolve;
      });
      tails.set(name, current);
      await previous.catch(() => undefined);
      try {
        return await operation();
      } finally {
        release();
        if (tails.get(name) === current) tails.delete(name);
      }
    },
  };
}

export function createUnavailableCloudCollectionsMutationLock(): CloudCollectionsMutationLockLike {
  return {
    isolation: 'unavailable',
    runExclusive<T>(name: string): Promise<T> {
      return Promise.reject(new CloudCollectionsMutationLockUnavailableError(name));
    },
  };
}

export type CloudCollectionsRepositoryKeys = {
  models: string;
  colors: string;
  colorOrder: string;
  presetOrder: string;
  hiddenPresets: string;
};

export interface CloudCollectionsRepository extends CloudCollectionsRepositoryLike {}

type StoredEnvelopeValue =
  { kind: 'missing' } | { kind: 'value'; value: unknown; raw: string } | { kind: 'corrupt'; raw: string };

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
      return { kind: 'value', value: JSON.parse(raw), raw };
    } catch {
      return { kind: 'corrupt', raw };
    }
  }
  if (typeof storage.getJSON === 'function') {
    const missing = Object.freeze({ __cloudCollectionsMissing: true });
    const value = storage.getJSON(key, missing);
    if (value === missing) return { kind: 'missing' };
    let raw = '';
    try {
      raw = JSON.stringify(value);
    } catch {
      raw = '[unserializable storage value]';
    }
    return { kind: 'value', value, raw };
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

function writeCloudCollectionsEnvelope(
  storage: StorageLike,
  key: string,
  envelope: CloudCollectionsEnvelope
): void {
  const ok =
    typeof storage.setString === 'function'
      ? storage.setString(key, cloudCollectionsCodec.serialize(envelope))
      : typeof storage.setJSON === 'function'
        ? storage.setJSON(key, cloudCollectionsCodec.clone(envelope))
        : false;
  if (!ok) throw new Error(`Cloud collections atomic commit failed for ${key}`);
}

function sameCollections(current: CloudCollectionsEnvelope, next: CloudSyncLocalCollections): boolean {
  return fingerprintCloudCollectionsPayload(current) === fingerprintCloudCollectionsPayload(next);
}

function toCollections(envelope: CloudCollectionsEnvelope): CloudSyncLocalCollections {
  return toCloudSyncLocalCollections(envelope);
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
  mutationLock?: CloudCollectionsMutationLockLike;
  reportObserverFailure?: (error: unknown, observerIndex: number) => void;
}): CloudCollectionsRepository {
  const { storage, keys, reportObserverFailure } = args;
  const envelopeKey = repositoryCacheKey(keys);
  const storageObject = storage as object;
  const cached = repositoryCache.get(storageObject)?.get(envelopeKey);
  if (cached) {
    if (args.mutationLock && cached.mutationIsolation !== args.mutationLock.isolation) {
      throw new Error(
        `Cloud collections repository lock isolation is already ${cached.mutationIsolation} for ${envelopeKey}`
      );
    }
    return cached;
  }

  const listeners = new Set<(envelope: CloudCollectionsEnvelope) => void>();
  const pendingMirrorKeys = new Set<string>();
  const rawBackupKey = `${envelopeKey}:corrupt-backup`;
  const mutationLock = args.mutationLock || createInProcessCloudCollectionsMutationLock();
  const mutationLockName = `wardrobe-pro:${envelopeKey}:mutation`;

  const readStoredEnvelopeResult = (): CloudCollectionsReadResult | null => {
    const entry = readStorageEntry(storage, envelopeKey);
    if (entry.kind === 'missing') return null;
    const parsed = entry.kind === 'value' ? parseCloudCollectionsEnvelope(entry.value) : null;
    if (parsed?.ok) return { ok: true, envelope: parsed.envelope };
    let reason: 'json' | 'schema' | 'shape' = 'shape';
    if (entry.kind === 'corrupt') reason = 'json';
    else if (parsed && 'reason' in parsed) reason = parsed.reason;
    return {
      ok: false,
      corruption: {
        kind: 'corrupt',
        reason,
        envelopeKey,
        rawBackupKey,
        raw: entry.raw,
        repairAvailable: true,
      },
    };
  };

  const readEnvelopeSnapshot = (): CloudCollectionsEnvelope => {
    const stored = readStoredEnvelopeResult();
    if (stored?.ok === false) throw new CloudCollectionsCorruptionError(stored);
    if (stored?.ok === true) return stored.envelope;
    return buildCloudCollectionsEnvelope(readPerKeyCollections(storage, keys), 0);
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

  const cloneCommittedEnvelope = (envelope: CloudCollectionsEnvelope): CloudCollectionsEnvelope =>
    cloudCollectionsCodec.clone(envelope);

  const notifyCommitted = (envelope: CloudCollectionsEnvelope): CloudCollectionsCommitResult['warnings'] => {
    const warnings: CloudCollectionsCommitResult['warnings'] = [];
    const committedListeners = Array.from(listeners);
    for (let observerIndex = 0; observerIndex < committedListeners.length; observerIndex += 1) {
      try {
        committedListeners[observerIndex]?.(cloneCommittedEnvelope(envelope));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push({ kind: 'observer_failure', observerIndex, message });
        try {
          reportObserverFailure?.(error, observerIndex);
        } catch {
          // Reporting is an observer too; it cannot invalidate a durable collections commit.
        }
      }
    }
    return warnings;
  };

  const reconcileMirrorsWithinLock = (envelope: CloudCollectionsEnvelope): string[] => {
    const keysToRepair = new Set(pendingMirrorKeys);
    for (const [key, value] of perKeyEntries(keys, envelope)) {
      const stored = readStorageEntry(storage, key);
      if (
        stored.kind !== 'value' ||
        hashString32(stableSerializeCloudSyncValue(stored.value)) !==
          hashString32(stableSerializeCloudSyncValue(value))
      ) {
        keysToRepair.add(key);
      }
    }
    return keysToRepair.size ? mirrorEnvelope(envelope, keysToRepair) : [];
  };

  const ensureInitializedWithinLock = (): CloudCollectionsInitializationResult => {
    const stored = readStoredEnvelopeResult();
    if (stored?.ok === false) throw new CloudCollectionsCorruptionError(stored);
    if (stored?.ok === true) {
      return { initialized: false, envelope: stored.envelope, mirrorFailures: [] };
    }
    const migrated = buildCloudCollectionsEnvelope(readPerKeyCollections(storage, keys), 0);
    writeCloudCollectionsEnvelope(storage, envelopeKey, migrated);
    return {
      initialized: true,
      envelope: migrated,
      mirrorFailures: mirrorEnvelope(migrated),
    };
  };

  const commitEnvelope = (
    envelope: CloudCollectionsEnvelope,
    mirrorKeys?: ReadonlySet<string>
  ): CloudCollectionsCommitResult => {
    writeCloudCollectionsEnvelope(storage, envelopeKey, envelope);
    const mirrorFailures = mirrorEnvelope(envelope, mirrorKeys);
    const warnings = notifyCommitted(envelope);
    return { committed: true, envelope, mirrorFailures, warnings };
  };

  const noChangeResult = (envelope: CloudCollectionsEnvelope): CloudCollectionsCommitResult => ({
    committed: false,
    reason: 'no-change',
    envelope,
    mirrorFailures: [],
    warnings: [],
  });

  const repository: CloudCollectionsRepository = {
    envelopeKey,
    mutationIsolation: mutationLock.isolation,
    read: (): CloudSyncLocalCollections => toCollections(repository.readEnvelope()),
    readEnvelope(): CloudCollectionsEnvelope {
      return readEnvelopeSnapshot();
    },
    readResult(): CloudCollectionsReadResult {
      const stored = readStoredEnvelopeResult();
      if (stored) return stored;
      try {
        return { ok: true, envelope: readEnvelopeSnapshot() };
      } catch (error) {
        if (error instanceof CloudCollectionsCorruptionError) return error.result;
        throw error;
      }
    },
    ensureInitialized(): Promise<CloudCollectionsInitializationResult> {
      return mutationLock.runExclusive(mutationLockName, () => ensureInitializedWithinLock());
    },
    reconcileMirrors(): Promise<string[]> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const initialized = ensureInitializedWithinLock();
        const repaired = reconcileMirrorsWithinLock(initialized.envelope);
        return [...new Set([...initialized.mirrorFailures, ...repaired])];
      });
    },
    transact(mutator: CloudCollectionsMutator): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const current = ensureInitializedWithinLock().envelope;
        const mutation = mutator(buildCloudCollectionsEnvelope(toCollections(current), current.revision));
        const next = applyMutation(current, mutation);
        if (sameCollections(current, next)) return noChangeResult(current);
        return commitEnvelope(
          buildCloudCollectionsEnvelope(next, current.revision + 1),
          mirrorKeysForMutation(keys, mutation)
        );
      });
    },
    commit(next: CloudSyncLocalCollections): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const current = ensureInitializedWithinLock().envelope;
        const normalized = toCollections(buildCloudCollectionsEnvelope(next, current.revision));
        if (sameCollections(current, normalized)) return noChangeResult(current);
        return commitEnvelope(buildCloudCollectionsEnvelope(next, current.revision + 1));
      });
    },
    commitIfRevision(
      expectedRevision: number,
      next: CloudSyncLocalCollections
    ): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const current = ensureInitializedWithinLock().envelope;
        if (current.revision !== normalizeCloudCollectionsRevision(expectedRevision)) {
          return {
            committed: false,
            reason: 'revision-mismatch',
            envelope: current,
            mirrorFailures: [],
            warnings: [],
          };
        }
        const normalized = toCollections(buildCloudCollectionsEnvelope(next, current.revision));
        if (sameCollections(current, normalized)) return noChangeResult(current);
        return commitEnvelope(buildCloudCollectionsEnvelope(next, current.revision + 1));
      });
    },
    backupCorruptEnvelope(): string {
      const stored = readStoredEnvelopeResult();
      if (stored?.ok !== false) {
        throw new Error(`Cloud collections envelope is not corrupt for ${envelopeKey}`);
      }
      writeStorageValue(storage, rawBackupKey, {
        raw: stored.corruption.raw,
        reason: stored.corruption.reason,
        capturedAt: Date.now(),
      });
      return rawBackupKey;
    },
    resetCorruptEnvelope(next: CloudSyncLocalCollections): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const stored = readStoredEnvelopeResult();
        if (stored?.ok !== false) {
          throw new Error(
            `Cloud collections corruption reset requires a corrupt envelope for ${envelopeKey}`
          );
        }
        return commitEnvelope(buildCloudCollectionsEnvelope(next, 0));
      });
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
