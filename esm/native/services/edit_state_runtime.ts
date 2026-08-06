import type { EditStateServiceLike } from '../../../types';

type EditStateInstallSurface = EditStateServiceLike & {
  __wpResetAllEditModes?: () => void;
  __wpResetAllEditModesResult?: () => boolean;
};

import { ensureEditStateService } from '../runtime/edit_state_access.js';

import { type AppLike, asApp } from './edit_state_shared.js';
import { resetAllEditModesWithResult } from './edit_state_reset.js';

export function installEditStateService(App: AppLike): { editState: EditStateServiceLike } {
  const app = asApp(App);
  if (!app) throw new Error('installEditStateService(App): App is required');

  const editState = ensureEditStateService(app) as EditStateInstallSurface;
  const existingReset =
    typeof editState.__wpResetAllEditModes === 'function'
      ? editState.__wpResetAllEditModes
      : typeof editState.resetAllEditModes === 'function'
        ? editState.resetAllEditModes
        : null;

  const canonicalResetAllEditModesResult =
    typeof editState.__wpResetAllEditModesResult === 'function'
      ? editState.__wpResetAllEditModesResult
      : existingReset
        ? () => (existingReset as () => unknown)() !== false
        : () => resetAllEditModesWithResult(app).ok;

  const canonicalResetAllEditModes = existingReset || (() => void canonicalResetAllEditModesResult());

  if (editState.__wpResetAllEditModesResult !== canonicalResetAllEditModesResult) {
    editState.__wpResetAllEditModesResult = canonicalResetAllEditModesResult;
  }
  if (editState.__wpResetAllEditModes !== canonicalResetAllEditModes) {
    editState.__wpResetAllEditModes = canonicalResetAllEditModes;
  }
  if (editState.resetAllEditModes !== canonicalResetAllEditModes) {
    editState.resetAllEditModes = canonicalResetAllEditModes;
  }

  return { editState };
}
