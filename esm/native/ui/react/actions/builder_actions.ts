// React UI actions: builder convenience

import type { AppContainer } from '../../../../../types';

import {
  captureBuilderOutlineBinding,
  readConfigStateFromApp,
  refreshBuilderHandles,
} from '../../../services/api.js';

export function syncHandlesAfterDoorOps(app: AppContainer): void {
  try {
    refreshBuilderHandles(app, {
      cfgSnapshot: readConfigStateFromApp(app),
      addOutlines: captureBuilderOutlineBinding(app),
      purgeRemovedDoors: true,
    });
  } catch {
    // ignore
  }
}
