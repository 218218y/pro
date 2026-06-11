import {
  runCloudSyncOwnedAsyncFamilySingleFlight,
  type CloudSyncAsyncFamilyFlight,
} from './cloud_sync_async_singleflight.js';

export type CloudSyncMainWriteFlight = {
  key: string;
  promise: Promise<unknown>;
};

export type CloudSyncMainWriteSingleFlight = {
  isActive: () => boolean;
  run: <T>(key: string, run: () => Promise<T>, onBusy: () => T | Promise<T>) => Promise<T>;
};

const cloudSyncMainWriteFlights = new WeakMap<object, CloudSyncAsyncFamilyFlight<unknown, string>>();

export function createCloudSyncMainWriteSingleFlight(owner: object): CloudSyncMainWriteSingleFlight {
  const isActive = (): boolean => cloudSyncMainWriteFlights.has(owner);

  const run = <T>(key: string, runNow: () => Promise<T>, onBusy: () => T | Promise<T>): Promise<T> => {
    return runCloudSyncOwnedAsyncFamilySingleFlight({
      owner,
      flights: cloudSyncMainWriteFlights as WeakMap<object, CloudSyncAsyncFamilyFlight<T, string>>,
      key,
      run: runNow,
      onBusy: () => onBusy(),
    });
  };

  return {
    isActive,
    run,
  };
}
