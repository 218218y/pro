import type { AsyncOperationHandle } from '../../../types';

let nextOperationSequence = 1;
const MAX_RETAINED_OBSERVATIONS = 512;
const MAX_RETAINED_STALE_DIAGNOSTICS = 128;
const operationObservers = new Map<string, { settled: Promise<unknown>; complete: boolean }>();
const staleOperationDiagnostics: AsyncOperationStaleDiagnostic[] = [];

export type AsyncOperationObservation<T> = {
  observed: boolean;
  settled: Promise<T>;
};

export type AsyncOperationStaleDiagnostic = {
  observerId: string;
  operationId: string;
  requestedAt: number;
  acceptedAt: number;
  detectedAt: number;
  ageMs: number;
};

export type AsyncOperationWatchdog<T> = {
  staleAfterMs: number;
  onStale: (diagnostic: AsyncOperationStaleDiagnostic, handle: AsyncOperationHandle<T>) => void;
  now?: () => number;
  schedule?: (callback: () => void, delayMs: number) => unknown;
  cancel?: (token: unknown) => void;
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
  watchdog?: AsyncOperationWatchdog<T>;
};

function normalizeOperationPrefix(value: string): string {
  const prefix = value.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  if (!prefix) throw new Error('[WardrobePro] Async operation prefix is required.');
  return prefix;
}

export function createAsyncOperationHandle<T>(
  prefix: string,
  settled: Promise<T>,
  acceptedAt = Date.now(),
  requestedAt = acceptedAt
): AsyncOperationHandle<T> {
  const at = Number.isFinite(acceptedAt) && acceptedAt > 0 ? Math.floor(acceptedAt) : Date.now();
  const requested =
    Number.isFinite(requestedAt) && requestedAt > 0 && requestedAt <= at ? Math.floor(requestedAt) : at;
  const sequence = nextOperationSequence++;
  return {
    accepted: true,
    reused: false,
    operationId: `${normalizeOperationPrefix(prefix)}-${at}-${sequence}`,
    requestedAt: requested,
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

function normalizeWatchdogDelay(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('[WardrobePro] Async operation watchdog delay must be a positive number.');
  }
  return Math.max(1, Math.floor(value));
}

function readWatchdogTime(watchdog: AsyncOperationWatchdog<unknown>): number {
  const value = watchdog.now?.() ?? Date.now();
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : Date.now();
}

function retainStaleDiagnostic(diagnostic: AsyncOperationStaleDiagnostic): void {
  staleOperationDiagnostics.push(diagnostic);
  if (staleOperationDiagnostics.length > MAX_RETAINED_STALE_DIAGNOSTICS) {
    staleOperationDiagnostics.splice(0, staleOperationDiagnostics.length - MAX_RETAINED_STALE_DIAGNOSTICS);
  }
}

function defaultWatchdogSchedule(callback: () => void, delayMs: number): unknown {
  const token = setTimeout(callback, delayMs);
  const maybeUnref = token && typeof token === 'object' ? Reflect.get(token, 'unref') : null;
  if (typeof maybeUnref === 'function') Reflect.apply(maybeUnref, token, []);
  return token;
}

function defaultWatchdogCancel(token: unknown): void {
  clearTimeout(token as ReturnType<typeof setTimeout>);
}

export function readAsyncOperationStaleDiagnostics(): AsyncOperationStaleDiagnostic[] {
  return staleOperationDiagnostics.map(diagnostic => ({ ...diagnostic }));
}

export function clearAsyncOperationStaleDiagnostics(): void {
  staleOperationDiagnostics.length = 0;
}

export function observeAsyncOperation<T, StartedToken = void>(
  args: AsyncOperationObserverArgs<T, StartedToken>
): AsyncOperationObservation<T> {
  const observerId = normalizeObserverId(args.observerId);
  const observerKey = JSON.stringify([observerId, args.handle.operationId]);
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

  let watchdogToken: unknown;
  let watchdogReported = false;
  const watchdog = args.watchdog;
  if (watchdog) {
    try {
      const staleAfterMs = normalizeWatchdogDelay(watchdog.staleAfterMs);
      const schedule = watchdog.schedule ?? defaultWatchdogSchedule;
      watchdogToken = schedule(() => {
        if (state.complete || watchdogReported) return;
        watchdogReported = true;
        const detectedAt = readWatchdogTime(watchdog as AsyncOperationWatchdog<unknown>);
        const diagnostic: AsyncOperationStaleDiagnostic = {
          observerId,
          operationId: args.handle.operationId,
          requestedAt: args.handle.requestedAt,
          acceptedAt: args.handle.acceptedAt,
          detectedAt,
          ageMs: Math.max(0, detectedAt - args.handle.requestedAt),
        };
        retainStaleDiagnostic(diagnostic);
        try {
          watchdog.onStale(diagnostic, args.handle);
        } catch (error) {
          reportObserverError(args.onObserverError, error);
        }
      }, staleAfterMs);
    } catch (error) {
      reportObserverError(args.onObserverError, error);
    }
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
      if (typeof watchdogToken !== 'undefined') {
        try {
          (watchdog?.cancel ?? defaultWatchdogCancel)(watchdogToken);
        } catch (error) {
          reportObserverError(args.onObserverError, error);
        }
      }
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
