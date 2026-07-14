import type { AsyncOperationHandle } from '../../../types';

let nextOperationSequence = 1;

function normalizeOperationPrefix(value: string): string {
  const prefix = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  if (!prefix) throw new Error('[WardrobePro] Async operation prefix is required.');
  return prefix;
}

export function createAsyncOperationHandle<T>(
  prefix: string,
  settled: Promise<T>,
  acceptedAt = Date.now()
): AsyncOperationHandle<T> {
  const at = Number.isFinite(acceptedAt) && acceptedAt > 0 ? Math.floor(acceptedAt) : Date.now();
  const sequence = nextOperationSequence++;
  return {
    operationId: `${normalizeOperationPrefix(prefix)}-${at}-${sequence}`,
    acceptedAt: at,
    settled,
  };
}
