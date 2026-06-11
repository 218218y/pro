import {
  beginOwnedAsyncFamilyFlight,
  createKeyedAsyncSingleFlightRunner,
  runOwnedAsyncFamilySingleFlight,
  type BeginOwnedAsyncFamilyFlightResult,
  type OwnedAsyncFamilyFlight,
} from '../runtime/owned_async_singleflight.js';

export type CloudSyncAsyncFamilyFlight<T, Key extends string> = OwnedAsyncFamilyFlight<T, Key>;

export type CloudSyncOwnedAsyncFamilyFlightResult<T, Key extends string> = BeginOwnedAsyncFamilyFlightResult<
  T,
  Key
>;

export function beginCloudSyncOwnedAsyncFamilyFlight<T, Key extends string>(args: {
  owner: object;
  flights: WeakMap<object, CloudSyncAsyncFamilyFlight<T, Key>>;
  key: Key;
  run: () => Promise<T>;
}): CloudSyncOwnedAsyncFamilyFlightResult<T, Key> {
  return beginOwnedAsyncFamilyFlight(args);
}

export function runCloudSyncOwnedAsyncFamilySingleFlight<T, Key extends string>(args: {
  owner: object;
  flights: WeakMap<object, CloudSyncAsyncFamilyFlight<T, Key>>;
  key: Key;
  run: () => Promise<T>;
  onBusy?: ((activeKey: Key, requestedKey: Key, activePromise: Promise<T>) => T | Promise<T>) | null;
  onReuse?: ((activePromise: Promise<T>) => void) | null;
}): Promise<T> {
  return runOwnedAsyncFamilySingleFlight(args);
}

export const createCloudSyncAsyncSingleFlightRunner = createKeyedAsyncSingleFlightRunner;

export function createCloudSyncAsyncFamilySingleFlightRunner<T, Key extends string>(
  readBusyResult: (activeKey: Key, requestedKey: Key) => T
): (key: Key, run: () => Promise<T>) => Promise<T> {
  const owner = {};
  const flights = new WeakMap<object, CloudSyncAsyncFamilyFlight<T, Key>>();
  return (key: Key, run: () => Promise<T>): Promise<T> =>
    runCloudSyncOwnedAsyncFamilySingleFlight({
      owner,
      flights,
      key,
      run,
      onBusy: activeKey => readBusyResult(activeKey, key),
    });
}
