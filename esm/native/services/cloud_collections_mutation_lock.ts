import type { CloudCollectionsMutationLockLike } from '../../../types';

import { createUnavailableCloudCollectionsMutationLock } from './cloud_sync_collections_repository.js';

type WebLocksLike = {
  request<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
};

function asWebLocksLike(value: unknown): WebLocksLike | null {
  if (!value || typeof value !== 'object') return null;
  const request = (value as { request?: unknown }).request;
  return typeof request === 'function' ? (value as WebLocksLike) : null;
}

export function createCloudCollectionsWebLock(locksValue: unknown): CloudCollectionsMutationLockLike {
  const locks = asWebLocksLike(locksValue);
  if (!locks) return createUnavailableCloudCollectionsMutationLock();
  return {
    isolation: 'cross-tab',
    runExclusive<T>(name: string, operation: () => Promise<T> | T): Promise<T> {
      return locks.request(name, operation);
    },
  };
}
