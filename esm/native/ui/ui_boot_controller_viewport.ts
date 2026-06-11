import {
  createViewportSurface,
  getWindowMaybe,
  initializeViewportSceneSyncOrThrow,
  primeViewportBootCameraOrThrow,
  requireRoomDesignService,
  resetCameraPreset,
  assertThreeViaDeps,
  ensureModelsLoadedViaService,
} from '../services/api.js';
import type { AppContainer } from '../../../types';
import type {
  BootViewportContext,
  UiBootReporterLike,
  ViewportSurfaceLike,
} from './ui_boot_controller_shared.js';
import { isViewportContainerLike } from './ui_boot_controller_shared.js';

export function ensureUiBootModelsLoaded(App: AppContainer, reporter: UiBootReporterLike): void {
  try {
    ensureModelsLoadedViaService(App);
  } catch (err) {
    reporter.soft('models.ensureLoaded', err);
  }
}

export function ensureUiBootViewportContext(
  App: AppContainer,
  container: unknown,
  reporter: UiBootReporterLike
): BootViewportContext {
  const THREE = assertThreeViaDeps(App, 'native/ui/boot_main.THREE');
  if (!THREE.OrbitControls) {
    reporter.throwHard(
      'viewport.missingOrbitControls',
      '[WardrobePro] THREE.OrbitControls is not available.'
    );
  }

  if (!isViewportContainerLike(container)) {
    reporter.throwHard('viewport.invalidContainer', '[WardrobePro] viewer-container is invalid');
  }

  const surface: ViewportSurfaceLike = createViewportSurface(App, { container });
  const { renderer } = surface;

  if (!renderer?.domElement) {
    reporter.throwHard(
      'viewport.missingDomElement',
      '[WardrobePro] Viewport renderer did not expose a DOM element during boot.'
    );
  }

  try {
    initializeViewportSceneSyncOrThrow(App);
  } catch (err) {
    reporter.throwHard(
      'viewport.initializeSceneSync',
      '[WardrobePro] Viewport scene sync failed during UI boot.',
      err
    );
  }

  const roomDesign = requireRoomDesignService(App, 'native/ui/boot_main.roomDesign');
  if (roomDesign && typeof roomDesign.buildRoom === 'function') roomDesign.buildRoom();
  else {
    reporter.throwHard(
      'roomDesign.buildRoom.missing',
      '[WardrobePro] RoomDesign service is missing buildRoom() during UI boot.'
    );
  }

  if (!container.contains?.(renderer.domElement)) {
    container.appendChild(renderer.domElement);
  }

  if (typeof container.contains === 'function' && !container.contains(renderer.domElement)) {
    reporter.throwHard(
      'viewport.attachCanvas',
      '[WardrobePro] Viewport canvas was not attached to viewer-container during UI boot.'
    );
  }

  return {
    container,
    renderer,
    windowRef: getWindowMaybe(App),
  };
}

export function primeUiBootCamera(App: AppContainer, reporter: UiBootReporterLike): void {
  if (resetCameraPreset(App)) return;
  try {
    primeViewportBootCameraOrThrow(App);
    return;
  } catch (err) {
    reporter.throwHard(
      'viewport.primeCamera',
      '[WardrobePro] Could not apply the canonical default camera preset during UI boot.',
      err
    );
  }
}
