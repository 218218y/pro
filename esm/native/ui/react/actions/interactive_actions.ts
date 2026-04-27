// React UI actions: interactive shell helpers

import type { AppContainer } from '../../../../../types';

import { setDoorsOpen } from '../../../services/api.js';

export function closeInteractiveOnGlobalOff(app: AppContainer): void {
  try {
    setDoorsOpen(app, false, { forceUpdate: true });
  } catch {
    // ignore
  }
}
