// Canonical scene-runtime seam.
//
// Purpose:
// - Keep viewport/build reaction consumers off `App.services.sceneView` probing.
// - Reuse the installed scene-view access helpers without leaking the service object shape.

import type { AppContainer, SceneViewSyncOptsLike } from '../../../types';

import { reportError } from '../runtime/errors.js';
import {
  initSceneLightsViaService,
  installSceneViewStoreSyncViaService,
  syncSceneViewViaService,
  updateSceneLightsViaService,
  updateSceneModeViaService,
} from './scene_view_access.js';

function reportSceneRuntime(App: AppContainer, op: string, err: unknown): void {
  reportError(App, err, { where: 'native/services/scene_runtime', op, fatal: false });
}

export function initializeSceneRuntime(App: AppContainer): boolean {
  try {
    initSceneLightsViaService(App);
  } catch (err) {
    reportSceneRuntime(App, 'initializeSceneRuntime.initLights', err);
  }

  try {
    if (installSceneViewStoreSyncViaService(App)) return true;
  } catch (err) {
    reportSceneRuntime(App, 'initializeSceneRuntime.installStoreSync', err);
  }

  try {
    return syncSceneViewViaService(App, { force: true, updateShadows: true, reason: 'sceneRuntime:init' });
  } catch (err) {
    reportSceneRuntime(App, 'initializeSceneRuntime.sync', err);
    return false;
  }
}

export function syncSceneRuntimeFromStore(App: AppContainer, opts?: SceneViewSyncOptsLike): boolean {
  try {
    return syncSceneViewViaService(App, opts);
  } catch (err) {
    reportSceneRuntime(App, 'syncSceneRuntimeFromStore', err);
    return false;
  }
}

export function refreshSceneRuntimeLights(App: AppContainer, updateShadows?: boolean): boolean {
  try {
    return updateSceneLightsViaService(App, !!updateShadows);
  } catch (err) {
    reportSceneRuntime(App, 'refreshSceneRuntimeLights', err);
    return false;
  }
}

export function refreshSceneRuntimeMode(App: AppContainer): boolean {
  try {
    return updateSceneModeViaService(App);
  } catch (err) {
    reportSceneRuntime(App, 'refreshSceneRuntimeMode', err);
    return false;
  }
}
