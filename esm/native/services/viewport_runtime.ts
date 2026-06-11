// Native ESM viewport runtime helpers.
//
// Purpose:
// - Keep UI consumers off raw render controls + scene refresh sequencing.
// - Provide a canonical seam for viewport-side effects driven by state/UI intent.

import type {
  AppContainer,
  ViewportRuntimeApplySketchModeOptions,
  ViewportRuntimeServiceLike,
} from '../../../types';

import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import { runBuilderBuildWardrobe } from '../runtime/builder_service_access.js';
import { markViewportInstalled } from '../runtime/install_state_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { ensureServiceSlot } from '../runtime/services_root_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  applyViewportBootCameraPose,
  asViewportRuntimeAppContainer,
  createViewportRuntimeError,
  initializeViewportSceneSyncInternal,
  readViewportOrbitControlsTarget,
  reportViewportRuntimeNonFatal,
  syncViewportSceneViewAfterSketchMode,
  type ViewportRuntimeAppLike,
  writeViewportSketchMode,
} from './viewport_runtime_support.js';

export const DEFAULT_BOOT_CAMERA_POSE: {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
} = {
  position: { x: 0, y: 2.2, z: 5.5 },
  target: { x: 0, y: 1.4, z: 0 },
};

type InstallableViewportRuntimeService = ViewportRuntimeServiceLike & {
  __wpSetOrbitControlsEnabled?: (enabled: boolean) => boolean;
  __wpApplySketchMode?: (sketchMode: boolean, opts?: ViewportRuntimeApplySketchModeOptions) => boolean;
  __wpInitializeSceneSync?: () => boolean;
};

const viewportInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function installViewportRuntimeMethods(
  svc: InstallableViewportRuntimeService,
  context: InstallContext<AppContainer>
): void {
  installStableSurfaceMethod(svc, 'setOrbitControlsEnabled', '__wpSetOrbitControlsEnabled', () => {
    return (enabled: boolean): boolean => setOrbitControlsEnabled(context.App, enabled);
  });
  installStableSurfaceMethod(svc, 'applySketchMode', '__wpApplySketchMode', () => {
    return (sketchMode: boolean, opts?: ViewportRuntimeApplySketchModeOptions): boolean =>
      applyViewportSketchMode(context.App, sketchMode, opts);
  });
  installStableSurfaceMethod(svc, 'initializeSceneSync', '__wpInitializeSceneSync', () => {
    return (): boolean => initializeViewportSceneSync(context.App);
  });
}

export function primeViewportBootCamera(App: ViewportRuntimeAppLike): boolean {
  try {
    return applyViewportBootCameraPose(App, DEFAULT_BOOT_CAMERA_POSE);
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'primeViewportBootCamera', err);
    return false;
  }
}

export function primeViewportBootCameraOrThrow(App: ViewportRuntimeAppLike): void {
  try {
    if (applyViewportBootCameraPose(App, DEFAULT_BOOT_CAMERA_POSE)) return;
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'primeViewportBootCamera', err);
    throw createViewportRuntimeError(
      'primeViewportBootCamera',
      '[WardrobePro] Could not apply the canonical default viewport boot camera preset.',
      err
    );
  }

  throw createViewportRuntimeError(
    'primeViewportBootCamera',
    '[WardrobePro] Could not apply the canonical default viewport boot camera preset.'
  );
}

export function setOrbitControlsEnabled(App: ViewportRuntimeAppLike, enabled: boolean): boolean {
  try {
    const controls = readViewportOrbitControlsTarget(App);
    if (!controls) return false;
    controls.enabled = !!enabled;
    return true;
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'setOrbitControlsEnabled', err);
    return false;
  }
}

export function initializeViewportSceneSync(App: ViewportRuntimeAppLike): boolean {
  try {
    return initializeViewportSceneSyncInternal(App);
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'initializeViewportSceneSync', err);
    return false;
  }
}

export function initializeViewportSceneSyncOrThrow(App: ViewportRuntimeAppLike): void {
  try {
    if (initializeViewportSceneSyncInternal(App)) return;
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'initializeViewportSceneSync', err);
    throw createViewportRuntimeError(
      'initializeViewportSceneSync',
      '[WardrobePro] Viewport scene sync failed during initialization.',
      err
    );
  }

  throw createViewportRuntimeError(
    'initializeViewportSceneSync',
    '[WardrobePro] Viewport scene sync failed during initialization.'
  );
}

export function applyViewportSketchMode(
  App: ViewportRuntimeAppLike,
  sketchMode: boolean,
  opts?: ViewportRuntimeApplySketchModeOptions
): boolean {
  const next = !!sketchMode;
  const container = asViewportRuntimeAppContainer(App);
  let cur = false;

  try {
    cur = !!readRuntimeScalarOrDefaultFromApp(container, 'sketchMode', false);
  } catch (err) {
    reportViewportRuntimeNonFatal(App, 'applyViewportSketchMode.read', err);
  }

  const changed = cur !== next;
  const writeOk = !changed || writeViewportSketchMode(App, next, opts);
  const shouldSync = (changed && writeOk) || !!opts?.forceSync;

  if (shouldSync) syncViewportSceneViewAfterSketchMode(App, opts);

  if (shouldSync && opts?.rebuild) {
    try {
      runBuilderBuildWardrobe(container);
    } catch (err) {
      reportViewportRuntimeNonFatal(App, 'applyViewportSketchMode.rebuild', err);
    }
  }

  return changed && writeOk;
}

export function installViewportRuntimeService(App: AppContainer): ViewportRuntimeServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installViewportRuntimeService(App): App is required');

  const svc = ensureServiceSlot<InstallableViewportRuntimeService>(App, 'viewport');
  const context = resolveInstallContext(viewportInstallContexts, svc, App);

  installViewportRuntimeMethods(svc, context);
  markViewportInstalled(App);
  return svc;
}
