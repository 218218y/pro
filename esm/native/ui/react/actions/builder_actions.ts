// React UI actions: builder convenience

import type { AppContainer } from '../../../../../types';

import { refreshBuilderHandles } from '../../../services/api.js';

export function syncHandlesAfterDoorOps(app: AppContainer): void {
  try {
    refreshBuilderHandles(app, { purgeRemovedDoors: true });
  } catch {
    // ignore
  }
}
