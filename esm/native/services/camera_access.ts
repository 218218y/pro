import type { AppContainer, CameraMoveFn, CameraServiceLike } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getServiceSlotMaybe } from '../runtime/services_root_access.js';
import { installCameraService } from './camera.js';

function isAppContainerLike(value: unknown): value is AppContainer {
  return !!value && typeof value === 'object';
}

function asCameraService(value: unknown): CameraServiceLike | null {
  const rec = asRecord<CameraServiceLike>(value);
  return !!rec && (typeof rec.moveTo === 'function' || typeof rec.moveTo === 'undefined') ? rec : null;
}

export function getCameraServiceMaybe(App: unknown): CameraServiceLike | null {
  try {
    return asCameraService(getServiceSlotMaybe<CameraServiceLike>(App, 'camera'));
  } catch {
    return null;
  }
}

export function ensureCameraService(App: AppContainer): CameraServiceLike {
  return asCameraService(installCameraService(App)) || Object.create(null);
}

export function getCameraMoveHandler(App: unknown): CameraMoveFn | null {
  if (isAppContainerLike(App)) {
    try {
      const svc = ensureCameraService(App);
      if (svc && typeof svc.moveTo === 'function') return svc.moveTo.bind(svc);
    } catch {
      // ignore and fall back to a best-effort slot read
    }
  }

  try {
    const svc = getCameraServiceMaybe(App);
    if (svc && typeof svc.moveTo === 'function') return svc.moveTo.bind(svc);
  } catch {
    // ignore
  }
  return null;
}

export function moveCameraViaService(App: AppContainer, view: string): boolean {
  try {
    const move = getCameraMoveHandler(App);
    if (typeof move === 'function') {
      move(view);
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const svc = ensureCameraService(App);
    if (typeof svc.moveTo === 'function') {
      svc.moveTo(view);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
