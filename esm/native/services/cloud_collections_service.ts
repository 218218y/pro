import type { AppContainer, CloudCollectionsServiceLike } from '../../../types';

import { ensureServiceSlot } from '../runtime/services_root_access.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { createCloudCollectionsRepository } from './cloud_sync_collections_repository.js';
import {
  isCloudSyncStorageLike,
  resolveCloudSyncOwnerStorageKeys,
} from './cloud_sync_owner_context_runtime_shared.js';

export function installCloudCollectionsService(App: AppContainer): CloudCollectionsServiceLike {
  const storage = getStorageServiceMaybe(App);
  if (!isCloudSyncStorageLike(storage)) {
    throw new Error('[WardrobePro] Cloud collections requires the canonical storage service.');
  }
  const keys = resolveCloudSyncOwnerStorageKeys(storage);
  const repository = createCloudCollectionsRepository({
    storage,
    keys: {
      models: keys.keyModels,
      colors: keys.keyColors,
      colorOrder: keys.keyColorOrder,
      presetOrder: keys.keyPresetOrder,
      hiddenPresets: keys.keyHiddenPresets,
    },
  });
  repository.readEnvelope();
  const service = ensureServiceSlot<CloudCollectionsServiceLike>(App, 'cloudCollections');
  service.repository = repository;
  service.readEnvelope = () => repository.readEnvelope();
  service.readResult = () => repository.readResult();
  service.update = mutation => repository.update(mutation);
  service.repairMirrors = () => repository.repairMirrors();
  service.backupCorruptEnvelope = () => repository.backupCorruptEnvelope();
  service.resetCorruptEnvelope = next => repository.resetCorruptEnvelope(next);
  return service;
}
