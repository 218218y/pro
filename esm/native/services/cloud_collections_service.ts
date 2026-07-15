import type { AppContainer, CloudCollectionsServiceLike } from '../../../types';

import { ensureServiceSlot, getNavigatorMaybe } from '../runtime/api.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { createCloudCollectionsWebLock } from './cloud_collections_mutation_lock.js';
import {
  createCloudCollectionsRepository,
  createInProcessCloudCollectionsMutationLock,
} from './cloud_sync_collections_repository.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support_feedback.js';
import {
  isCloudSyncStorageLike,
  resolveCloudSyncOwnerStorageKeys,
} from './cloud_sync_owner_context_runtime_shared.js';

export async function installCloudCollectionsService(
  App: AppContainer
): Promise<CloudCollectionsServiceLike> {
  const storage = getStorageServiceMaybe(App);
  if (!isCloudSyncStorageLike(storage)) {
    throw new Error('[WardrobePro] Cloud collections requires the canonical storage service.');
  }
  const keys = resolveCloudSyncOwnerStorageKeys(storage);
  const nav = getNavigatorMaybe(App);
  const mutationLock = nav
    ? createCloudCollectionsWebLock(nav.locks)
    : createInProcessCloudCollectionsMutationLock();
  const repository = createCloudCollectionsRepository({
    storage,
    mutationLock,
    keys: {
      models: keys.keyModels,
      colors: keys.keyColors,
      colorOrder: keys.keyColorOrder,
      presetOrder: keys.keyPresetOrder,
      hiddenPresets: keys.keyHiddenPresets,
    },
    reportObserverFailure: (error, observerIndex) =>
      _cloudSyncReportNonFatal(App, `collections.observer.${observerIndex}`, error, {
        throttleMs: 6000,
      }),
  });
  if (repository.mutationIsolation !== 'cross-tab') {
    _cloudSyncReportNonFatal(
      App,
      'collections.mutationIsolation',
      new Error(
        `Cloud collections mutation isolation is ${repository.mutationIsolation}; cross-tab writes require Web Locks.`
      ),
      { throttleMs: 60000, noConsole: true }
    );
  }
  const service = ensureServiceSlot<CloudCollectionsServiceLike>(App, 'cloudCollections');
  service.repository = repository;
  service.readEnvelope = () => repository.readEnvelope();
  service.readResult = () => repository.readResult();
  service.ensureInitialized = () => repository.ensureInitialized();
  service.reconcileMirrors = () => repository.reconcileMirrors();
  service.transact = mutator => repository.transact(mutator);
  service.backupCorruptEnvelope = () => repository.backupCorruptEnvelope();
  service.resetCorruptEnvelope = next => repository.resetCorruptEnvelope(next);
  await repository.ensureInitialized();
  const mirrorFailures = await repository.reconcileMirrors();
  if (mirrorFailures.length) {
    _cloudSyncReportNonFatal(
      App,
      'collections.mirrorReconciliation',
      new Error(`Cloud collections mirror reconciliation failed for ${mirrorFailures.join(', ')}`),
      { throttleMs: 6000 }
    );
  }
  return service;
}
