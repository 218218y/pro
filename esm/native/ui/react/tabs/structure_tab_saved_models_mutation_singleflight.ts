import {
  runAppActionFamilySingleFlight,
  type AppActionFamilyFlight,
} from '../../action_family_singleflight.js';

export type SavedModelsMutationFlightKey = 'save' | `overwrite:${string}` | `delete:${string}`;

const savedModelsMutationFlights = new WeakMap<
  object,
  AppActionFamilyFlight<unknown, SavedModelsMutationFlightKey>
>();

export function runSavedModelsMutationSingleFlight<T>(args: {
  owner: object;
  key: SavedModelsMutationFlightKey;
  onBusy: () => T;
  run: () => Promise<T>;
}): Promise<T> {
  return runAppActionFamilySingleFlight<T, SavedModelsMutationFlightKey>({
    flights: savedModelsMutationFlights as WeakMap<
      object,
      AppActionFamilyFlight<T, SavedModelsMutationFlightKey>
    >,
    owner: args.owner,
    key: args.key,
    run: args.run,
    onBusy: args.onBusy,
  });
}
