import type { EditStateServiceLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import { healStableSurfaceMethod } from './stable_surface_methods.js';

function asEditStateService(value: unknown): EditStateServiceLike | null {
  return asRecord<EditStateServiceLike>(value);
}

function healEditStateSurface(service: EditStateServiceLike | null): EditStateServiceLike | null {
  if (!service) return null;

  healStableSurfaceMethod(service, 'resetAllEditModes', '__wpResetAllEditModes');

  return service;
}

export function getEditStateServiceMaybe(App: unknown): EditStateServiceLike | null {
  try {
    return healEditStateSurface(asEditStateService(getServiceSlotMaybe(App, 'editState')));
  } catch {
    return null;
  }
}

export function ensureEditStateService(App: unknown): EditStateServiceLike {
  const service = ensureServiceSlot<EditStateServiceLike>(App, 'editState');
  return healEditStateSurface(asEditStateService(service) || service) || service;
}

export function resetAllEditModesViaService(App: unknown): boolean {
  try {
    const svc = getEditStateServiceMaybe(App);
    if (svc && typeof svc.resetAllEditModes === 'function') {
      svc.resetAllEditModes();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
