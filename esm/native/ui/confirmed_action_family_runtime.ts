import type { AppContainer } from '../../../types';

import { requestAppConfirmation } from './feedback_confirm_runtime.js';
import { runConfirmedAction } from './feedback_action_runtime.js';
import { runAppActionFamilySingleFlight, type AppActionFamilyFlight } from './action_family_singleflight.js';

export type ConfirmedAppActionFamilyArgs<Result, Key extends string> = {
  flights: WeakMap<object, AppActionFamilyFlight<Result, Key>>;
  app: AppContainer;
  key: Key;
  title: string;
  message: string;
  onRequestError: (message: string) => Result | Promise<Result>;
  onCancelled: () => Result | Promise<Result>;
  runConfirmed: () => Result | Promise<Result>;
  onBusy?: (() => Result | Promise<Result>) | null;
  onReuse?: (() => void) | null;
};

export function runAppConfirmedActionFamilySingleFlight<Result, Key extends string>(
  args: ConfirmedAppActionFamilyArgs<Result, Key>
): Promise<Result> {
  const { flights, app, key, title, message, onRequestError, onCancelled, runConfirmed, onBusy, onReuse } =
    args;
  return runAppActionFamilySingleFlight({
    flights,
    app,
    key,
    run: () =>
      runConfirmedAction<Result>({
        request: () => requestAppConfirmation(app, title, message),
        onRequestError,
        onCancelled,
        runConfirmed,
      }),
    onBusy: onBusy ?? null,
    onReuse: onReuse ?? null,
  });
}
