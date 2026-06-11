import type { CameraServiceLike } from '../../../types';

import { assertApp } from '../runtime/api.js';
import { isCameraInstalled, markCameraInstalled } from '../runtime/install_state_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { ensureServiceSlot, getServiceSlotMaybe } from '../runtime/services_root_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { moveCamera } from './camera_motion.js';
import { type AppLike, readCameraService } from './camera_shared.js';

type InstallableCameraService = CameraServiceLike & {
  __wpMoveTo?: (view: string) => void;
};

const cameraInstallContexts = new WeakMap<object, InstallContext<AppLike & object>>();

function fillCameraServiceSurface(
  context: InstallContext<AppLike & object>,
  svc: InstallableCameraService
): InstallableCameraService {
  installStableSurfaceMethod(svc, 'moveTo', '__wpMoveTo', () => {
    return (view: string) => moveCamera(context.App, view);
  });
  return svc;
}

export function installCameraService(App: AppLike): CameraServiceLike {
  const app = assertApp(App, 'native/services/camera.installCameraService');
  const existing = readCameraService(getServiceSlotMaybe<InstallableCameraService>(app, 'camera'));
  const svc = existing || ensureServiceSlot<InstallableCameraService>(app, 'camera');
  const context = resolveInstallContext(cameraInstallContexts, svc, App as AppLike & object);
  fillCameraServiceSurface(context, svc);
  if (!isCameraInstalled(app)) markCameraInstalled(app);
  return svc;
}

export function getCameraService(App: AppLike): CameraServiceLike | null {
  try {
    return readCameraService(getServiceSlotMaybe<CameraServiceLike>(App, 'camera'));
  } catch (_) {
    return null;
  }
}
