import type { AppContainer } from '../../../types';

import type { ProjectLoadActionResult } from '../services/api.js';
import { beginProjectActionFamilyFlight } from './project_action_family_shared.js';

export function runProjectLoadActionSingleFlight(args: {
  app: AppContainer;
  key: string | null | undefined;
  run: () => Promise<ProjectLoadActionResult>;
  onBusy: () => Promise<ProjectLoadActionResult>;
  onReuse?: (() => void) | null;
}): Promise<ProjectLoadActionResult> {
  const { app, key, run, onBusy, onReuse } = args;
  const flight = beginProjectActionFamilyFlight({
    app,
    key: 'load',
    dedupeKey: key,
    run,
  });
  if (flight.status === 'reused') {
    onReuse?.();
    return flight.promise;
  }
  if (flight.status === 'busy') return onBusy();
  return flight.promise;
}
