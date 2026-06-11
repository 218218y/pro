export interface OwnedAsyncFamilyFlight<T, Key extends string> {
  key: Key;
  promise: Promise<T>;
}

export type BeginOwnedAsyncFamilyFlightResult<T, Key extends string> =
  | { status: 'started'; promise: Promise<T> }
  | { status: 'reused'; promise: Promise<T> }
  | { status: 'busy'; activeKey: Key; promise: Promise<T> };

function startOwnedAsyncRun<T>(run: () => Promise<T>): Promise<T> {
  try {
    return Promise.resolve(run());
  } catch (err) {
    return Promise.reject(err);
  }
}

export function beginOwnedAsyncFamilyFlight<T, Key extends string>(args: {
  owner?: object | null | undefined;
  flights: WeakMap<object, OwnedAsyncFamilyFlight<T, Key>>;
  key: Key;
  run: () => Promise<T>;
}): BeginOwnedAsyncFamilyFlightResult<T, Key> {
  const { owner, flights, key, run } = args;
  if (!owner) {
    return { status: 'started', promise: startOwnedAsyncRun(run) };
  }

  const active = flights.get(owner);
  if (active) {
    if (active.key === key) return { status: 'reused', promise: active.promise };
    return { status: 'busy', activeKey: active.key, promise: active.promise };
  }

  let resolvePending!: (value: T | PromiseLike<T>) => void;
  let rejectPending!: (reason?: unknown) => void;
  const pending = new Promise<T>((resolve, reject) => {
    resolvePending = resolve;
    rejectPending = reject;
  });
  flights.set(owner, { key, promise: pending });

  const started = startOwnedAsyncRun(run);

  started
    .finally(() => {
      if (flights.get(owner)?.promise === pending) flights.delete(owner);
    })
    .then(resolvePending, rejectPending);

  return { status: 'started', promise: pending };
}

export function runOwnedAsyncFamilySingleFlight<T, Key extends string>(args: {
  owner?: object | null | undefined;
  flights: WeakMap<object, OwnedAsyncFamilyFlight<T, Key>>;
  key: Key;
  run: () => Promise<T>;
  onBusy?: ((activeKey: Key, requestedKey: Key, activePromise: Promise<T>) => T | Promise<T>) | null;
  onReuse?: ((activePromise: Promise<T>) => void) | null;
}): Promise<T> {
  const { key, onBusy, onReuse } = args;
  const flight = beginOwnedAsyncFamilyFlight(args);
  if (flight.status === 'reused') {
    onReuse?.(flight.promise);
    return flight.promise;
  }
  if (flight.status === 'busy') {
    if (typeof onBusy === 'function') return Promise.resolve(onBusy(flight.activeKey, key, flight.promise));
    return flight.promise;
  }
  return flight.promise;
}

export function createKeyedAsyncSingleFlightRunner(): <T>(key: string, run: () => Promise<T>) => Promise<T> {
  const inflight = new Map<string, Promise<unknown>>();
  return <T>(key: string, run: () => Promise<T>): Promise<T> => {
    const existing = inflight.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    let resolvePending!: (value: T | PromiseLike<T>) => void;
    let rejectPending!: (reason?: unknown) => void;
    const pending = new Promise<T>((resolve, reject) => {
      resolvePending = resolve;
      rejectPending = reject;
    });
    inflight.set(key, pending);

    const started = startOwnedAsyncRun(run);

    started
      .finally(() => {
        if (inflight.get(key) === pending) inflight.delete(key);
      })
      .then(resolvePending, rejectPending);

    return pending;
  };
}
