import type { AppContainer, CameraMoveFn, CameraServiceLike } from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getServiceSlotMaybe } from '../runtime/services_root_access.js';
import { installCameraService } from './camera.js';
import { reportCameraNonFatal } from './camera_shared.js';

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
  } catch (error) {
    reportCameraNonFatal(
      App as AppContainer | null | undefined,
      'native/services/camera_access',
      'service.read',
      error
    );
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
    } catch (error) {
      reportCameraNonFatal(App, 'native/services/camera_access', 'handler.ensure', error);
    }
  }

  const svc = getCameraServiceMaybe(App);
  return svc && typeof svc.moveTo === 'function' ? svc.moveTo.bind(svc) : null;
}

export function moveCameraViaService(App: AppContainer, view: string): boolean {
  const move = getCameraMoveHandler(App);
  if (typeof move !== 'function') {
    reportCameraNonFatal(
      App,
      'native/services/camera_access',
      'move.handlerUnavailable',
      new Error('camera move handler is unavailable')
    );
    return false;
  }

  try {
    move(view);
    return true;
  } catch (error) {
    reportCameraNonFatal(App, 'native/services/camera_access', 'move.invoke', error);
    return false;
  }
}
