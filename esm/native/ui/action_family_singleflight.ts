import {
  beginOwnedAsyncFamilyFlight,
  runOwnedAsyncFamilySingleFlight,
  type BeginOwnedAsyncFamilyFlightResult,
  type OwnedAsyncFamilyFlight,
} from '../services/api.js';

export type AppActionFamilyFlight<T, Key extends string> = OwnedAsyncFamilyFlight<T, Key>;

export type BeginAppActionFamilyFlightResult<T, Key extends string> = BeginOwnedAsyncFamilyFlightResult<
  T,
  Key
>;

function readAppActionFlightOwner(args: {
  app?: object | null | undefined;
  owner?: object | null | undefined;
}): object | null {
  return args.owner || args.app || null;
}

export function beginAppActionFamilyFlight<T, Key extends string>(args: {
  flights: WeakMap<object, AppActionFamilyFlight<T, Key>>;
  app?: object | null | undefined;
  owner?: object | null | undefined;
  key: Key;
  run: () => Promise<T>;
}): BeginAppActionFamilyFlightResult<T, Key> {
  return beginOwnedAsyncFamilyFlight({
    owner: readAppActionFlightOwner(args),
    flights: args.flights,
    key: args.key,
    run: args.run,
  });
}

export function runAppActionFamilySingleFlight<T, Key extends string>(args: {
  flights: WeakMap<object, AppActionFamilyFlight<T, Key>>;
  app?: object | null | undefined;
  owner?: object | null | undefined;
  key: Key;
  run: () => Promise<T>;
  onBusy?: ((activeKey: Key) => T | Promise<T>) | null;
  onReuse?: (() => void) | null;
}): Promise<T> {
  return runOwnedAsyncFamilySingleFlight({
    owner: readAppActionFlightOwner(args),
    flights: args.flights,
    key: args.key,
    run: args.run,
    onBusy: args.onBusy ? activeKey => args.onBusy?.(activeKey) as T | Promise<T> : null,
    onReuse: args.onReuse ? () => args.onReuse?.() : null,
  });
}
