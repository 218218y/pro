// Native ESM implementation of the scene view service (lights + sketch mode visibility).
//
// Legacy source: `js/services/pro_services_scene_view.js`
//
// Goals:
// - No legacy `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Canonical API is attached to `App.services.sceneView` (no root-slot shim).
//
// Note: legacy globals (window.updateLightsState, window.updateSceneMode, window.initLights)
// This module owns the scene view APIs under App.services.sceneView.

import type { AppContainer, SceneNamespaceLike, SceneViewSyncOptsLike } from '../../../types';

import { ensureServiceSlot } from '../runtime/services_root_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { applyViewMode, initLights, updateLights, updateSceneMode } from './scene_view_lighting.js';
import {
  disposeSceneViewStoreSync,
  installSceneViewStoreSync,
  scheduleSceneViewSyncFromStore,
  syncSceneViewFromStore,
} from './scene_view_store_sync.js';

export { applyViewMode, initLights, updateLights, updateSceneMode } from './scene_view_lighting.js';
export {
  disposeSceneViewStoreSync,
  installSceneViewStoreSync,
  scheduleSceneViewSyncFromStore,
  syncSceneViewFromStore,
} from './scene_view_store_sync.js';

type SceneViewInstallSurface = SceneNamespaceLike & {
  __wpInitLights?: () => void;
  __wpUpdateLights?: (updateShadows?: boolean) => void;
  __wpUpdateSceneMode?: () => void;
  __wpApplyViewMode?: (updateShadows?: boolean) => void;
  __wpSyncFromStore?: (opts?: SceneViewSyncOptsLike) => void;
  __wpScheduleSyncFromStore?: (opts?: SceneViewSyncOptsLike) => void;
  __wpInstallStoreSync?: () => boolean;
  __wpDisposeStoreSync?: () => void;
};

const sceneViewInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

export function installSceneViewService(App: AppContainer): SceneNamespaceLike {
  if (!App || typeof App !== 'object') throw new Error('installSceneViewService(App): App is required');

  const svc = ensureServiceSlot<SceneViewInstallSurface>(App, 'sceneView');
  const context = resolveInstallContext(sceneViewInstallContexts, svc, App);

  installStableSurfaceMethod(svc, 'initLights', '__wpInitLights', () => () => initLights(context.App));
  installStableSurfaceMethod(svc, 'updateLights', '__wpUpdateLights', () => {
    return (updateShadows?: boolean) => updateLights(context.App, !!updateShadows);
  });
  installStableSurfaceMethod(
    svc,
    'updateSceneMode',
    '__wpUpdateSceneMode',
    () => () => updateSceneMode(context.App)
  );
  installStableSurfaceMethod(svc, 'applyViewMode', '__wpApplyViewMode', () => {
    return (updateShadows?: boolean) => applyViewMode(context.App, !!updateShadows);
  });
  installStableSurfaceMethod(svc, 'syncFromStore', '__wpSyncFromStore', () => {
    return (opts?: SceneViewSyncOptsLike) => syncSceneViewFromStore(context.App, opts);
  });
  installStableSurfaceMethod(svc, 'scheduleSyncFromStore', '__wpScheduleSyncFromStore', () => {
    return (opts?: SceneViewSyncOptsLike) => scheduleSceneViewSyncFromStore(context.App, opts);
  });
  installStableSurfaceMethod(svc, 'installStoreSync', '__wpInstallStoreSync', () => {
    return () => installSceneViewStoreSync(context.App);
  });
  installStableSurfaceMethod(svc, 'disposeStoreSync', '__wpDisposeStoreSync', () => {
    return () => disposeSceneViewStoreSync(context.App);
  });

  return svc;
}
