import type { AsyncOperationHandle } from '../../../types';

let nextOperationSequence = 1;
const MAX_RETAINED_OBSERVATIONS = 512;
const operationObservers = new Map<string, { settled: Promise<unknown>; complete: boolean }>();

export type AsyncOperationObservation<T> = {
  observed: boolean;
  settled: Promise<T>;
};

export type AsyncOperationObserverArgs<T, StartedToken = void> = {
  observerId: string;
  handle: AsyncOperationHandle<T>;
  onStarted?: (handle: AsyncOperationHandle<T>) => StartedToken;
  onSettled: (result: T, handle: AsyncOperationHandle<T>, startedToken: StartedToken | undefined) => void;
  onRejected: (
    error: unknown,
    handle: AsyncOperationHandle<T>,
    startedToken: StartedToken | undefined
  ) => void;
  onObserverError?: (error: unknown) => void;
};

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
    accepted: true,
    reused: false,
    operationId: `${normalizeOperationPrefix(prefix)}-${at}-${sequence}`,
    acceptedAt: at,
    settled,
  };
}

export function reuseAsyncOperationHandle<T>(handle: AsyncOperationHandle<T>): AsyncOperationHandle<T> {
  return handle.reused ? handle : { ...handle, reused: true };
}

function normalizeObserverId(value: string): string {
  const observerId = value.trim();
  if (!observerId) throw new Error('[WardrobePro] Async operation observer id is required.');
  return observerId;
}

function reportObserverError(handler: ((error: unknown) => void) | undefined, error: unknown): void {
  if (typeof handler !== 'function') return;
  try {
    handler(error);
  } catch {
    // Observation failures must never replace the terminal business result.
  }
}

export function observeAsyncOperation<T, StartedToken = void>(
  args: AsyncOperationObserverArgs<T, StartedToken>
): AsyncOperationObservation<T> {
  const observerKey = `${normalizeObserverId(args.observerId)}:${args.handle.operationId}`;
  const existing = operationObservers.get(observerKey);
  if (existing) {
    if (existing.settled !== args.handle.settled) {
      throw new Error(
        `[WardrobePro] Async operation id collision for observer ${args.observerId}: ${args.handle.operationId}`
      );
    }
    return { observed: false, settled: args.handle.settled };
  }

  const state = { settled: args.handle.settled as Promise<unknown>, complete: false };
  operationObservers.set(observerKey, state);

  let startedToken: StartedToken | undefined;
  try {
    startedToken = args.onStarted?.(args.handle);
  } catch (error) {
    reportObserverError(args.onObserverError, error);
  }

  const observedSettled = args.handle.settled
    .then(
      result => {
        try {
          args.onSettled(result, args.handle, startedToken);
        } catch (error) {
          reportObserverError(args.onObserverError, error);
        }
        return result;
      },
      error => {
        try {
          args.onRejected(error, args.handle, startedToken);
        } catch (observerError) {
          reportObserverError(args.onObserverError, observerError);
        }
        throw error;
      }
    )
    .finally(() => {
      state.complete = true;
      if (operationObservers.size <= MAX_RETAINED_OBSERVATIONS) return;
      for (const [key, observation] of operationObservers) {
        if (!observation.complete) continue;
        operationObservers.delete(key);
        if (operationObservers.size <= MAX_RETAINED_OBSERVATIONS) break;
      }
    });
  void observedSettled.catch(() => undefined);
  return { observed: true, settled: observedSettled };
}
