import type {
  CloudCollectionsCommitResult,
  CloudCollectionsEnvelope,
  CloudCollectionsMutation,
  CloudCollectionsReadResult,
  CloudCollectionsRepositoryLike,
  CloudCollectionsServiceLike,
  CloudSyncLocalCollections,
} from '../../../types';

import { asRecord } from './record.js';
import { getServiceSlotMaybe } from './services_root_access.js';

export function getCloudCollectionsServiceMaybe(App: unknown): CloudCollectionsServiceLike | null {
  return asRecord<CloudCollectionsServiceLike>(
    getServiceSlotMaybe<CloudCollectionsServiceLike>(App, 'cloudCollections')
  );
}

export function getCloudCollectionsRepositoryViaServiceOrThrow(
  App: unknown,
  context = 'cloud collections repository'
): CloudCollectionsRepositoryLike {
  const repository = getCloudCollectionsServiceMaybe(App)?.repository;
  if (!repository) {
    throw new Error(`[WardrobePro] ${context} requires services.cloudCollections.repository.`);
  }
  return repository;
}

export function readCloudCollectionsEnvelopeViaServiceOrThrow(
  App: unknown,
  context?: string
): CloudCollectionsEnvelope {
  return getCloudCollectionsRepositoryViaServiceOrThrow(App, context).readEnvelope();
}

export function readCloudCollectionsResultViaServiceOrThrow(
  App: unknown,
  context?: string
): CloudCollectionsReadResult {
  return getCloudCollectionsRepositoryViaServiceOrThrow(App, context).readResult();
}

export function updateCloudCollectionsViaServiceOrThrow(
  App: unknown,
  mutation: CloudCollectionsMutation,
  context?: string
): CloudCollectionsCommitResult {
  return getCloudCollectionsRepositoryViaServiceOrThrow(App, context).update(mutation);
}

export function resetCorruptCloudCollectionsViaServiceOrThrow(
  App: unknown,
  next: CloudSyncLocalCollections,
  context?: string
): CloudCollectionsCommitResult {
  return getCloudCollectionsRepositoryViaServiceOrThrow(App, context).resetCorruptEnvelope(next);
}
