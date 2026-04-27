// Canonical scene-runtime seam.
//
// Purpose:
// - Keep viewport/build reaction consumers off `App.services.sceneView` probing.
// - Reuse the installed scene-view access helpers without leaking the service object shape.

import type { AppContainer, SceneViewSyncOptsLike } from '../../../types';

import {
  initSceneLightsViaService,
  installSceneViewStoreSyncViaService,
  syncSceneViewViaService,
  updateSceneLightsViaService,
  updateSceneModeViaService,
} from './scene_view_access.js';

function reportSceneRuntime(op: string, err: unknown): void {
  try {
    console.error(`[WardrobePro][scene_runtime] ${op}`, err);
  } catch {
    // ignore
  }
}

export function initializeSceneRuntime(App: AppContainer): boolean {
  try {
    initSceneLightsViaService(App);
  } catch (err) {
    reportSceneRuntime('initializeSceneRuntime.initLights', err);
  }

  try {
    if (installSceneViewStoreSyncViaService(App)) return true;
  } catch (err) {
    reportSceneRuntime('initializeSceneRuntime.installStoreSync', err);
  }

  try {
    return syncSceneViewViaService(App, { force: true, updateShadows: true, reason: 'sceneRuntime:init' });
  } catch (err) {
    reportSceneRuntime('initializeSceneRuntime.sync', err);
    return false;
  }
}

export function syncSceneRuntimeFromStore(App: AppContainer, opts?: SceneViewSyncOptsLike): boolean {
  try {
    return syncSceneViewViaService(App, opts);
  } catch (err) {
    reportSceneRuntime('syncSceneRuntimeFromStore', err);
    return false;
  }
}

export function refreshSceneRuntimeLights(App: AppContainer, updateShadows?: boolean): boolean {
  try {
    return updateSceneLightsViaService(App, !!updateShadows);
  } catch (err) {
    reportSceneRuntime('refreshSceneRuntimeLights', err);
    return false;
  }
}

export function refreshSceneRuntimeMode(App: AppContainer): boolean {
  try {
    return updateSceneModeViaService(App);
  } catch (err) {
    reportSceneRuntime('refreshSceneRuntimeMode', err);
    return false;
  }
}
