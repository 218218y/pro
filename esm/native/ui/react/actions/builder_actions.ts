// React UI actions: builder convenience

import type { AppContainer } from '../../../../../types';

import {
  captureBuilderOutlineBinding,
  readConfigStateFromApp,
  readModeStateFromApp,
  readUiStateFromApp,
  refreshBuilderHandles,
} from '../../../services/api.js';
import { resolveRemoveDoorsEnabledFromSnapshots } from '../../../features/door_removal_visibility.js';

export function syncHandlesAfterDoorOps(app: AppContainer): void {
  try {
    refreshBuilderHandles(app, {
      cfgSnapshot: readConfigStateFromApp(app),
      addOutlines: captureBuilderOutlineBinding(app),
      removeDoorsEnabled: resolveRemoveDoorsEnabledFromSnapshots(
        readUiStateFromApp(app),
        readModeStateFromApp(app)
      ),
      purgeRemovedDoors: true,
    });
  } catch {
    // ignore
  }
}
