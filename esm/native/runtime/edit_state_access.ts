import type { EditStateServiceLike } from '../../../types';

import { reportError } from './errors.js';
import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import { healStableSurfaceMethod } from './stable_surface_methods.js';

type EditStateRuntimeSurface = EditStateServiceLike & {
  __wpResetAllEditModesResult?: () => boolean;
};

function reportEditStateAccessFailure(App: unknown, op: string, error: unknown): void {
  reportError(
    App,
    error,
    { where: 'native/runtime/edit_state_access', op, fatal: false },
    { consoleOutput: false }
  );
}

function asEditStateService(value: unknown): EditStateRuntimeSurface | null {
  return asRecord<EditStateRuntimeSurface>(value);
}

function healEditStateSurface(service: EditStateRuntimeSurface | null): EditStateRuntimeSurface | null {
  if (!service) return null;

  healStableSurfaceMethod(service, 'resetAllEditModes', '__wpResetAllEditModes');

  return service;
}

export function getEditStateServiceMaybe(App: unknown): EditStateServiceLike | null {
  try {
    return healEditStateSurface(asEditStateService(getServiceSlotMaybe(App, 'editState')));
  } catch (error) {
    reportEditStateAccessFailure(App, 'service.read', error);
    return null;
  }
}

export function ensureEditStateService(App: unknown): EditStateServiceLike {
  const service = ensureServiceSlot<EditStateRuntimeSurface>(App, 'editState');
  return healEditStateSurface(asEditStateService(service) || service) || service;
}

export function resetAllEditModesViaService(App: unknown): boolean {
  try {
    const service = getEditStateServiceMaybe(App) as EditStateRuntimeSurface | null;
    if (!service) return false;

    if (typeof service.__wpResetAllEditModesResult === 'function') {
      return service.__wpResetAllEditModesResult() !== false;
    }

    if (typeof service.resetAllEditModes === 'function') {
      return (service.resetAllEditModes as () => unknown)() !== false;
    }
  } catch (error) {
    reportEditStateAccessFailure(App, 'resetAllEditModes.ownerRejected', error);
  }
  return false;
}
