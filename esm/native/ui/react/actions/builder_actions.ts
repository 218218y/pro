// React UI actions: builder convenience

import type { AppContainer } from '../../../../../types';

import { readConfigStateFromApp, refreshBuilderHandles } from '../../../services/api.js';

export function syncHandlesAfterDoorOps(app: AppContainer): void {
  try {
    refreshBuilderHandles(app, {
      cfgSnapshot: readConfigStateFromApp(app),
      purgeRemovedDoors: true,
    });
  } catch {
    // ignore
  }
}
